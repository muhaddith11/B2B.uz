import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clickSign, handlePlatformClick, type ClickParams } from "./click";
import { encryptSecret } from "./crypto";
import { db } from "./db";
import { changeOrderStatus, createOrder, createOrderForLink } from "./orders";
import { handlePayme, handlePlatformPayme } from "./payme";
import { recordPayment } from "./payments";
import {
  createSubscriptionPayment,
  DISTRIBUTOR_PAUSED,
  EXPIRED_DISTRIBUTOR,
  EXPIRED_SHOP,
  extendManually,
  monthlyPrice,
  payableOrgs,
  setMonthlyPrice,
  type Subscriber,
} from "./subscription";
import { addMonths, DAY_MS } from "./time";
import { makeOrder, makeStaff, makeWorld, req, tokens, uid } from "@/test/factory";
import * as platformPaymeRoute from "@/app/api/subscription/payme/route";
import * as registerShop from "@/app/api/auth/register/route";

const PAYME_KEY = "platforma-payme-kalit";
const CLICK_SECRET = "platforma-click-kalit";
const AUTH = `Basic ${Buffer.from(`Paycom:${PAYME_KEY}`).toString("base64")}`;
const env = { PLATFORM_PAYME_MERCHANT_ID: "platform-merchant", PLATFORM_PAYME_KEY: PAYME_KEY, PLATFORM_CLICK_SERVICE_ID: "77", PLATFORM_CLICK_MERCHANT_ID: "88", PLATFORM_CLICK_SECRET_KEY: CLICK_SECRET };

beforeAll(() => Object.assign(process.env, env));
afterAll(() => {
  for (const k of Object.keys(env)) delete process.env[k];
});

async function setPaidUntil(who: Subscriber, daysFromNow: number) {
  const paidUntil = new Date(Date.now() + daysFromNow * DAY_MS);
  if (who.kind === "shop") await db.shop.update({ where: { id: who.id }, data: { paidUntil } });
  else await db.distributor.update({ where: { id: who.id }, data: { paidUntil } });
  return paidUntil;
}
const paidUntilOf = async (who: Subscriber) =>
  (who.kind === "shop" ? await db.shop.findUniqueOrThrow({ where: { id: who.id } }) : await db.distributor.findUniqueOrThrow({ where: { id: who.id } })).paidUntil;

let rpc = 0;
const payme = (method: string, params: Record<string, unknown>, auth = AUTH) =>
  handlePlatformPayme(auth, { id: ++rpc, method, params }) as unknown as Promise<{ result?: Record<string, unknown>; error?: { code: number } }>;

describe("tekin davr", () => {
  it("ro'yxatdan o'tgan do'kon 12 oy tekin oladi", async () => {
    const res = await registerShop.POST(req("/api/auth/register", { body: { phoneToken: tokens.phone(`+99893${String(Date.now()).slice(-7)}`), shopName: `Do'kon ${uid()}`, address: "Bunyodkor 7", district: "Chilonzor", ownerName: "Ega" } }));
    const { token } = (await res.json()) as { token: string };
    const { shopUserId } = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString()) as { shopUserId: string };
    const shop = await db.shop.findFirstOrThrow({ where: { users: { some: { id: shopUserId } } } });
    expect(shop.paidUntil.getTime()).toBe(shop.trialEndsAt.getTime());
    expect(Math.abs(shop.paidUntil.getTime() - addMonths(new Date(), 12).getTime())).toBeLessThan(60_000);
  });
});

describe("obuna tugaganda", () => {
  it("do'kon: imtiyoz muddatida buyurtma beradi, undan keyin bera olmaydi", async () => {
    const w = await makeWorld();
    const order = () => createOrder({ id: w.owner.id, shopId: w.shop.id }, { distributorId: w.dist.id, paymentType: "CASH", items: [{ productId: w.product.id, qty: 1 }] });
    await setPaidUntil({ kind: "shop", id: w.shop.id }, -3);
    await expect(order()).resolves.toBeTruthy();
    await setPaidUntil({ kind: "shop", id: w.shop.id }, -8);
    await expect(order()).rejects.toMatchObject({ status: 402, message: EXPIRED_SHOP });
  });

  it("distribyutor: yangi buyurtma olmaydi va qabul qilmaydi, boshlangan yetkazish va to'lovlar ishlaydi", async () => {
    const w = await makeWorld();
    const sent = await makeOrder(w);
    const onTheWay = await makeOrder(w, { status: "IN_DELIVERY" });
    await setPaidUntil({ kind: "distributor", id: w.dist.id }, -8);
    const link = await db.shopLink.findUniqueOrThrow({ where: { id: w.link.id }, include: { distributor: true } });

    await expect(createOrder({ id: w.owner.id, shopId: w.shop.id }, { distributorId: w.dist.id, paymentType: "CASH", items: [{ productId: w.product.id, qty: 1 }] })).rejects.toMatchObject({
      status: 402,
      message: DISTRIBUTOR_PAUSED,
    });
    await expect(createOrderForLink(link, { staffId: w.agent.id }, { paymentType: "CASH", items: [{ productId: w.product.id, qty: 1 }] })).rejects.toMatchObject({
      status: 402,
      message: EXPIRED_DISTRIBUTOR,
    });
    await expect(changeOrderStatus(w.operator, sent.id, "ACCEPTED")).rejects.toMatchObject({ status: 402 });
    await expect(changeOrderStatus(w.operator, sent.id, "REJECTED", { rejectReason: "Obuna" })).resolves.toMatchObject({ status: "REJECTED" });
    await expect(changeOrderStatus(w.courier, onTheWay.id, "DELIVERED")).resolves.toMatchObject({ status: "DELIVERED" });
    await expect(recordPayment(w.accountant, { linkId: w.link.id, amount: 1_000, channel: "CASH" })).resolves.toBeTruthy();
  });
});

