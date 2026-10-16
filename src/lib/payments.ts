import { Prisma, type OnlinePayment, type StaffRole } from "@prisma/client";
import { z } from "zod";
import { clickCheckoutUrl, paymeCheckoutUrl, paymeTestMode, publicUrl } from "./checkout";
import { db } from "./db";
import { L, som } from "./i18n";
import { payableLink } from "./orders";
import { notifyShop, notifyStaff } from "./push";
import { HttpError } from "./session";
import { linkScope } from "./staff-data";
import { extendSubscription, notifySubscriptionPaid, shortenSubscription, subscriberOf } from "./subscription";
import { discardReceipt, prepareUpload, storeUpload } from "./uploads";

// To'lovlar: qarz daftariga faqat yangi yozuv qo'shiladi.
// Naqd va o'tkazmani xodim yozadi (darhol tasdiqlangan), chekli to'lovni do'kon yuboradi (distribyutor tasdiqlaydi),
// Payme va Click to'lov tizimi tasdiqlagach avtomatik yoziladi.

export const MAX_PAYMENT = 1_000_000_000;
// Bitta do'kon bir distribyutorga bir vaqtda shuncha tasdiqlanmagan chek yubora oladi: distribyutor ko'rib chiqqach yana.
// Cheklar bazada saqlanadi: cheksiz yuklash baza hajmini to'ldirib, butun platformani to'xtatib qo'yishi mumkin
export const MAX_PENDING_RECEIPTS = 5;
const amountSchema = z.coerce.number().int().positive().max(MAX_PAYMENT);

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
  // Ilova har bir to'lov uchun bitta kalit yuboradi: so'rov takrorlansa (ikki marta bosish, tarmoq uzilib qayta yuborish) to'lov bir marta yoziladi
  clientKey: z.string().trim().min(8).max(64).optional(),
});

export async function recordPayment(staff: { id: string; distributorId: string; role: StaffRole }, input: z.infer<typeof recordPaymentInput>) {
  // Agent faqat o'z do'konlaridan, yetkazuvchi faqat o'zi yetkazadigan do'konlardan to'lov oladi
  const link = await db.shopLink.findFirst({ where: { id: input.linkId, ...linkScope(staff) } });
  if (!link) throw new HttpError(404, "Do'kon topilmadi");

  const clientKey = input.clientKey ? `${staff.id}:${input.clientKey}` : null;
  // Shu kalit bilan to'lov allaqachon yozilgan bo'lsa, o'shani qaytaramiz
  const already = async () => {
    const prev = clientKey ? await db.ledgerEntry.findUnique({ where: { clientKey } }) : null;
    if (prev && (prev.shopLinkId !== link.id || prev.amount !== -input.amount)) throw new HttpError(409, "Bu so'rov boshqa to'lov uchun ishlatilgan");
    return prev;
  };
  const prev = await already();
  if (prev) return prev;

  let entry;
  try {
    entry = await db.$transaction(async (tx) => {
      const e = await tx.ledgerEntry.create({
        data: {
          shopLinkId: link.id,
          type: "PAYMENT",
          amount: -input.amount,
          channel: input.channel,
          createdBy: `staff:${staff.id}`,
          note: input.note || null,
          clientKey,
        },
      });
      await tx.auditLog.create({ data: { actor: `staff:${staff.id}`, action: "payment.recorded", entity: "LedgerEntry", entityId: e.id, after: { amount: input.amount, channel: input.channel } } });
      return e;
    });
  } catch (e) {
    // Bir vaqtda kelgan ikki bir xil so'rov: ikkinchisi birinchisi yozgan yozuvni oladi
    if (clientKey && e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const first = await already();
      if (first) return first;
    }
    throw e;
  }
  notifyShop(link.shopId, { title: "To'lov qabul qilindi", body: som(input.amount), data: { url: "/debts" } });
  return entry;
}

