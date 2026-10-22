// 2026-10-22 qarori: platforma tekshiruvi yo'q, uning o'rniga do'kon roziligi. Distribyutor xodimi kiritgan buyurtma va
// qarzni oshiradigan tuzatish do'kon egasi ilovada tasdiqlaguncha kuchga kirmaydi; tovar egasi qismi yopiq
import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { balanceOf, ctx, makeShop, makeWorld, phone, req, settle, tokens, uid } from "@/test/factory";
import * as otpRequest from "./auth/otp/request/route";
import * as otpVerify from "./auth/otp/verify/route";
import * as registerBrand from "./auth/register-brand/route";
import * as brandMe from "./brand/me/route";
import * as shopDebtAnswer from "./shop/debts/[id]/answer/route";
import * as shopHome from "./shop/home/route";
import * as shopOrderAnswer from "./shop/orders/[id]/answer/route";
import * as staffBrands from "./staff/brands/route";
import * as staffLedger from "./staff/ledger/route";
import * as staffReverse from "./staff/ledger/[id]/reverse/route";
import * as staffOrder from "./staff/orders/[id]/route";
import * as staffOrders from "./staff/orders/route";
import * as staffPayment from "./staff/payments/[id]/route";
import * as staffPayments from "./staff/payments/route";

const agentOrder = (token: string, linkId: string, productId: string, qty: number, paymentType = "CREDIT") =>
  staffOrders.POST(req("/api/staff/orders", { token, body: { linkId, paymentType, items: [{ productId, qty }] } }));
const answerOrder = (token: string, id: string, accept: boolean) => shopOrderAnswer.POST(req(`/api/shop/orders/${id}/answer`, { token, body: { accept } }), ctx({ id }));
const answerDebt = (token: string, id: string, accept: boolean) => shopDebtAnswer.POST(req(`/api/shop/debts/${id}/answer`, { token, body: { accept } }), ctx({ id }));
const moveOrder = (token: string, id: string, to: string) => staffOrder.POST(req(`/api/staff/orders/${id}`, { token, body: { to } }), ctx({ id }));

// Agent faqat o'ziga biriktirilgan do'konlarni ko'radi
async function agentWorld(link: Parameters<typeof makeWorld>[0] = {}) {
  const w = await makeWorld(link);
  await db.shopLink.update({ where: { id: w.link.id }, data: { agentId: w.agent.id } });
  return w;
}

async function seller(shopId: string) {
  const u = await db.shopUser.create({ data: { shopId, name: "Sotuvchi", phone: phone(), role: "SELLER" } });
  return tokens.shop(u.id);
}

