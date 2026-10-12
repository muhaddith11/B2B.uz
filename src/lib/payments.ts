import type { OnlinePayment, PaymentMethod, PaymentMethodType, Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { formatSom } from "./money";
import { activeLink } from "./orders";
import { notifyShop, notifyStaff } from "./push";
import { HttpError } from "./session";
import { saveUpload } from "./uploads";

// To'lovlar: qarz daftariga faqat yangi yozuv qo'shiladi.
// Naqd va o'tkazmani xodim yozadi (darhol tasdiqlangan), chekli to'lovni do'kon yuboradi (distribyutor tasdiqlaydi),
// Payme va Click to'lov tizimi tasdiqlagach avtomatik yoziladi.

export const MAX_PAYMENT = 1_000_000_000;
const amountSchema = z.coerce.number().int().positive().max(MAX_PAYMENT);

export function publicUrl(): string {
  return (process.env.PUBLIC_URL || "http://localhost:3000").replace(/\/$/, "");
}

// Do'konga ko'rsatiladigan to'lov usullari: kalitlarsiz
export async function paymentOptions(distributorId: string) {
  const methods = await db.paymentMethod.findMany({ where: { distributorId, active: true }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] });
  return {
    transfer: methods
      .filter((m) => (m.type === "CARD" || m.type === "BANK_ACCOUNT") && m.number)
      .map((m) => ({ id: m.id, type: m.type, number: m.number, holder: m.holder, bankMfo: m.bankMfo, inn: m.inn })),
    online: [...new Set(methods.filter((m) => (m.type === "PAYME" || m.type === "CLICK") && m.merchantId && m.secretKeyEnc).map((m) => m.type))],
  };
}

export const recordPaymentInput = z.object({
  linkId: z.string().min(1),
  amount: amountSchema,
  channel: z.enum(["CASH", "BANK_TRANSFER"]),
  note: z.string().trim().max(200).optional(),
});

export async function recordPayment(staff: { id: string; distributorId: string }, input: z.infer<typeof recordPaymentInput>) {
  const link = await db.shopLink.findUnique({ where: { id: input.linkId } });
  if (!link || link.distributorId !== staff.distributorId) throw new HttpError(404, "Do'kon topilmadi");
  const entry = await db.ledgerEntry.create({
    data: {
      shopLinkId: link.id,
      type: "PAYMENT",
      amount: -input.amount,
      channel: input.channel,
      createdBy: `staff:${staff.id}`,
      note: input.note || null,
    },
  });
  await db.auditLog.create({ data: { actor: `staff:${staff.id}`, action: "payment.recorded", entity: "LedgerEntry", entityId: entry.id, after: { amount: input.amount, channel: input.channel } } });
  notifyShop(link.shopId, { title: "To'lov qabul qilindi", body: formatSom(input.amount), data: { url: "/debts" } });
  return entry;
}

// Do'kon karta yoki hisob raqamiga o'tkazib, chek rasmini yuboradi
export async function submitReceipt(shopUser: { id: string; shopId: string }, form: FormData) {
  const distributorId = String(form.get("distributorId") ?? "");
  const amount = amountSchema.safeParse(form.get("amount"));
  if (!amount.success) throw new HttpError(400, "Summani to'g'ri kiriting");
  const file = form.get("receipt");
  if (!(file instanceof File)) throw new HttpError(400, "Chek rasmini yuklang");
  const link = await activeLink(shopUser.shopId, distributorId);
  const methodId = String(form.get("paymentMethodId") ?? "") || null;
  if (methodId && !(await db.paymentMethod.findFirst({ where: { id: methodId, distributorId } }))) throw new HttpError(400, "To'lov usuli topilmadi");

  const saved = await saveUpload("receipts", file);
  // Bitta chekni ikki marta (yoki ikki distribyutorga) yuborib bo'lmaydi
  const dup = await db.ledgerEntry.findFirst({ where: { receiptHash: saved.hash, status: { not: "REJECTED" } } });
  if (dup) throw new HttpError(400, "Bu chek avval yuborilgan");

  const entry = await db.ledgerEntry.create({
    data: {
      shopLinkId: link.id,
      type: "PAYMENT",
      amount: -amount.data,
      status: "PENDING",
      channel: "CARD_RECEIPT",
      paymentMethodId: methodId,
      receiptUrl: saved.url,
      receiptHash: saved.hash,
      createdBy: `shop:${shopUser.id}`,
      note: String(form.get("note") ?? "").trim().slice(0, 200) || null,
    },
  });
  notifyStaff(link.distributorId, ["ADMIN", "ACCOUNTANT"], {
    title: "Chek bilan to'lov",
    body: `${formatSom(amount.data)}, tasdiqlash kerak`,
    data: { url: "/staff/payments" },
  });
  return entry;
}

