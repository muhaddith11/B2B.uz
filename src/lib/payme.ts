import { timingSafeEqual } from "node:crypto";
import type { OnlinePayment, PaymentMethod } from "@prisma/client";
import { decryptSecret, encryptSecret } from "./crypto";
import { db } from "./db";
import { applyOnlinePayment, notifyOnlinePaid, reverseOnlinePayment } from "./payments";

// Payme Merchant API (JSON-RPC): https://developer.help.paycom.uz
// Har bir distribyutorning Payme kassasi uchun alohida manzil: /api/payments/payme/<PaymentMethod.id>
// Hisob maydoni (account): order_id = OnlinePayment.id. Summalar tiyinda.

export const PAYME_TIMEOUT_MS = 12 * 60 * 60 * 1000;

const MESSAGES: Record<number, { uz: string; ru: string; en: string }> = {
  [-32504]: { uz: "Ruxsat yo'q", ru: "Недостаточно привилегий", en: "Insufficient privileges" },
  [-32600]: { uz: "So'rov noto'g'ri", ru: "Неверный запрос", en: "Invalid request" },
  [-32601]: { uz: "Metod topilmadi", ru: "Метод не найден", en: "Method not found" },
  [-32400]: { uz: "Tizim xatosi", ru: "Системная ошибка", en: "System error" },
  [-31001]: { uz: "Summa noto'g'ri", ru: "Неверная сумма", en: "Incorrect amount" },
  [-31003]: { uz: "Tranzaksiya topilmadi", ru: "Транзакция не найдена", en: "Transaction not found" },
  [-31007]: { uz: "Bekor qilib bo'lmaydi", ru: "Невозможно отменить", en: "Cannot cancel" },
  [-31008]: { uz: "Amalni bajarib bo'lmaydi", ru: "Невозможно выполнить операцию", en: "Cannot perform operation" },
  [-31050]: { uz: "To'lov topilmadi", ru: "Платёж не найден", en: "Payment not found" },
  [-31051]: { uz: "To'lov allaqachon to'langan yoki bekor qilingan", ru: "Платёж уже оплачен или отменён", en: "Payment already paid or cancelled" },
  [-31052]: { uz: "Bu to'lov bo'yicha boshqa tranzaksiya kutilmoqda", ru: "По платежу ожидается другая транзакция", en: "Another transaction is pending" },
};

class PaymeError extends Error {
  constructor(
    public code: number,
    public data?: string,
  ) {
    super(String(code));
  }
}