describe("saytda to'lash", () => {
  it("faqat distribyutor admini va do'kon egasi to'laydi", async () => {
    const w = await makeWorld();
    const operator = await makeStaff(w.dist.id, "OPERATOR");
    expect(await payableOrgs(operator.phone)).toEqual([]);
    expect((await payableOrgs(w.admin.phone)).map((o) => [o.kind, o.id])).toEqual([["distributor", w.dist.id]]);
    expect((await payableOrgs(w.owner.phone)).map((o) => [o.kind, o.id])).toEqual([["shop", w.shop.id]]);
    await expect(createSubscriptionPayment(w.owner.phone, { kind: "distributor", id: w.dist.id, months: 1, provider: "PAYME" })).rejects.toMatchObject({ status: 403 });
  });

  it("narx admin belgilaganidek, summa oylar soniga ko'paytiriladi", async () => {
    const w = await makeWorld();
    const before = await monthlyPrice();
    try {
      await setMonthlyPrice(120_000, "test");
      const res = await createSubscriptionPayment(w.owner.phone, { kind: "shop", id: w.shop.id, months: 6, provider: "CLICK" });
      expect(await db.onlinePayment.findUniqueOrThrow({ where: { id: res.id } })).toMatchObject({ purpose: "SUBSCRIPTION", amount: 720_000, months: 6, subscriberShopId: w.shop.id });
      expect(new URL(res.url).searchParams.get("service_id")).toBe("77");
    } finally {
      await setMonthlyPrice(before, "test");
    }
  });
});

describe("platforma Payme kassasi", () => {
  it("to'lov obunani oylar soniga uzaytiradi, takror va parallel so'rovda bir marta; bekor qilinsa qaytadi", async () => {
    const w = await makeWorld();
    const who: Subscriber = { kind: "distributor", id: w.dist.id };
    const before = await paidUntilOf(who);
    const { id } = await createSubscriptionPayment(w.admin.phone, { kind: "distributor", id: w.dist.id, months: 3, provider: "PAYME" });
    const amount = (await db.onlinePayment.findUniqueOrThrow({ where: { id } })).amount * 100;
    const txn = `obuna-${uid()}`;

    expect((await payme("CheckPerformTransaction", { amount, account: { order_id: id } })).result).toEqual({ allow: true });
    expect((await payme("CreateTransaction", { id: txn, time: Date.now(), amount, account: { order_id: id } })).result).toMatchObject({ state: 1 });
    const performed = await Promise.all([1, 2, 3].map(() => payme("PerformTransaction", { id: txn })));
    expect(performed.every((r) => r.result?.state === 2)).toBe(true);
    expect((await paidUntilOf(who)).toISOString()).toBe(addMonths(before, 3).toISOString());
    // Obuna to'lovi qarz daftariga tushmaydi
    expect(await db.ledgerEntry.count({ where: { providerTxnId: `payme:${txn}` } })).toBe(0);

    expect((await payme("CancelTransaction", { id: txn, reason: 5 })).result).toMatchObject({ state: -2 });
    expect((await paidUntilOf(who)).toISOString()).toBe(before.toISOString());
  });

  it("kassalar bir-birining to'lovini ko'rmaydi; platforma kaliti bo'lmasa ruxsat yo'q", async () => {
    const w = await makeWorld();
    const method = await db.paymentMethod.create({ data: { distributorId: w.dist.id, type: "PAYME", merchantId: "m", secretKeyEnc: encryptSecret("dist-kalit") } });
    const debt = await db.onlinePayment.create({ data: { shopLinkId: w.link.id, paymentMethodId: method.id, provider: "PAYME", amount: 1000 } });
    const { id: sub } = await createSubscriptionPayment(w.owner.phone, { kind: "shop", id: w.shop.id, months: 1, provider: "PAYME" });
    const distAuth = `Basic ${Buffer.from("Paycom:dist-kalit").toString("base64")}`;

    expect((await handlePayme(method.id, distAuth, { id: 1, method: "CheckPerformTransaction", params: { amount: 1, account: { order_id: sub } } })).error?.code).toBe(-31050);
    expect((await payme("CheckPerformTransaction", { amount: 100_000, account: { order_id: debt.id } })).error?.code).toBe(-31050);

    delete process.env.PLATFORM_PAYME_KEY;
    try {
      expect((await payme("CheckPerformTransaction", { amount: 1, account: { order_id: sub } })).error?.code).toBe(-32504);
    } finally {
      process.env.PLATFORM_PAYME_KEY = PAYME_KEY;
    }
  });

  it("route orqali ham ishlaydi", async () => {
    const res = await platformPaymeRoute.POST(new Request("http://test.local/api/subscription/payme", { method: "POST", headers: { authorization: AUTH }, body: JSON.stringify({ id: 1, method: "Nomalum", params: {} }) }));
    expect(((await res.json()) as { error: { code: number } }).error.code).toBe(-32601);
  });
});

