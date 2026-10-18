// 2026-10-18 tahlilida topilgan xatolarning tuzatishlari: har biri haqiqiy bazada, iloji bo'lsa route'lar orqali tekshiriladi
import { describe, expect, it, vi } from "vitest";
import { proposeAgreement } from "@/lib/brands";
import { clickSign, handleClick, type ClickParams } from "@/lib/click";
import { encryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import { rejectLink, requestLink } from "@/lib/links";
import { handlePayme } from "@/lib/payme";
import { getStaff, PANEL_COOKIE } from "@/lib/session";
import { deleteAccount } from "@/lib/account";
import { balanceOf, ctx, makeDistributor, makeShop, makeStaff, makeWorld, phone, req, tokens, uid } from "@/test/factory";
import * as otpRequest from "./auth/otp/request/route";
import * as otpVerify from "./auth/otp/verify/route";
import * as register from "./auth/register/route";
import * as brandDistributors from "./brand/distributors/route";
import * as panelLogin from "./panel/login/route";
import * as shopDistributors from "./shop/distributors/route";
import * as shopPayments from "./shop/payments/route";
import * as shopTeam from "./shop/team/route";
import * as staffImport from "./staff/agreements/[id]/import/route";
import * as staffBrandOrders from "./staff/brand-orders/route";
import * as staffBrands from "./staff/brands/route";
import * as staffDashboard from "./staff/dashboard/route";
import * as staffLedger from "./staff/ledger/route";
import * as staffOrders from "./staff/orders/route";
import * as staffPayments from "./staff/payments/route";
import * as staffShops from "./staff/shops/route";

// Panel sahifalari cookie'ni next/headers orqali o'qiydi: testda cookie qiymati shu yerdan beriladi
const jar = vi.hoisted(() => ({ panel: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "panel_session" && jar.panel ? { value: jar.panel } : undefined) }),
}));

const json = async (res: Response) => (await res.json()) as Record<string, unknown>;

describe("1. Web panel faqat admin, operator va hisobchiga", () => {
  it("agent va yetkazuvchining ilova tokeni panel cookie'sida ishlamaydi", async () => {
    const w = await makeWorld();
    expect(PANEL_COOKIE).toBe("panel_session");
    for (const s of [w.agent, w.courier]) {
      jar.panel = s.token;
      expect(await getStaff()).toBeNull();
    }
    for (const s of [w.admin, w.operator, w.accountant]) {
      jar.panel = s.token;
      expect((await getStaff())?.id).toBe(s.id);
    }
    jar.panel = undefined;
  });
});