// "Basic base64(Paycom:KALIT)"
export function checkPaymeAuth(header: string | null, key: string): boolean {
  const m = /^Basic\s+(.+)$/i.exec(header ?? "");
  if (!m) return false;
  const decoded = Buffer.from(m[1], "base64").toString("utf8");
  const sep = decoded.indexOf(":");
  if (sep < 0) return false;
  const a = Buffer.from(decoded.slice(sep + 1));
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function paymeTimedOut(createTime: bigint | number, now: number): boolean {
  return now - Number(createTime) > PAYME_TIMEOUT_MS;
}

type Params = Record<string, unknown>;
type Method = PaymentMethod;

async function findByAccount(method: Method, params: Params) {
  const account = (params.account ?? {}) as Record<string, unknown>;
  const orderId = typeof account.order_id === "string" ? account.order_id : "";
  const payment = orderId ? await db.onlinePayment.findFirst({ where: { id: orderId, paymentMethodId: method.id } }) : null;
  if (!payment) throw new PaymeError(-31050, "order_id");
  return payment;
}

function checkPayable(payment: OnlinePayment, amount: unknown) {
  if (payment.status !== "CREATED") throw new PaymeError(-31051, "order_id");
  if (typeof amount !== "number" || amount !== payment.amount * 100) throw new PaymeError(-31001);
}

async function findByTxn(method: Method, params: Params) {
  const id = typeof params.id === "string" ? params.id : "";
  const payment = id ? await db.onlinePayment.findFirst({ where: { provider: "PAYME", providerTxnId: id, paymentMethodId: method.id } }) : null;
  if (!payment) throw new PaymeError(-31003);
  return payment;
}

const ms = (d: Date | null) => (d ? d.getTime() : 0);

async function cancelPending(payment: OnlinePayment, reason: number) {
  return db.onlinePayment.update({
    where: { id: payment.id },
    data: { providerState: -1, status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
  });
}

async function dispatch(method: Method, name: string, params: Params) {
  switch (name) {
    case "CheckPerformTransaction": {
      checkPayable(await findByAccount(method, params), params.amount);
      return { allow: true };
    }

    case "CreateTransaction": {
      const txnId = typeof params.id === "string" ? params.id : "";
      const time = typeof params.time === "number" ? params.time : Date.now();
      if (!txnId) throw new PaymeError(-32600);
      const existing = await db.onlinePayment.findFirst({ where: { provider: "PAYME", providerTxnId: txnId, paymentMethodId: method.id } });
      if (existing) {
        if (existing.providerState !== 1) throw new PaymeError(-31008);
        if (paymeTimedOut(existing.providerCreateTime ?? 0, Date.now())) {
          await cancelPending(existing, 4);
          throw new PaymeError(-31008);
        }
        return { create_time: Number(existing.providerCreateTime), transaction: existing.id, state: 1 };
      }
      const payment = await findByAccount(method, params);
      checkPayable(payment, params.amount);
      if (payment.providerTxnId && payment.providerState === 1) throw new PaymeError(-31052, "order_id");
      await db.onlinePayment.update({ where: { id: payment.id }, data: { providerTxnId: txnId, providerState: 1, providerCreateTime: BigInt(time) } });
      return { create_time: time, transaction: payment.id, state: 1 };
    }

    case "PerformTransaction": {
      const payment = await findByTxn(method, params);
      if (payment.providerState === 2) return { transaction: payment.id, perform_time: ms(payment.performedAt), state: 2 };
      if (payment.providerState !== 1) throw new PaymeError(-31008);
      if (paymeTimedOut(payment.providerCreateTime ?? 0, Date.now())) {
        await cancelPending(payment, 4);
        throw new PaymeError(-31008);
      }
      const now = new Date();
      await db.$transaction(async (tx) => {
        const full = await tx.onlinePayment.findUniqueOrThrow({ where: { id: payment.id }, include: { paymentMethod: true } });
        const entry = await applyOnlinePayment(tx, full, payment.providerTxnId!, now);
        await tx.onlinePayment.update({ where: { id: payment.id }, data: { providerState: 2, status: "PAID", performedAt: now, ledgerEntryId: entry.id } });
      });
      await notifyOnlinePaid(payment.shopLinkId, payment.amount);
      return { transaction: payment.id, perform_time: now.getTime(), state: 2 };
    }

    case "CancelTransaction": {
      const payment = await findByTxn(method, params);
      const reason = typeof params.reason === "number" ? params.reason : null;
      if (payment.providerState === -1 || payment.providerState === -2) {
        return { transaction: payment.id, cancel_time: ms(payment.cancelledAt), state: payment.providerState };
      }
      const now = new Date();
      if (payment.providerState === 1) {
        await db.onlinePayment.update({ where: { id: payment.id }, data: { providerState: -1, status: "CANCELLED", cancelledAt: now, cancelReason: reason } });
        return { transaction: payment.id, cancel_time: now.getTime(), state: -1 };
      }
      // Bajarilgan to'lov bekor qilinsa, qarz daftariga teskari yozuv tushadi
      await db.$transaction(async (tx) => {
        await reverseOnlinePayment(tx, payment, now);
        await tx.onlinePayment.update({ where: { id: payment.id }, data: { providerState: -2, status: "CANCELLED", cancelledAt: now, cancelReason: reason } });
      });
      return { transaction: payment.id, cancel_time: now.getTime(), state: -2 };
    }

    case "CheckTransaction": {
      const p = await findByTxn(method, params);
      return {
        create_time: Number(p.providerCreateTime ?? 0),
        perform_time: ms(p.performedAt),
        cancel_time: ms(p.cancelledAt),
        transaction: p.id,
        state: p.providerState,
        reason: p.cancelReason,
      };
    }

    case "GetStatement": {
      const from = typeof params.from === "number" ? params.from : 0;
      const to = typeof params.to === "number" ? params.to : Date.now();
      const rows = await db.onlinePayment.findMany({
        where: { paymentMethodId: method.id, provider: "PAYME", providerCreateTime: { gte: BigInt(from), lte: BigInt(to) } },
        orderBy: { providerCreateTime: "asc" },
      });
      return {
        transactions: rows.map((p) => ({
          id: p.providerTxnId,
          time: Number(p.providerCreateTime),
          amount: p.amount * 100,
          account: { order_id: p.id },
          create_time: Number(p.providerCreateTime),
          perform_time: ms(p.performedAt),
          cancel_time: ms(p.cancelledAt),
          transaction: p.id,
          state: p.providerState,
          reason: p.cancelReason,
        })),
      };
    }

    case "ChangePassword": {
      const password = typeof params.password === "string" ? params.password : "";
      if (!password) throw new PaymeError(-32600);
      await db.paymentMethod.update({ where: { id: method.id }, data: { secretKeyEnc: encryptSecret(password) } });
      return { success: true };
    }

    default:
      throw new PaymeError(-32601, name);
  }
}

export async function handlePayme(methodId: string, auth: string | null, body: unknown) {
  const req = (body && typeof body === "object" ? body : {}) as { id?: unknown; method?: unknown; params?: unknown };
  const id = req.id ?? null;
  try {
    const method = await db.paymentMethod.findFirst({ where: { id: methodId, type: "PAYME", active: true } });
    if (!method?.secretKeyEnc || !checkPaymeAuth(auth, decryptSecret(method.secretKeyEnc))) throw new PaymeError(-32504);
    if (typeof req.method !== "string" || !req.params || typeof req.params !== "object") throw new PaymeError(-32600);
    return { id, result: await dispatch(method, req.method, req.params as Params) };
  } catch (e) {
    if (e instanceof PaymeError) return { id, error: { code: e.code, message: MESSAGES[e.code] ?? MESSAGES[-32400], data: e.data } };
    console.error("payme:", e);
    return { id, error: { code: -32400, message: MESSAGES[-32400] } };
  }
}