describe("platforma Click xizmati", () => {
  it("prepare va complete obunani uzaytiradi; takroriy complete bir marta", async () => {
    const w = await makeWorld();
    const who: Subscriber = { kind: "shop", id: w.shop.id };
    const before = await paidUntilOf(who);
    const { id } = await createSubscriptionPayment(w.owner.phone, { kind: "shop", id: w.shop.id, months: 12, provider: "CLICK" });
    const payment = await db.onlinePayment.findUniqueOrThrow({ where: { id } });
    const base = { click_trans_id: String(Date.now()), service_id: "77", merchant_trans_id: id, amount: String(payment.amount), sign_time: "2026-10-14 10:00:00", error: "0" };
    const send = (stage: "prepare" | "complete") => {
      const p: ClickParams = { ...base, action: stage === "prepare" ? "0" : "1", ...(stage === "complete" ? { merchant_prepare_id: String(payment.number) } : {}) };
      return handlePlatformClick(stage, { ...p, sign_string: clickSign(p, CLICK_SECRET, stage) });
    };
    expect((await send("prepare")).error).toBe(0);
    const results = await Promise.all([send("complete"), send("complete")]);
    expect(results.map((r) => r.error).sort()).toEqual([-4, 0]);
    expect((await paidUntilOf(who)).toISOString()).toBe(addMonths(before, 12).toISOString());
  });
});

describe("qo'lda uzaytirish va yaxlitlik", () => {
  it("muddati o'tgan obuna bugundan uzaytiriladi; bir vaqtdagi ikki uzaytirish ikkalasi ham qo'shiladi", async () => {
    const w = await makeWorld();
    const who: Subscriber = { kind: "shop", id: w.shop.id };
    await setPaidUntil(who, -30);
    const start = Date.now();
    const first = await extendManually(who, 1, "admin:test");
    expect(Math.abs(first.getTime() - addMonths(new Date(start), 1).getTime())).toBeLessThan(60_000);

    await Promise.all([extendManually(who, 1, "admin:test"), extendManually(who, 1, "admin:test")]);
    expect((await paidUntilOf(who)).toISOString()).toBe(addMonths(first, 2).toISOString());
    expect(await db.auditLog.count({ where: { entityId: w.shop.id, action: "subscription.manual" } })).toBe(3);
  });

  it("baza noto'g'ri to'lov yozuvini qabul qilmaydi", async () => {
    const w = await makeWorld();
    await expect(db.onlinePayment.create({ data: { purpose: "SUBSCRIPTION", provider: "PAYME", amount: 1, months: 1 } })).rejects.toThrow();
    await expect(
      db.onlinePayment.create({ data: { purpose: "SUBSCRIPTION", provider: "PAYME", amount: 1, months: 1, subscriberShopId: w.shop.id, subscriberDistributorId: w.dist.id } }),
    ).rejects.toThrow();
    await expect(db.onlinePayment.create({ data: { purpose: "DEBT", provider: "PAYME", amount: 1 } })).rejects.toThrow();
  });

  it("ilova obuna holatini ko'radi", async () => {
    const w = await makeWorld();
    await setPaidUntil({ kind: "distributor", id: w.dist.id }, -2);
    const me = await import("@/app/api/staff/me/route");
    const body = (await (await me.GET(req("/api/staff/me", { token: w.agent.token }))).json()) as { subscription: { state: string; trial: boolean } };
    // Hali bir marta ham to'lanmagan: tekin davr tugagan, imtiyoz muddatida
    expect(body.subscription).toMatchObject({ state: "GRACE", trial: true });
  });
});