describe("2. Demo (App Store tekshiruvi) tashkilotlari haqiqiylardan ajratilgan", () => {
  async function demoWorld() {
    const tag = uid();
    const demoDist = await makeDistributor({ name: `Demo ${tag}`, demo: true, districts: [`Demo tuman ${tag}`] });
    const realDist = await makeDistributor({ name: `Real ${tag}` });
    const demoShop = await makeShop({ demo: true });
    const realShop = await makeShop();
    const demoBrand = await db.brand.create({ data: { name: `Demo brend ${tag}`, categories: ["x"], status: "ACTIVE", demo: true, users: { create: { name: "U", phone: phone() } } }, include: { users: true } });
    const realBrand = await db.brand.create({ data: { name: `Real brend ${tag}`, categories: ["x"], status: "ACTIVE", users: { create: { name: "U", phone: phone() } } }, include: { users: true } });
    return { tag, demoDist, realDist, demoShop, realShop, demoBrand, realBrand };
  }

  it("haqiqiy do'kon demo distribyutorni qidiruvda ko'rmaydi va unga ulana olmaydi; demo do'kon esa faqat demoni ko'radi", async () => {
    const d = await demoWorld();
    const ids = async (token: string) =>
      ((await json(await shopDistributors.GET(req(`/api/shop/distributors?q=${d.tag}`, { token })))).distributors as { id: string }[]).map((x) => x.id);
    expect(await ids(d.realShop.owner.token)).toEqual([d.realDist.id]);
    expect(await ids(d.demoShop.owner.token)).toEqual([d.demoDist.id]);
    await expect(requestLink(d.realShop.id, d.demoDist.id)).rejects.toMatchObject({ status: 404 });
    await expect(requestLink(d.demoShop.id, d.realDist.id)).rejects.toMatchObject({ status: 404 });
    // Ro'yxatdan o'tish formasidagi hududlarda demo distribyutornikilari yo'q
    expect(((await json(await register.GET())).districts as string[]).includes(`Demo tuman ${d.tag}`)).toBe(false);
  });

  it("tovar egasi va distribyutor ro'yxatlari va kelishuv takliflari aralashmaydi", async () => {
    const d = await demoWorld();
    const realAdmin = await makeStaff(d.realDist.id, "ADMIN");
    const demoAdmin = await makeStaff(d.demoDist.id, "ADMIN");
    const brandIds = async (token: string) => ((await json(await staffBrands.GET(req(`/api/staff/brands?q=${d.tag}`, { token })))).brands as { id: string }[]).map((b) => b.id);
    expect(await brandIds(realAdmin.token)).toEqual([d.realBrand.id]);
    expect(await brandIds(demoAdmin.token)).toEqual([d.demoBrand.id]);
    const distIds = async (token: string) =>
      ((await json(await brandDistributors.GET(req(`/api/brand/distributors?q=${d.tag}`, { token })))).distributors as { id: string }[]).map((x) => x.id);
    expect(await distIds(tokens.brand(d.realBrand.users[0].id))).toEqual([d.realDist.id]);
    expect(await distIds(tokens.brand(d.demoBrand.users[0].id))).toEqual([d.demoDist.id]);
    await expect(proposeAgreement("BRAND", d.demoBrand.id, d.realDist.id, { districts: [], discountPercent: 0 }, "t")).rejects.toMatchObject({ status: 404 });
    await expect(proposeAgreement("DISTRIBUTOR", d.realBrand.id, d.demoDist.id, { districts: [], discountPercent: 0 }, "t")).rejects.toMatchObject({ status: 404 });
  });

  it("demo distribyutor haqiqiy do'konni qo'sha olmaydi, haqiqiy distribyutor demo do'konni ham; yangi do'koni demo bo'ladi", async () => {
    const d = await demoWorld();
    const demoAgent = await makeStaff(d.demoDist.id, "AGENT");
    const realAgent = await makeStaff(d.realDist.id, "AGENT");
    const add = (token: string, p: string) =>
      staffShops.POST(req("/api/staff/shops", { token, body: { shopName: `Do'kon ${uid()}`, address: "Manzil 12345", district: "Chilonzor", ownerName: "Ega", phone: p } }));
    expect((await add(demoAgent.token, d.realShop.owner.phone)).status).toBe(400);
    expect((await add(realAgent.token, d.demoShop.owner.phone)).status).toBe(400);
    expect(await db.shopLink.count({ where: { shopId: { in: [d.realShop.id, d.demoShop.id] } } })).toBe(0);
    const res = await json(await add(demoAgent.token, phone()));
    const link = await db.shopLink.findUniqueOrThrow({ where: { id: res.linkId as string }, include: { shop: true } });
    expect(link.shop.demo).toBe(true);
  });
});