describe("xodim kiritgan buyurtma: do'kon egasining roziligi bilan", () => {
  it("tasdiqlanguncha jo'natilmaydi; tasdiqlangach qarz buyurtma summasidan oshmaydi", async () => {
    const w = await agentWorld({ creditLimit: 1_000_000 });
    const res = await agentOrder(w.agent.token, w.link.id, w.product.id, 50);
    expect(res.status).toBe(200);
    const { id } = (await res.json()) as { id: string };
    expect((await db.order.findUniqueOrThrow({ where: { id } })).status).toBe("AWAITING_SHOP");

    // Distribyutor o'zi qabul qilib, jo'natib yubora olmaydi
    expect((await moveOrder(w.operator.token, id, "ACCEPTED")).status).toBe(400);
    expect((await moveOrder(w.operator.token, id, "IN_DELIVERY")).status).toBe(400);
    // Sotuvchi va begona do'kon tasdiqlay olmaydi
    expect((await answerOrder(await seller(w.shop.id), id, true)).status).toBe(403);
    const stranger = await makeShop();
    expect((await answerOrder(stranger.owner.token, id, true)).status).toBe(404);

    // Bosh sahifada tasdiq kutayotgani ko'rinadi
    const home = (await (await shopHome.GET(req("/api/shop/home", { token: w.owner.token }))).json()) as { confirmations: { orders: number; debts: number } };
    expect(home.confirmations).toEqual({ orders: 1, debts: 0 });

    // Ikki marta bosilsa ham bir marta tasdiqlanadi
    const answers = await settle([1, 2, 3].map(() => answerOrder(w.owner.token, id, true)));
    expect(answers.ok.filter((r) => r.status === 200)).toHaveLength(1);
    const accepted = await db.order.findUniqueOrThrow({ where: { id } });
    expect(accepted.status).toBe("ACCEPTED");
    expect(accepted.acceptedAt).toBeInstanceOf(Date);

    expect((await moveOrder(w.operator.token, id, "IN_DELIVERY")).status).toBe(200);
    expect((await moveOrder(w.operator.token, id, "DELIVERED")).status).toBe(200);
    expect(await balanceOf(w.link.id)).toBe(accepted.total);
  });

  it("rad etilgan buyurtma bekor bo'ladi va qarz yozilmaydi; xodim kutayotganini qaytarib oladi", async () => {
    const w = await agentWorld({ creditLimit: 1_000_000 });
    const first = (await (await agentOrder(w.agent.token, w.link.id, w.product.id, 10)).json()) as { id: string };
    expect((await answerOrder(w.owner.token, first.id, false)).status).toBe(200);
    expect((await db.order.findUniqueOrThrow({ where: { id: first.id } })).status).toBe("CANCELLED");
    expect((await moveOrder(w.operator.token, first.id, "ACCEPTED")).status).toBe(400);

    const second = (await (await agentOrder(w.agent.token, w.link.id, w.product.id, 10)).json()) as { id: string };
    expect((await moveOrder(w.operator.token, second.id, "CANCELLED")).status).toBe(200);
    expect((await answerOrder(w.owner.token, second.id, true)).status).toBe(400);
    expect(await balanceOf(w.link.id)).toBe(0);
  });

  it("tasdiq kutayotgan nasiyali buyurtma ham limitga qo'shiladi", async () => {
    const w = await agentWorld({ creditLimit: 15_000 });
    expect((await agentOrder(w.agent.token, w.link.id, w.product.id, 10)).status).toBe(200);
    const over = await agentOrder(w.agent.token, w.link.id, w.product.id, 10);
    expect(over.status).toBe(400);
  });

  it("to'xtatilgan distribyutor buyurtma kirita olmaydi", async () => {
    const w = await agentWorld();
    await db.distributor.update({ where: { id: w.dist.id }, data: { status: "PENDING" } });
    expect((await agentOrder(w.agent.token, w.link.id, w.product.id, 10, "CASH")).status).toBe(403);
  });
});

