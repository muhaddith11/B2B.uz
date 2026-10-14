import { createHash } from "node:crypto";
import { decryptSecret } from "./crypto";
import { db } from "./db";
import { applyOnlinePayment, notifyOnlinePaid } from "./payments";

// Click SHOP API: prepare va complete. https://docs.click.uz
// Har bir distribyutorning Click xizmati uchun alohida manzil: /api/payments/click/<PaymentMethod.id>/prepare|complete
// merchant_trans_id = OnlinePayment.id, merchant_prepare_id = OnlinePayment.number.

export type ClickParams = Record<string, string>;

export function clickSign(p: ClickParams, secret: string, stage: "prepare" | "complete"): string {
  const parts =
    stage === "prepare"
      ? [p.click_trans_id, p.service_id, secret, p.merchant_trans_id, p.amount, p.action, p.sign_time]
      : [p.click_trans_id, p.service_id, secret, p.merchant_trans_id, p.merchant_prepare_id, p.amount, p.action, p.sign_time];
  return createHash("md5").update(parts.map((x) => x ?? "").join("")).digest("hex");
}

const NOTES: Record<number, string> = {
  0: "Success",
  [-1]: "SIGN CHECK FAILED!",
  [-2]: "Incorrect parameter amount",
  [-3]: "Action not found",
  [-4]: "Already paid",
  [-5]: "User does not exist",
  [-6]: "Transaction does not exist",
  [-8]: "Error in request from click",
  [-9]: "Transaction cancelled",
};

export async function handleClick(methodId: string, stage: "prepare" | "complete", p: ClickParams) {
  const base = { click_trans_id: p.click_trans_id ?? null, merchant_trans_id: p.merchant_trans_id ?? null };
  const fail = (code: number) => ({ ...base, error: code, error_note: NOTES[code] });

  const method = await db.paymentMethod.findFirst({ where: { id: methodId, type: "CLICK", active: true } });
  if (!method?.secretKeyEnc || !method.serviceId) return fail(-8);
  if (!p.sign_string || p.sign_string !== clickSign(p, decryptSecret(method.secretKeyEnc), stage)) return fail(-1);
  if (p.service_id !== method.serviceId) return fail(-8);
  if (p.action !== (stage === "prepare" ? "0" : "1")) return fail(-3);

  const payment = p.merchant_trans_id
    ? await db.onlinePayment.findFirst({ where: { id: p.merchant_trans_id, paymentMethodId: method.id }, include: { paymentMethod: true } })
    : null;
  if (!payment) return fail(-5);
  if (stage === "complete" && String(payment.number) !== p.merchant_prepare_id) return fail(-6);
  if (payment.status === "PAID") return fail(-4);
  if (payment.status === "CANCELLED") return fail(-9);
  if (Number(p.amount) !== payment.amount) return fail(-2);

  if (stage === "prepare") {
    await db.onlinePayment.update({ where: { id: payment.id }, data: { providerTxnId: p.click_trans_id } });
    return { ...base, merchant_prepare_id: payment.number, error: 0, error_note: NOTES[0] };
  }

  // Click to'lov amalga oshmaganini bildirsa (error < 0), to'lov bekor qilinadi
  if (Number(p.error) < 0) {
    await db.onlinePayment.updateMany({ where: { id: payment.id, status: "CREATED" }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: Number(p.error) } });
    return fail(-9);
  }

  const now = new Date();
  const paid = await db.$transaction(async (tx) => {
    // Shart bilan: Click takroriy so'rovi bir vaqtda kelsa, to'lov qarz daftariga bir marta yoziladi
    const claimed = await tx.onlinePayment.updateMany({
      where: { id: payment.id, status: "CREATED" },
      data: { status: "PAID", performedAt: now, providerTxnId: p.click_trans_id },
    });
    if (claimed.count === 0) return false;
    const entry = await applyOnlinePayment(tx, payment, p.click_trans_id, now);
    await tx.onlinePayment.update({ where: { id: payment.id }, data: { ledgerEntryId: entry.id } });
    return true;
  });
  if (!paid) {
    const fresh = await db.onlinePayment.findUniqueOrThrow({ where: { id: payment.id } });
    return fail(fresh.status === "PAID" ? -4 : -9);
  }
  await notifyOnlinePaid(payment.shopLinkId, payment.amount);
  return { ...base, merchant_confirm_id: payment.number, error: 0, error_note: NOTES[0] };
}