describe("4. Agent qo'shgan do'kon: egasi raqamini tasdiqlamaguncha faqat naqd", () => {
  it("nasiya, o'tkazma va qarz tuzatishi yopiq; egasi SMS kod bilan kirgach ochiladi", async () => {
    const w = await makeWorld();
    await db.shopLink.update({ where: { id: w.link.id }, data: { creditLimit: 10_000_000 } });
    const ownerPhone = phone();
    const added = await json(
      await staffShops.POST(req("/api/staff/shops", { token: w.agent.token, body: { shopName: `Yangi ${uid()}`, address: "Manzil 12345", district: "Chilonzor", ownerName: "Ega", phone: ownerPhone } })),
    );
    const linkId = added.linkId as string;
    await db.shopLink.update({ where: { id: linkId }, data: { creditLimit: 10_000_000 } });
    const order = (paymentType: string) =>
      staffOrders.POST(req("/api/staff/orders", { token: w.agent.token, body: { linkId, paymentType, items: [{ productId: w.product.id, qty: 10 }] } }));
    const credit = await order("CREDIT");
    expect(credit.status).toBe(403);
    expect((await json(credit)).error).toMatch(/tasdiqlamagan/);
    expect((await order("TRANSFER")).status).toBe(403);
    expect((await order("CASH")).status).toBe(200);
    const adjust = (amount: number) => staffLedger.POST(req("/api/staff/ledger", { token: w.admin.token, body: { linkId, amount, note: "Eski qarz" } }));
    expect((await adjust(50_000)).status).toBe(403);
    expect((await adjust(-1_000)).status).toBe(200);

    // Egasi ilovaga SMS kod bilan kiradi: do'kon tasdiqlanadi
    const { devCode } = (await json(await otpRequest.POST(req("/api/auth/otp/request", { body: { phone: ownerPhone } })))) as { devCode: string };
    expect((await otpVerify.POST(req("/api/auth/otp/verify", { body: { phone: ownerPhone, code: devCode } }))).status).toBe(200);
    expect((await db.shopLink.findUniqueOrThrow({ where: { id: linkId }, include: { shop: true } })).shop.confirmedAt).not.toBeNull();
    expect((await order("CREDIT")).status).toBe(200);
    expect((await order("TRANSFER")).status).toBe(200);
    expect((await adjust(50_000)).status).toBe(200);
  });

  it("do'konning o'zi ro'yxatdan o'tsa darhol tasdiqlangan", async () => {
    const p = phone();
    const res = await json(
      await register.POST(req("/api/auth/register", { body: { phoneToken: tokens.phone(p), shopName: `O'zi ${uid()}`, address: "Manzil 12345", district: "Chilonzor", ownerName: "Ega" } })),
    );
    expect(res.token).toBeTruthy();
    const owner = await db.shopUser.findFirstOrThrow({ where: { phone: p }, include: { shop: true } });
    expect(owner.shop.confirmedAt).not.toBeNull();
  });
});

describe("5. O'tkazma (TRANSFER) muddati o'tgan qarz uchun yopilgan nasiyani chetlab o'tmaydi", () => {
  it("muddati blockAfterDays dan oshgan qarz bo'lsa o'tkazma yopiq, naqd ochiq; faqat ogohlantirish rejimida ochiq", async () => {
    const w = await makeWorld({ creditLimit: 0, blockAfterDays: 7 });
    const old = new Date(Date.now() - 60 * 86_400_000);
    await db.ledgerEntry.create({ data: { shopLinkId: w.link.id, type: "DEBT", amount: 5_000_000, date: old, dueDate: old, createdBy: "system" } });
    const order = (paymentType: string) =>
      staffOrders.POST(req("/api/staff/orders", { token: w.operator.token, body: { linkId: w.link.id, paymentType, items: [{ productId: w.product.id, qty: 10 }] } }));
    const transfer = await order("TRANSFER");
    expect(transfer.status).toBe(400);
    expect((await json(transfer)).error).toMatch(/60 kun/);
    expect((await order("CASH")).status).toBe(200);
    await db.shopLink.update({ where: { id: w.link.id }, data: { blockAfterDays: null } });
    expect((await order("TRANSFER")).status).toBe(200);
  });
});