// Do'kon karta yoki hisob raqamiga o'tkazib, chek rasmini yuboradi
export async function submitReceipt(shopUser: { id: string; shopId: string }, form: FormData) {
  const distributorId = String(form.get("distributorId") ?? "");
  const amount = amountSchema.safeParse(form.get("amount"));
  if (!amount.success) throw new HttpError(400, "Summani to'g'ri kiriting");
  const file = form.get("receipt");
  if (!(file instanceof File)) throw new HttpError(400, "Chek rasmini yuklang");
  const link = await payableLink(shopUser.shopId, distributorId);
  const methodId = String(form.get("paymentMethodId") ?? "") || null;
  if (methodId && !(await db.paymentMethod.findFirst({ where: { id: methodId, distributorId } }))) throw new HttpError(400, "To'lov usuli topilmadi");

  // Bitta chekni ikki marta (yoki ikki distribyutorga) yuborib bo'lmaydi. Takroriy chek faylini saqlashdan oldin rad etamiz
  const upload = await prepareUpload(file);
  const dupMsg = "Bu chek avval yuborilgan";
  const busyMsg = "Tasdiq kutayotgan cheklaringiz ko'p. Distribyutor ularni ko'rib chiqqach yana yuboring";
  const isDup = (client: Prisma.TransactionClient) =>
    client.ledgerEntry.findFirst({ where: { receiptHash: upload.hash, status: { not: "REJECTED" } }, select: { id: true } });
  const tooMany = async (client: Prisma.TransactionClient) =>
    (await client.ledgerEntry.count({ where: { shopLinkId: link.id, channel: "CARD_RECEIPT", status: "PENDING" } })) >= MAX_PENDING_RECEIPTS;
  // Fayl saqlanishidan oldin: takroriy chek va chegaradan oshgan so'rov omborga tushmaydi
  if (await isDup(db)) throw new HttpError(400, dupMsg);
  if (await tooMany(db)) throw new HttpError(429, busyMsg);

  const saved = await storeUpload("receipts", upload);
  const entry = await db
    .$transaction(async (tx) => {
      // Bir vaqtda yuborilgan ikki bir xil chekdan faqat bittasi yoziladi; bir ulanishning cheklari navbat bilan sanaladi
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${upload.hash}))`;
      await tx.$queryRaw`SELECT id FROM "ShopLink" WHERE id = ${link.id} FOR UPDATE`;
      if (await isDup(tx)) throw new HttpError(400, dupMsg);
      if (await tooMany(tx)) throw new HttpError(429, busyMsg);
      return tx.ledgerEntry.create({
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
    })
    .catch(async (e) => {
      // Yozuv yaratilmadi: saqlangan fayl hech kimga biriktirilmay qolmasin
      await discardReceipt(saved.url);
      throw e;
    });
  notifyStaff(link.distributorId, ["ADMIN", "ACCOUNTANT"], {
    title: "Chek bilan to'lov",
    body: L("{sum}, tasdiqlash kerak", { sum: som(amount.data) }),
    data: { url: "/staff/payments" },
  });
  return entry;
}

export async function reviewPayment(staff: { id: string; distributorId: string }, entryId: string, action: "confirm" | "reject", reason?: string) {
  const entry = await db.ledgerEntry.findUnique({ where: { id: entryId }, include: { shopLink: true } });
  if (!entry || entry.shopLink.distributorId !== staff.distributorId) throw new HttpError(404, "To'lov topilmadi");
  if (entry.status !== "PENDING") throw new HttpError(400, "To'lov allaqachon ko'rib chiqilgan");
  const status = action === "confirm" ? "CONFIRMED" : "REJECTED";
  const note = action === "reject" && reason ? `${entry.note ? `${entry.note}. ` : ""}Rad etildi: ${reason}` : entry.note;
  const updated = await db.$transaction(async (tx) => {
    // Faqat tasdiqlanmagan yozuv holati o'zgaradi; qoldiqqa CONFIRMED bo'lgandan keyingina kiradi.
    // Shart bilan yangilanadi: ikki xodim bir vaqtda biri tasdiqlab, biri rad etsa, faqat birinchisining qarori qoladi
    const res = await tx.ledgerEntry.updateMany({ where: { id: entry.id, status: "PENDING" }, data: { status, note } });
    if (res.count === 0) throw new HttpError(409, "To'lov allaqachon ko'rib chiqilgan");
    await tx.auditLog.create({ data: { actor: `staff:${staff.id}`, action: `payment.${action}`, entity: "LedgerEntry", entityId: entry.id, before: { status: "PENDING" }, after: { status } } });
    return tx.ledgerEntry.findUniqueOrThrow({ where: { id: entry.id } });
  });
  notifyShop(entry.shopLink.shopId, {
    title: action === "confirm" ? "To'lov tasdiqlandi" : "To'lov rad etildi",
    body: action === "reject" && reason ? L("{sum}: {reason}", { sum: som(-entry.amount), reason }) : som(-entry.amount),
    data: { url: "/debts" },
  });
  return updated;
}

// ---- Payme va Click ----

export const onlinePaymentInput = z.object({
  distributorId: z.string().min(1),
  amount: amountSchema,
  provider: z.enum(["PAYME", "CLICK"]),
});

export async function createOnlinePayment(shopUser: { shopId: string }, input: z.infer<typeof onlinePaymentInput>) {
  const link = await payableLink(shopUser.shopId, input.distributorId);
  const method = await db.paymentMethod.findFirst({
    where: { distributorId: input.distributorId, type: input.provider, active: true, merchantId: { not: null }, secretKeyEnc: { not: null } },
    orderBy: { isPrimary: "desc" },
  });
  if (!method?.merchantId || (input.provider === "CLICK" && !method.serviceId)) {
    throw new HttpError(400, L("Bu distribyutor {provider} orqali to'lov qabul qilmaydi", { provider: input.provider === "PAYME" ? "Payme" : "Click" }));
  }
  const payment = await db.onlinePayment.create({
    data: { shopLinkId: link.id, paymentMethodId: method.id, provider: input.provider, amount: input.amount },
  });
  const returnUrl = `${publicUrl()}/pay/done`;
  const url =
    input.provider === "PAYME"
      ? paymeCheckoutUrl(method.merchantId, payment.id, input.amount, returnUrl, paymeTestMode())
      : clickCheckoutUrl(method.serviceId!, method.merchantId, payment.id, input.amount, returnUrl);
  return { id: payment.id, url };
}

// To'lov tizimi tasdiqlagan to'lovni qo'llash (tranzaksiya ichida chaqiriladi):
// qarz to'lovi qarz daftariga yoziladi, obuna to'lovi tashkilot obunasini uzaytiradi
export async function applyOnlinePayment(tx: Prisma.TransactionClient, payment: OnlinePayment, providerTxnId: string, now: Date) {
  if (payment.purpose === "SUBSCRIPTION") {
    await extendSubscription(tx, subscriberOf(payment), payment.months!, now);
    return;
  }
  const channel = payment.provider === "PAYME" ? "PAYME" : "CLICK";
  const entry = await tx.ledgerEntry.create({
    data: {
      shopLinkId: payment.shopLinkId!,
      type: "PAYMENT",
      amount: -payment.amount,
      date: now,
      status: "CONFIRMED",
      channel,
      paymentMethodId: payment.paymentMethodId,
      providerTxnId: `${channel.toLowerCase()}:${providerTxnId}`,
      createdBy: "system",
      note: channel === "PAYME" ? "Payme orqali" : "Click orqali",
    },
  });
  await tx.onlinePayment.update({ where: { id: payment.id }, data: { ledgerEntryId: entry.id } });
}

// To'lov tizimi bajarilgan to'lovni bekor qilsa: qarz daftariga teskari yozuv yoki obuna oylari qaytariladi
export async function reverseOnlinePayment(tx: Prisma.TransactionClient, payment: OnlinePayment, now: Date) {
  if (payment.purpose === "SUBSCRIPTION") {
    await shortenSubscription(tx, subscriberOf(payment), payment.months!);
    return;
  }
  if (!payment.ledgerEntryId) return;
  await tx.ledgerEntry.create({
    data: {
      shopLinkId: payment.shopLinkId!,
      type: "ADJUSTMENT",
      amount: payment.amount,
      date: now,
      reversesId: payment.ledgerEntryId,
      createdBy: "system",
      note: "To'lov tizimi to'lovni bekor qildi",
    },
  });
}

export async function notifyOnlinePaid(payment: OnlinePayment) {
  if (payment.purpose === "SUBSCRIPTION") return notifySubscriptionPaid(subscriberOf(payment));
  const link = await db.shopLink.findUnique({ where: { id: payment.shopLinkId! }, include: { shop: true } });
  if (!link) return;
  notifyShop(link.shopId, { title: "To'lov qabul qilindi", body: som(payment.amount), data: { url: "/debts" } });
  notifyStaff(link.distributorId, ["ADMIN", "ACCOUNTANT"], { title: "Onlayn to'lov", body: L("{name}: {sum}", { name: link.shop.name, sum: som(payment.amount) }), data: { url: "/staff" } });
}
