// Agent qo'shgan do'kon: egasi raqamini SMS kod bilan tasdiqlamaguncha nomiga qarz yozilmaydi (faqat naqd buyurtma).
// Takroriy ro'yxatdan o'tish bilan tekin davrni cho'zib bo'lmaydi
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { issueOtp } from "@/lib/otp";
import { addMonths } from "@/lib/time";
import { makeWorld, phone, req, tokens } from "@/test/factory";
import * as otpVerify from "./auth/otp/verify/route";
import * as registerDistributor from "./auth/register-distributor/route";
import * as registerShop from "./auth/register/route";
import * as staffCatalog from "./staff/catalog/route";
import * as staffLedger from "./staff/ledger/route";
import * as staffOrders from "./staff/orders/route";
import * as staffShops from "./staff/shops/route";

const shopBody = (p: string, shopName = "Yangi do'kon") => ({ shopName, address: "Bunyodkor ko'chasi 1", district: "Chilonzor", ownerName: "Ega", phone: p });

async function agentCreatesShop() {
  const w = await makeWorld();
  const p = phone();
  const res = await staffShops.POST(req("/api/staff/shops", { token: w.agent.token, body: shopBody(p) }));
  expect(res.status).toBe(200);
  const { linkId } = (await res.json()) as { linkId: string };
  await db.shopLink.update({ where: { id: linkId }, data: { creditLimit: 10_000_000 } });
  return { w, p, linkId };
}

const order = (token: string, linkId: string, productId: string, paymentType: string) =>
  staffOrders.POST(req("/api/staff/orders", { token, body: { linkId, paymentType, items: [{ productId, qty: 10 }] } }));

describe("agent qo'shgan do'kon: egasining roziligi", () => {
  it("egasi kirmaguncha faqat naqd; nasiya, o'tkazma va qarz oshiruvchi tuzatish rad etiladi", async () => {
    const { w, linkId } = await agentCreatesShop();
    const link = await db.shopLink.findUniqueOrThrow({ where: { id: linkId }, include: { shop: true } });
    expect(link.shop.verifiedAt).toBeNull();

    expect((await order(w.agent.token, linkId, w.product.id, "CREDIT")).status).toBe(400);
    expect((await order(w.agent.token, linkId, w.product.id, "TRANSFER")).status).toBe(400);
    expect((await order(w.agent.token, linkId, w.product.id, "CASH")).status).toBe(200);

    const adjust = (amount: number) => staffLedger.POST(req("/api/staff/ledger", { token: w.admin.token, body: { linkId, amount, note: "eski qarz" } }));
    expect((await adjust(50_000)).status).toBe(400);
    expect((await adjust(-5_000)).status).toBe(200);

    // Ilova ham buni biladi: agentga faqat naqd ko'rsatiladi
    const catalog = (await (await staffCatalog.GET(req(`/api/staff/catalog?linkId=${linkId}`, { token: w.agent.token }))).json()) as { ownerVerified: boolean };
    expect(catalog.ownerVerified).toBe(false);
  });

  it("egasi SMS kod bilan ilovaga kirgach nasiya ochiladi", async () => {
    const { w, p, linkId } = await agentCreatesShop();
    const code = await issueOtp(p, null);
    expect((await otpVerify.POST(req("/api/auth/otp/verify", { body: { phone: p, code } }))).status).toBe(200);
    expect((await db.shopLink.findUniqueOrThrow({ where: { id: linkId }, include: { shop: true } })).shop.verifiedAt).not.toBeNull();
    expect((await order(w.agent.token, linkId, w.product.id, "CREDIT")).status).toBe(200);
  });

  it("o'zi ro'yxatdan o'tgan do'kon darhol tasdiqlangan", async () => {
    const p = phone();
    const res = await registerShop.POST(req("/api/auth/register", { body: { ...shopBody(p), phoneToken: tokens.phone(p) } }));
    expect(res.status).toBe(200);
    const shop = await db.shop.findFirstOrThrow({ where: { users: { some: { phone: p } } } });
    expect(shop.verifiedAt).not.toBeNull();
  });
});

describe("takroriy ro'yxatdan o'tish va tekin davr", () => {
  it("bir raqamning ikkinchi do'koni birinchisi bilan birga tugaydi (kamida 1 oy)", async () => {
    const p = phone();
    const register = (name: string) => registerShop.POST(req("/api/auth/register", { body: { ...shopBody(p, name), phoneToken: tokens.phone(p) } }));
    expect((await register("Birinchi")).status).toBe(200);
    const first = await db.shop.findFirstOrThrow({ where: { name: "Birinchi", users: { some: { phone: p } } } });
    // Birinchi do'kon 11 oy oldin ochilgan: tekin davrining 1 oyi qolgan
    const soon = addMonths(new Date(), 1);
    await db.shop.update({ where: { id: first.id }, data: { trialEndsAt: new Date(Date.now() + 5 * 24 * 3600 * 1000), paidUntil: new Date(Date.now() + 5 * 24 * 3600 * 1000) } });
    expect((await register("Ikkinchi")).status).toBe(200);
    const second = await db.shop.findFirstOrThrow({ where: { name: "Ikkinchi", users: { some: { phone: p } } } });
    expect(Math.abs(second.trialEndsAt.getTime() - soon.getTime())).toBeLessThan(60_000);
  });

  it("distribyutor ham: shu raqam admin bo'lgan kompaniya bo'lsa, yangisi to'liq 12 oy olmaydi", async () => {
    const p = phone();
    const body = (companyName: string) => ({ phoneToken: tokens.phone(p), companyName, districts: ["Chilonzor"], categories: ["Ichimlik"], adminName: "Admin" });
    expect((await registerDistributor.POST(req("/api/auth/register-distributor", { body: body("Birinchi MChJ") }))).status).toBe(200);
    const first = await db.distributor.findFirstOrThrow({ where: { name: "Birinchi MChJ", staff: { some: { phone: p } } } });
    const firstEnds = addMonths(new Date(), 3);
    await db.distributor.update({ where: { id: first.id }, data: { trialEndsAt: firstEnds, paidUntil: firstEnds } });
    expect((await registerDistributor.POST(req("/api/auth/register-distributor", { body: body("Ikkinchi MChJ") }))).status).toBe(200);
    const second = await db.distributor.findFirstOrThrow({ where: { name: "Ikkinchi MChJ", staff: { some: { phone: p } } } });
    expect(second.trialEndsAt).toEqual(firstEnds);
  });
});