describe("6. To'lov usuli nofaol qilinsa ham boshlangan onlayn to'lov yakunlanadi", () => {
  it("Payme: bajarish va bekor qilish ishlaydi, qarz daftari mos", async () => {
    const w = await makeWorld();
    const KEY = `k-${uid()}`;
    const AUTH = `Basic ${Buffer.from(`Paycom:${KEY}`).toString("base64")}`;
    const method = await db.paymentMethod.create({ data: { distributorId: w.dist.id, type: "PAYME", merchantId: "m", secretKeyEnc: encryptSecret(KEY) } });
    const pay = await db.onlinePayment.create({ data: { shopLinkId: w.link.id, paymentMethodId: method.id, provider: "PAYME", amount: 7_000 } });
    const call = (m: string, params: Record<string, unknown>) => handlePayme(method.id, AUTH, { id: 1, method: m, params }) as Promise<{ result?: { state?: number }; error?: { code: number } }>;
    const txn = `t-${uid()}`;
    expect((await call("CreateTransaction", { id: txn, time: Date.now(), amount: 700_000, account: { order_id: pay.id } })).result?.state).toBe(1);
    await db.paymentMethod.update({ where: { id: method.id }, data: { active: false } });
    expect((await call("PerformTransaction", { id: txn })).result?.state).toBe(2);
    expect(await balanceOf(w.link.id)).toBe(-7_000);
    expect((await call("CancelTransaction", { id: txn, reason: 5 })).result?.state).toBe(-2);
    expect(await balanceOf(w.link.id)).toBe(0);
  });

  it("Click: prepare dan keyin usul o'chirilsa ham complete o'tadi", async () => {
    const w = await makeWorld();
    const SECRET = `s-${uid()}`;
    const method = await db.paymentMethod.create({ data: { distributorId: w.dist.id, type: "CLICK", merchantId: "11", serviceId: "22", secretKeyEnc: encryptSecret(SECRET) } });
    const pay = await db.onlinePayment.create({ data: { shopLinkId: w.link.id, paymentMethodId: method.id, provider: "CLICK", amount: 9_000 } });
    const base = { click_trans_id: String(Date.now()), service_id: "22", merchant_trans_id: pay.id, amount: "9000", sign_time: "2026-10-18 10:00:00", error: "0" };
    const send = (stage: "prepare" | "complete") => {
      const p: ClickParams = { ...base, action: stage === "prepare" ? "0" : "1", ...(stage === "complete" ? { merchant_prepare_id: String(pay.number) } : {}) };
      return handleClick(method.id, stage, { ...p, sign_string: clickSign(p, SECRET, stage) });
    };
    expect((await send("prepare")).error).toBe(0);
    await db.paymentMethod.update({ where: { id: method.id }, data: { active: false } });
    expect((await send("complete")).error).toBe(0);
    expect(await balanceOf(w.link.id)).toBe(-9_000);
  });
});

describe("7. Tasdiqlanmagan ulanish so'roviga to'lov yozilmaydi", () => {
  it("to'lov rad etiladi va so'rovni rad etish ishlaydi", async () => {
    const dist = await makeDistributor();
    const admin = await makeStaff(dist.id, "ADMIN");
    const shop = await makeShop();
    const link = await requestLink(shop.id, dist.id);
    const res = await staffPayments.POST(req("/api/staff/payments", { token: admin.token, body: { linkId: link.id, amount: 50_000, channel: "CASH" } }));
    expect(res.status).toBe(404);
    expect(await db.ledgerEntry.count({ where: { shopLinkId: link.id } })).toBe(0);
    await expect(rejectLink(admin, link.id)).resolves.toBeUndefined();
    await expect(deleteAccount({ kind: "shop", id: shop.owner.id })).resolves.toBeUndefined();
  });
});

describe("8. Do'kon egasi hisobini o'chirsa, sotuvchi ega bo'ladi", () => {
  it("eng oldin qo'shilgan sotuvchi ega bo'ladi va jamoani boshqaradi", async () => {
    const shop = await makeShop();
    const first = await db.shopUser.create({ data: { shopId: shop.id, name: "Birinchi", phone: phone(), role: "SELLER", createdAt: new Date(Date.now() - 60_000) } });
    const second = await db.shopUser.create({ data: { shopId: shop.id, name: "Ikkinchi", phone: phone(), role: "SELLER" } });
    await deleteAccount({ kind: "shop", id: shop.owner.id });
    expect((await db.shopUser.findUniqueOrThrow({ where: { id: first.id } })).role).toBe("OWNER");
    expect((await db.shopUser.findUniqueOrThrow({ where: { id: second.id } })).role).toBe("SELLER");
    expect((await shopTeam.GET(req("/api/shop/team", { token: tokens.shop(first.id) }))).status).toBe(200);
  });

  it("sotuvchining o'zi o'chsa ega o'zgarmaydi", async () => {
    const shop = await makeShop();
    const seller = await db.shopUser.create({ data: { shopId: shop.id, name: "S", phone: phone(), role: "SELLER" } });
    await deleteAccount({ kind: "shop", id: seller.id });
    expect(await db.shopUser.findMany({ where: { shopId: shop.id }, select: { id: true, role: true } })).toEqual([{ id: shop.owner.id, role: "OWNER" }]);
  });
});

async function agreementWorld() {
  const w = await makeWorld();
  const brand = await db.brand.create({ data: { name: `Brend ${uid()}`, categories: ["x"], status: "ACTIVE", products: { create: { name: "Sharbat", category: "x", price: 1000 } } }, include: { products: true } });
  const agreement = await db.agreement.create({ data: { brandId: brand.id, distributorId: w.dist.id, status: "ACTIVE", initiatedBy: "BRAND" } });
  return { w, brand, bp: brand.products[0], agreement };
}

