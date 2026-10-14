import { describe, expect, it } from "vitest";
import { encryptSecret } from "./crypto";
import { db } from "./db";
import { handlePayme, PAYME_TIMEOUT_MS } from "./payme";
import { balanceOf, makeWorld, uid } from "@/test/factory";

const KEY = "payme-test-kalit";
const AUTH = `Basic ${Buffer.from(`Paycom:${KEY}`).toString("base64")}`;

async function setup(amount = 25_000) {
  const w = await makeWorld();
  const method = await db.paymentMethod.create({ data: { distributorId: w.dist.id, type: "PAYME", merchantId: "m", secretKeyEnc: encryptSecret(KEY) } });
  const payment = await db.onlinePayment.create({ data: { shopLinkId: w.link.id, paymentMethodId: method.id, provider: "PAYME", amount } });
  let rpcId = 0;
  const call = async (method_: string, params: Record<string, unknown>, auth = AUTH) => {
    const res = await handlePayme(method.id, auth, { id: ++rpcId, method: method_, params });
    return res as unknown as { id: number; result?: Record<string, unknown>; error?: { code: number } };
  };
  const txn = `txn-${uid()}`;
  const create = (id = txn, time = Date.now()) => call("CreateTransaction", { id, time, amount: amount * 100, account: { order_id: payment.id } });
  return { w, method, payment, call, txn, create, amount };
}

describe("Payme Merchant API", () => {
  it("noto'g'ri kalitni rad etadi", async () => {
    const s = await setup();
    const bad = `Basic ${Buffer.from("Paycom:boshqa").toString("base64")}`;
    expect((await s.call("CheckPerformTransaction", { amount: s.amount * 100, account: { order_id: s.payment.id } }, bad)).error?.code).toBe(-32504);
    expect((await s.call("CheckPerformTransaction", {}, "")).error?.code).toBe(-32504);
  });

  it("CheckPerformTransaction summa va hisobni tekshiradi", async () => {
    const s = await setup();
    expect((await s.call("CheckPerformTransaction", { amount: s.amount * 100, account: { order_id: s.payment.id } })).result).toEqual({ allow: true });
    expect((await s.call("CheckPerformTransaction", { amount: 1, account: { order_id: s.payment.id } })).error?.code).toBe(-31001);
    expect((await s.call("CheckPerformTransaction", { amount: s.amount * 100, account: { order_id: "yo'q" } })).error?.code).toBe(-31050);
  });

  it("to'liq oqim: yaratish, bajarish, tekshirish, qarz daftariga bir marta yozish", async () => {
    const s = await setup();
    const created = await s.create();
    expect(created.result).toMatchObject({ transaction: s.payment.id, state: 1 });
    // Takroriy CreateTransaction o'sha javobni qaytaradi
    expect((await s.create()).result).toMatchObject({ state: 1, create_time: created.result!.create_time });
    // Boshqa tranzaksiya kutilayotgan paytda yangisi yaratilmaydi
    expect((await s.create(`boshqa-${uid()}`)).error?.code).toBe(-31052);

    const performed = await s.call("PerformTransaction", { id: s.txn });
    expect(performed.result).toMatchObject({ state: 2 });
    const again = await s.call("PerformTransaction", { id: s.txn });
    expect(again.result).toEqual(performed.result);

    expect(await db.ledgerEntry.count({ where: { providerTxnId: `payme:${s.txn}` } })).toBe(1);
    expect(await balanceOf(s.w.link.id)).toBe(-s.amount);

    const check = await s.call("CheckTransaction", { id: s.txn });
    expect(check.result).toMatchObject({ state: 2, perform_time: performed.result!.perform_time, cancel_time: 0 });
  });

  it("bir vaqtdagi takroriy PerformTransaction tizim xatosi bermaydi va bitta yozuv qoldiradi", async () => {
    const s = await setup();
    await s.create();
    const results = await Promise.all([1, 2, 3, 4].map(() => s.call("PerformTransaction", { id: s.txn })));
    expect(results.every((r) => r.result?.state === 2)).toBe(true);
    expect(new Set(results.map((r) => r.result!.perform_time)).size).toBe(1);
    expect(await db.ledgerEntry.count({ where: { providerTxnId: `payme:${s.txn}` } })).toBe(1);
  });

  it("bajarilgan to'lov bekor qilinsa teskari yozuv bir marta tushadi", async () => {
    const s = await setup();
    await s.create();
    await s.call("PerformTransaction", { id: s.txn });
    const cancels = await Promise.all([1, 2].map(() => s.call("CancelTransaction", { id: s.txn, reason: 5 })));
    expect(cancels.every((r) => r.result?.state === -2)).toBe(true);
    expect(await db.ledgerEntry.count({ where: { shopLinkId: s.w.link.id, type: "ADJUSTMENT" } })).toBe(1);
    expect(await balanceOf(s.w.link.id)).toBe(0);
    expect((await s.call("CheckTransaction", { id: s.txn })).result).toMatchObject({ state: -2, reason: 5 });
  });

  it("kutilayotgan tranzaksiya bekor qilinsa, keyin bajarib bo'lmaydi", async () => {
    const s = await setup();
    await s.create();
    expect((await s.call("CancelTransaction", { id: s.txn, reason: 3 })).result).toMatchObject({ state: -1 });
    expect((await s.call("PerformTransaction", { id: s.txn })).error?.code).toBe(-31008);
    expect(await balanceOf(s.w.link.id)).toBe(0);
    // Bekor qilingan to'lovga yangi tranzaksiya ham ochilmaydi
    expect((await s.create(`yangi-${uid()}`)).error?.code).toBe(-31051);
  });

  it("12 soatdan eski tranzaksiya bajarilmaydi va bekor qilinadi", async () => {
    const s = await setup();
    await s.create(s.txn, Date.now() - PAYME_TIMEOUT_MS - 60_000);
    expect((await s.call("PerformTransaction", { id: s.txn })).error?.code).toBe(-31008);
    const p = await db.onlinePayment.findUniqueOrThrow({ where: { id: s.payment.id } });
    expect(p).toMatchObject({ status: "CANCELLED", providerState: -1, cancelReason: 4 });
  });

  it("bajarish va bekor qilish bir vaqtda kelsa, holat va qarz daftari mos qoladi", async () => {
    const s = await setup();
    await s.create();
    await Promise.all([s.call("PerformTransaction", { id: s.txn }), s.call("CancelTransaction", { id: s.txn, reason: 1 })]);
    const p = await db.onlinePayment.findUniqueOrThrow({ where: { id: s.payment.id } });
    const payments = await db.ledgerEntry.count({ where: { providerTxnId: `payme:${s.txn}` } });
    const reversals = await db.ledgerEntry.count({ where: { shopLinkId: s.w.link.id, type: "ADJUSTMENT" } });
    if (p.providerState === -1) expect([payments, reversals]).toEqual([0, 0]);
    else expect([p.providerState, payments, reversals]).toEqual([-2, 1, 1]);
    expect(await balanceOf(s.w.link.id)).toBe(0);
  });

  it("GetStatement oraliqdagi tranzaksiyalarni beradi; noma'lum metod -32601", async () => {
    const s = await setup();
    const from = Date.now() - 1000;
    await s.create();
    const st = await s.call("GetStatement", { from, to: Date.now() + 1000 });
    expect((st.result!.transactions as { id: string }[]).map((t) => t.id)).toEqual([s.txn]);
    expect((await s.call("Nomalum", {})).error?.code).toBe(-32601);
    expect((await s.call("CheckTransaction", { id: "yo'q" })).error?.code).toBe(-31003);
  });
});