describe("qarz qo'shish: do'kon egasining roziligi bilan", () => {
  it("qo'shilgan qarz kutadi; distribyutor o'zi tasdiqlay olmaydi; rad etilsa kuchga kirmaydi", async () => {
    const w = await makeWorld({ creditDays: 10 });
    const add = (clientKey: string) =>
      staffLedger.POST(req("/api/staff/ledger", { token: w.accountant.token, body: { linkId: w.link.id, amount: 100_000, note: "Eski qog'ozdagi qarz", clientKey } }));
    const { id } = (await (await add(`k-${uid()}`)).json()) as { id: string };
    expect((await db.ledgerEntry.findUniqueOrThrow({ where: { id } })).status).toBe("PENDING");
    expect(await balanceOf(w.link.id)).toBe(0);

    // Chek tasdiqlash yo'li orqali ham o'zi tasdiqlay olmaydi; to'lovlar ro'yxatida ham chiqmaydi
    expect((await staffPayment.POST(req(`/api/staff/payments/${id}`, { token: w.accountant.token, body: { action: "confirm" } }), ctx({ id }))).status).toBe(404);
    const list = (await (await staffPayments.GET(req("/api/staff/payments", { token: w.accountant.token }))).json()) as { pending: { id: string }[] };
    expect(list.pending.some((p) => p.id === id)).toBe(false);
    expect((await answerDebt(await seller(w.shop.id), id, true)).status).toBe(403);

    expect((await answerDebt(w.owner.token, id, false)).status).toBe(200);
    expect((await db.ledgerEntry.findUniqueOrThrow({ where: { id } })).status).toBe("REJECTED");
    expect((await answerDebt(w.owner.token, id, true)).status).toBe(400);
    expect(await balanceOf(w.link.id)).toBe(0);

    // Yangi so'rov tasdiqlansa qarzga qo'shiladi, muddat tasdiq kunidan
    const next = (await (await add(`k-${uid()}`)).json()) as { id: string };
    expect((await answerDebt(w.owner.token, next.id, true)).status).toBe(200);
    expect(await balanceOf(w.link.id)).toBe(100_000);
    const confirmed = await db.ledgerEntry.findUniqueOrThrow({ where: { id: next.id } });
    expect(confirmed.dueDate!.getTime() - confirmed.date.getTime()).toBe(10 * 24 * 60 * 60 * 1000);
  });

  it("qarzni kamaytirish darhol kuchga kiradi", async () => {
    const w = await makeWorld();
    await db.ledgerEntry.create({ data: { shopLinkId: w.link.id, type: "DEBT", amount: 300_000, createdBy: "system" } });
    const res = await staffLedger.POST(req("/api/staff/ledger", { token: w.accountant.token, body: { linkId: w.link.id, amount: -50_000, note: "Qaytarilgan tovar" } }));
    expect(res.status).toBe(200);
    expect(await balanceOf(w.link.id)).toBe(250_000);
  });

  it("do'kon rad etgan to'lov bekor qilinishi asl to'lovni bo'shatadi: qayta so'rash mumkin", async () => {
    const w = await makeWorld();
    const pay = await db.ledgerEntry.create({ data: { shopLinkId: w.link.id, type: "PAYMENT", amount: -40_000, channel: "CASH", createdBy: "staff:x" } });
    const reverse = () => staffReverse.POST(req(`/api/staff/ledger/${pay.id}/reverse`, { token: w.admin.token, body: { reason: "Pul olinmagan" } }), ctx({ id: pay.id }));
    const { id } = (await (await reverse()).json()) as { id: string };
    expect(await balanceOf(w.link.id)).toBe(-40_000);
    expect((await answerDebt(w.owner.token, id, false)).status).toBe(200);
    const rejected = await db.ledgerEntry.findUniqueOrThrow({ where: { id } });
    expect(rejected).toMatchObject({ status: "REJECTED", reversesId: null });
    expect(await balanceOf(w.link.id)).toBe(-40_000);
    expect((await reverse()).status).toBe(200);
  });
});

describe("tovar egasi qismi yopiq", () => {
  afterEach(() => {
    process.env.BRANDS_ENABLED = "1";
  });

  it("ro'yxatdan o'tish, kirish va xodim bo'limlari ishlamaydi", async () => {
    process.env.BRANDS_ENABLED = "0";
    const p = phone();
    const brand = await db.brand.create({ data: { name: `Brend ${uid()}`, categories: ["Ichimlik"], users: { create: { name: "Ega", phone: p } } }, include: { users: true } });

    expect((await brandMe.GET(req("/api/brand/me", { token: tokens.brand(brand.users[0].id) }))).status).toBe(404);
    const reg = await registerBrand.POST(req("/api/auth/register-brand", { body: { phoneToken: tokens.phone(phone()), brandName: "Yangi brend", categories: ["Ichimlik"], contactName: "Ega" } }));
    expect(reg.status).toBe(404);
    const w = await makeWorld();
    expect((await staffBrands.GET(req("/api/staff/brands", { token: w.admin.token }))).status).toBe(404);

    // Shu raqamga do'kon ham bog'langan: kirishda faqat do'kon chiqadi
    await makeShopFor(p);
    const sent = await otpRequest.POST(req("/api/auth/otp/request", { body: { phone: p }, headers: { "x-real-ip": `10.${uid()}` } }));
    const { devCode } = (await sent.json()) as { devCode: string };
    const ok = await otpVerify.POST(req("/api/auth/otp/verify", { body: { phone: p, code: devCode } }));
    const body = (await ok.json()) as { accounts: { kind: string }[] };
    expect(body.accounts.map((a) => a.kind)).toEqual(["shop"]);
  });
});

async function makeShopFor(p: string) {
  const shop = await makeShop();
  await db.shopUser.update({ where: { id: shop.owner.id }, data: { phone: p } });
}