describe("9. Xarid buyurtmasi takroriy so'rovda bir marta yaratiladi", () => {
  it("bir xil kalit bilan parallel va qayta yuborilgan buyurtma bitta; kalit boshqa kelishuvga ishlatilmaydi", async () => {
    const a = await agreementWorld();
    const clientKey = `key-${uid()}`;
    const send = (agreementId: string) =>
      staffBrandOrders.POST(req("/api/staff/brand-orders", { token: a.w.admin.token, body: { agreementId, clientKey, items: [{ brandProductId: a.bp.id, qty: 5 }] } }));
    const results = await Promise.all([send(a.agreement.id), send(a.agreement.id), send(a.agreement.id)]);
    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    const ids = new Set(await Promise.all(results.map(async (r) => (await json(r)).id)));
    expect(ids.size).toBe(1);
    expect(await db.brandOrder.count({ where: { agreementId: a.agreement.id } })).toBe(1);
    const other = await db.agreement.create({ data: { brandId: (await agreementWorld()).brand.id, distributorId: a.w.dist.id, status: "ACTIVE", initiatedBy: "BRAND" } });
    expect((await send(other.id)).status).toBe(409);
  });
});

describe("10. Statistika topshirilgan vaqt bo'yicha", () => {
  it("eski buyurtmaning updatedAt yangilansa ham bugungi hisobotga tushmaydi", async () => {
    const w = await makeWorld();
    const seller = await db.shopUser.create({ data: { shopId: w.shop.id, name: "S", phone: phone(), role: "SELLER" } });
    const o = await db.order.create({
      data: { shopLinkId: w.link.id, paymentType: "CASH", status: "DELIVERED", total: 5_000, deliveredTotal: 5_000, createdByShopUserId: seller.id, items: { create: { productId: w.product.id, qty: 5, price: 1_000 } } },
    });
    await db.$executeRaw`UPDATE "Order" SET "updatedAt" = now() - interval '40 days', "deliveredAt" = now() - interval '40 days' WHERE id = ${o.id}`;
    await deleteAccount({ kind: "shop", id: seller.id });
    const today = (await json(await staffDashboard.GET(req("/api/staff/dashboard", { token: w.admin.token })))).deliveredToday;
    expect(today).toEqual({ count: 0, sum: 0 });
  });
});

describe("11. Kelishuvdagi tovarni katalogga qo'shish ikki marta bosilsa ham 500 yo'q", () => {
  it("parallel so'rovlar bitta tovar yaratadi", async () => {
    const a = await agreementWorld();
    const send = () => staffImport.POST(req("/api/staff/agreements/x/import", { token: a.w.admin.token, body: { brandProductId: a.bp.id, price: 1500 } }), ctx({ id: a.agreement.id }));
    const results = await Promise.all([send(), send(), send()]);
    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(await db.product.count({ where: { distributorId: a.w.dist.id, brandProductId: a.bp.id } })).toBe(1);
  });

  it("katalogda shu artikulli boshqa tovar bo'lsa aniq xato (500 emas)", async () => {
    const a = await agreementWorld();
    await db.product.create({ data: { distributorId: a.w.dist.id, sku: `BR-${a.bp.id.slice(-8).toUpperCase()}`, name: "Boshqa", brand: "B", category: "x" } });
    const res = await staffImport.POST(req("/api/staff/agreements/x/import", { token: a.w.admin.token, body: { brandProductId: a.bp.id, price: 1500 } }), ctx({ id: a.agreement.id }));
    expect(res.status).toBe(409);
  });
});

describe("12-13. Forma kutilgan joyda boshqa so'rov 500 emas", () => {
  it("chek yuborish JSON bilan kelsa 400", async () => {
    const w = await makeWorld();
    const res = await shopPayments.POST(req("/api/shop/payments", { token: w.owner.token, body: { amount: 1000 } }));
    expect(res.status).toBe(400);
  });

  it("panelga kirish JSON bilan kelsa 400", async () => {
    const res = await panelLogin.POST(req("/api/panel/login", { body: { action: "logout" } }));
    expect(res.status).toBe(400);
  });
});
