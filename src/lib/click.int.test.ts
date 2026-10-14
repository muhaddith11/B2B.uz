import { describe, expect, it } from "vitest";
import { clickSign, handleClick, type ClickParams } from "./click";
import { encryptSecret } from "./crypto";
import { db } from "./db";
import { balanceOf, makeWorld, uid } from "@/test/factory";

const SECRET = "click-test-kalit";

async function setup(amount = 40_000) {
  const w = await makeWorld();
  const method = await db.paymentMethod.create({ data: { distributorId: w.dist.id, type: "CLICK", merchantId: "11", serviceId: "22", secretKeyEnc: encryptSecret(SECRET) } });
  const payment = await db.onlinePayment.create({ data: { shopLinkId: w.link.id, paymentMethodId: method.id, provider: "CLICK", amount } });
  const clickTransId = String(Date.now()) + uid().slice(-3).replace(/\D/g, "1");
  const base = { click_trans_id: clickTransId, service_id: "22", merchant_trans_id: payment.id, amount: String(amount), sign_time: "2026-10-14 10:00:00" };
  const send = (stage: "prepare" | "complete", extra: Partial<ClickParams> = {}, secret = SECRET) => {
    const p: ClickParams = { ...base, action: stage === "prepare" ? "0" : "1", error: "0", ...(stage === "complete" ? { merchant_prepare_id: String(payment.number) } : {}), ...extra };
    return handleClick(method.id, stage, { ...p, sign_string: clickSign(p, secret, stage) });
  };
  return { w, payment, send, amount };
}

describe("Click SHOP API", () => {
  it("imzo noto'g'ri bo'lsa rad etadi", async () => {
    const s = await setup();
    expect((await s.send("prepare", {}, "boshqa")).error).toBe(-1);
  });

  it("prepare va complete: to'lov qarz daftariga bir marta yoziladi", async () => {
    const s = await setup();
    const prepared = await s.send("prepare");
    expect(prepared).toMatchObject({ error: 0, merchant_prepare_id: s.payment.number });
    const done = await s.send("complete");
    expect(done).toMatchObject({ error: 0, merchant_confirm_id: s.payment.number });
    expect(await balanceOf(s.w.link.id)).toBe(-s.amount);
    // Takroriy complete: "allaqachon to'langan", yangi yozuv yo'q
    expect((await s.send("complete")).error).toBe(-4);
    expect(await balanceOf(s.w.link.id)).toBe(-s.amount);
  });

  it("bir vaqtdagi takroriy complete bitta yozuv qoldiradi", async () => {
    const s = await setup();
    await s.send("prepare");
    const results = await Promise.all([1, 2, 3].map(() => s.send("complete")));
    expect(results.filter((r) => r.error === 0)).toHaveLength(1);
    expect(results.filter((r) => r.error === -4)).toHaveLength(2);
    expect(await balanceOf(s.w.link.id)).toBe(-s.amount);
  });

  it("summa mos kelmasa yoki Click xato bildirsa to'lanmaydi", async () => {
    const s = await setup();
    expect((await s.send("prepare", { amount: "1" })).error).toBe(-2);
    await s.send("prepare");
    expect((await s.send("complete", { error: "-5017" })).error).toBe(-9);
    expect((await db.onlinePayment.findUniqueOrThrow({ where: { id: s.payment.id } })).status).toBe("CANCELLED");
    expect((await s.send("complete")).error).toBe(-9);
    expect(await balanceOf(s.w.link.id)).toBe(0);
  });
});