export async function reviewPayment(staff: { id: string; distributorId: string }, entryId: string, action: "confirm" | "reject", reason?: string) {
  const entry = await db.ledgerEntry.findUnique({ where: { id: entryId }, include: { shopLink: true } });
  if (!entry || entry.shopLink.distributorId !== staff.distributorId) throw new HttpError(404, "To'lov topilmadi");
  if (entry.status !== "PENDING") throw new HttpError(400, "To'lov allaqachon ko'rib chiqilgan");
  const status = action === "confirm" ? "CONFIRMED" : "REJECTED";
  // Faqat tasdiqlanmagan yozuv holati o'zgaradi; qoldiqqa CONFIRMED bo'lgandan keyingina kiradi
  const updated = await db.ledgerEntry.update({
    where: { id: entry.id },
    data: { status, note: action === "reject" && reason ? `${entry.note ? `${entry.note}. ` : ""}Rad etildi: ${reason}` : entry.note },
  });
  await db.auditLog.create({ data: { actor: `staff:${staff.id}`, action: `payment.${action}`, entity: "LedgerEntry", entityId: entry.id, before: { status: "PENDING" }, after: { status } } });
  notifyShop(entry.shopLink.shopId, {
    title: action === "confirm" ? "To'lov tasdiqlandi" : "To'lov rad etildi",
    body: `${formatSom(-entry.amount)}${action === "reject" && reason ? `: ${reason}` : ""}`,
    data: { url: "/debts" },
  });
  return updated;
}

// ---- Payme va Click ----

export function paymeCheckoutUrl(merchantId: string, paymentId: string, amount: number, returnUrl: string, test = false): string {
  const params = `m=${merchantId};ac.order_id=${paymentId};a=${amount * 100};c=${returnUrl}`;
  return `https://checkout.${test ? "test." : ""}paycom.uz/${Buffer.from(params).toString("base64")}`;
}

export function clickCheckoutUrl(serviceId: string, merchantId: string, paymentId: string, amount: number, returnUrl: string): string {
  const q = new URLSearchParams({ service_id: serviceId, merchant_id: merchantId, amount: String(amount), transaction_param: paymentId, return_url: returnUrl });
  return `https://my.click.uz/services/pay?${q}`;
}

export const onlinePaymentInput = z.object({
  distributorId: z.string().min(1),
  amount: amountSchema,
  provider: z.enum(["PAYME", "CLICK"]),
});

export async function createOnlinePayment(shopUser: { shopId: string }, input: z.infer<typeof onlinePaymentInput>) {
  const link = await activeLink(shopUser.shopId, input.distributorId);
  const method = await db.paymentMethod.findFirst({
    where: { distributorId: input.distributorId, type: input.provider, active: true, merchantId: { not: null }, secretKeyEnc: { not: null } },
    orderBy: { isPrimary: "desc" },
  });
  if (!method?.merchantId || (input.provider === "CLICK" && !method.serviceId)) {
    throw new HttpError(400, `Bu distribyutor ${input.provider === "PAYME" ? "Payme" : "Click"} orqali to'lov qabul qilmaydi`);
  }
  const payment = await db.onlinePayment.create({
    data: { shopLinkId: link.id, paymentMethodId: method.id, provider: input.provider, amount: input.amount },
  });
  const returnUrl = `${publicUrl()}/pay/done`;
  const url =
    input.provider === "PAYME"
      ? paymeCheckoutUrl(method.merchantId, payment.id, input.amount, returnUrl, process.env.PAYME_TEST === "1")
      : clickCheckoutUrl(method.serviceId!, method.merchantId, payment.id, input.amount, returnUrl);
  return { id: payment.id, url };
}

// To'lov tizimi tasdiqlagan to'lovni qarz daftariga yozish (tranzaksiya ichida chaqiriladi)
export async function applyOnlinePayment(
  tx: Prisma.TransactionClient,
  payment: OnlinePayment & { paymentMethod: PaymentMethod },
  providerTxnId: string,
  now: Date,
) {
  const channel: PaymentMethodType = payment.provider;
  const entry = await tx.ledgerEntry.create({
    data: {
      shopLinkId: payment.shopLinkId,
      type: "PAYMENT",
      amount: -payment.amount,
      date: now,
      status: "CONFIRMED",
      channel: channel === "PAYME" ? "PAYME" : "CLICK",
      paymentMethodId: payment.paymentMethodId,
      providerTxnId: `${channel.toLowerCase()}:${providerTxnId}`,
      createdBy: "system",
      note: channel === "PAYME" ? "Payme orqali" : "Click orqali",
    },
  });
  return entry;
}

// To'lov tizimi bajarilgan to'lovni bekor qilsa: teskari yozuv
export async function reverseOnlinePayment(tx: Prisma.TransactionClient, payment: OnlinePayment, now: Date) {
  if (!payment.ledgerEntryId) return;
  await tx.ledgerEntry.create({
    data: {
      shopLinkId: payment.shopLinkId,
      type: "ADJUSTMENT",
      amount: payment.amount,
      date: now,
      reversesId: payment.ledgerEntryId,
      createdBy: "system",
      note: "To'lov tizimi to'lovni bekor qildi",
    },
  });
}

export async function notifyOnlinePaid(shopLinkId: string, amount: number) {
  const link = await db.shopLink.findUnique({ where: { id: shopLinkId }, include: { shop: true } });
  if (!link) return;
  notifyShop(link.shopId, { title: "To'lov qabul qilindi", body: formatSom(amount), data: { url: "/debts" } });
  notifyStaff(link.distributorId, ["ADMIN", "ACCOUNTANT"], { title: "Onlayn to'lov", body: `${link.shop.name}: ${formatSom(amount)}`, data: { url: "/staff" } });
}
