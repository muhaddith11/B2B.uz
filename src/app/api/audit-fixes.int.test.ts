// 2026-10-16 tahlilidagi 17 topilmaning tuzatishlari: har biri haqiqiy bazada, route'lar orqali tekshiriladi
import { describe, expect, it } from "vitest";
import { deleteAccount } from "@/lib/account";
import { encryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import { issueOtp, verifyOtp } from "@/lib/otp";
import { handlePayme } from "@/lib/payme";
import { MAX_PENDING_RECEIPTS } from "@/lib/payments";
import { applyPriceList } from "@/lib/price-list-apply";
import { factsFrom, ledgerFacts, summarize } from "@/lib/shop-summary";
import { storageUsage } from "@/lib/uploads";
import { verifyToken } from "@/lib/token";
import { balanceOf, ctx, makeDistributor, makeLink, makeShop, makeStaff, makeWorld, phone, req, settle, tokens, uid } from "@/test/factory";
import * as accountDelete from "./account/delete/route";
import * as accountDeleteCode from "./account/delete/code/route";
import * as refresh from "./auth/refresh/route";
import * as brandDistributors from "./brand/distributors/route";
import * as shopDebts from "./shop/debts/route";
import * as shopDebtAnswer from "./shop/debts/[id]/answer/route";
import * as shopHome from "./shop/home/route";
import * as shopOrders from "./shop/orders/route";
import * as shopPayments from "./shop/payments/route";
import * as shopOnline from "./shop/payments/online/route";
import * as shopTeam from "./shop/team/route";
import * as shopTeamMember from "./shop/team/[id]/route";
import * as staffBrand from "./staff/brands/[id]/route";
import * as staffBrands from "./staff/brands/route";
import * as staffLedger from "./staff/ledger/route";
import * as staffReverse from "./staff/ledger/[id]/reverse/route";
import * as staffOrders from "./staff/orders/route";
import * as staffPayments from "./staff/payments/route";
import * as staffProduct from "./staff/products/[id]/route";
import * as staffSettings from "./staff/settings/route";
import * as staffShop from "./staff/shops/[linkId]/route";
import * as staffShops from "./staff/shops/route";

const DAY = 24 * 60 * 60 * 1000;
const receiptForm = (distributorId: string, amount: number) => {
  const form = new FormData();
  form.set("distributorId", distributorId);
  form.set("amount", String(amount));
  form.set("receipt", new File([uid()], "chek.jpg", { type: "image/jpeg" }));
  return form;
};
const formReq = (token: string, form: FormData) => new Request("http://test.local/x", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
const debt = (shopLinkId: string, amount: number, daysAgo = 0, dueDaysAgo = daysAgo) =>
  db.ledgerEntry.create({
    data: { shopLinkId, type: "DEBT", amount, createdBy: "system", date: new Date(Date.now() - daysAgo * DAY), dueDate: new Date(Date.now() - dueDaysAgo * DAY) },
  });
const shopBody = (p: string, shopName = "Kiritilgan nom") => ({ shopName, address: "Bunyodkor ko'chasi 1", district: "Chilonzor", ownerName: "Ega", phone: p });

describe("1. bloklangan do'kon qarzini ko'radi va to'laydi", () => {
  it("chek va onlayn to'lov o'tadi, qarz ekranida ko'rinadi, yangi buyurtma esa yopiq", async () => {
    const w = await makeWorld({ status: "BLOCKED" });
    await debt(w.link.id, 500_000, 20, 10);
    await db.paymentMethod.create({ data: { distributorId: w.dist.id, type: "PAYME", merchantId: "m", secretKeyEnc: encryptSecret("kalit") } });

    expect((await shopPayments.GET(req(`/api/shop/payments?distributorId=${w.dist.id}`, { token: w.owner.token }))).status).toBe(200);
    expect((await shopPayments.POST(formReq(w.owner.token, receiptForm(w.dist.id, 100_000)))).status).toBe(200);
    const online = await shopOnline.POST(req("/api/shop/payments/online", { token: w.owner.token, body: { distributorId: w.dist.id, amount: 400_000, provider: "PAYME" } }));
    expect(online.status).toBe(200);

    const debts = (await (await shopDebts.GET(req("/api/shop/debts", { token: w.owner.token }))).json()) as { links: { status: string; debt: number; overdueAmount: number }[] };
    expect(debts.links).toEqual([expect.objectContaining({ status: "BLOCKED", debt: 500_000, overdueAmount: 500_000 })]);
    // Bosh sahifadagi "buyurtma berish" ro'yxatida yo'q, buyurtma ham o'tmaydi
    const home = (await (await shopHome.GET(req("/api/shop/home", { token: w.owner.token }))).json()) as { links: unknown[] };
    expect(home.links).toEqual([]);
    const order = await shopOrders.POST(req("/api/shop/orders", { token: w.owner.token, body: { distributorId: w.dist.id, paymentType: "CASH", items: [{ productId: w.product.id, qty: 1 }] } }));
    expect(order.status).toBe(403);
  });

  it("so'rov holatidagi ulanishga to'lov yo'q", async () => {
    const w = await makeWorld({ status: "REQUESTED" });
    expect((await shopPayments.POST(formReq(w.owner.token, receiptForm(w.dist.id, 1000)))).status).toBe(403);
  });
});

describe("2. qarz daftarini tuzatish", () => {
  it("hisobchi xato naqd to'lovni bekor qiladi: qoldiq tiklanadi, ikkinchi marta bekor qilinmaydi", async () => {
    const w = await makeWorld();
    await debt(w.link.id, 100_000);
    const pay = await staffPayments.POST(req("/api/staff/payments", { token: w.operator.token, body: { linkId: w.link.id, amount: 1_000_000, channel: "CASH" } }));
    const { id } = (await pay.json()) as { id: string };
    expect(await balanceOf(w.link.id)).toBe(-900_000);

    const body = { reason: "Summa xato yozilgan" };
    expect((await staffReverse.POST(req(`/api/staff/ledger/${id}/reverse`, { token: w.agent.token, body }), ctx({ id }))).status).toBe(403);
    const res = await staffReverse.POST(req(`/api/staff/ledger/${id}/reverse`, { token: w.accountant.token, body }), ctx({ id }));
    expect(res.status).toBe(200);
    // To'lovni bekor qilish qarzni oshiradi: do'kon egasi tasdiqlaguncha qoldiq o'zgarmaydi
    expect(await balanceOf(w.link.id)).toBe(-900_000);

    // Bir vaqtda ikki marta: teskari yozuv bitta
    const again = await settle([1, 2, 3].map(() => staffReverse.POST(req(`/api/staff/ledger/${id}/reverse`, { token: w.admin.token, body }), ctx({ id }))));
    expect(again.ok.every((r) => r.status === 409)).toBe(true);
    expect(await db.ledgerEntry.count({ where: { reversesId: id } })).toBe(1);

    const reversal = await db.ledgerEntry.findFirstOrThrow({ where: { reversesId: id } });
    expect(reversal.status).toBe("PENDING");
    const answer = await shopDebtAnswer.POST(req(`/api/shop/debts/${reversal.id}/answer`, { token: w.owner.token, body: { accept: true } }), ctx({ id: reversal.id }));
    expect(answer.status).toBe(200);
    expect(await balanceOf(w.link.id)).toBe(100_000);

    // Do'kon kartasida: bekor qilingan yozuv belgilangan
    const card = (await (await staffShop.GET(req(`/api/staff/shops/${w.link.id}`, { token: w.admin.token }), ctx({ linkId: w.link.id }))).json()) as {
      ledger: { id: string; reversed: boolean; reversesId: string | null }[];
    };
    expect(card.ledger.find((e) => e.id === id)?.reversed).toBe(true);
    expect(card.ledger.some((e) => e.reversesId === id)).toBe(true);
  });

  it("onlayn, tasdiqlanmagan va tuzatish yozuvlari bekor qilinmaydi", async () => {
    const w = await makeWorld();
    const payme = await db.ledgerEntry.create({ data: { shopLinkId: w.link.id, type: "PAYMENT", amount: -1000, channel: "PAYME", providerTxnId: `payme:${uid()}`, createdBy: "system" } });
    const pending = await db.ledgerEntry.create({ data: { shopLinkId: w.link.id, type: "PAYMENT", amount: -1000, channel: "CARD_RECEIPT", status: "PENDING", createdBy: "shop:x" } });
    const body = { reason: "sinov uchun" };
    for (const e of [payme, pending]) {
      expect((await staffReverse.POST(req(`/api/staff/ledger/${e.id}/reverse`, { token: w.admin.token, body }), ctx({ id: e.id }))).status).toBe(400);
    }
    const other = await makeWorld();
    const foreign = await debt(other.link.id, 5000);
    expect((await staffReverse.POST(req(`/api/staff/ledger/${foreign.id}/reverse`, { token: w.admin.token, body }), ctx({ id: foreign.id }))).status).toBe(404);
  });

  it("tuzatish yozuvi: qaytarilgan tovar qarzni kamaytiradi, takroriy so'rov bir marta yoziladi", async () => {
    const w = await makeWorld();
    await debt(w.link.id, 300_000);
    const body = { linkId: w.link.id, amount: -50_000, note: "3 yashik qaytarildi", clientKey: `k-${uid()}` };
    expect((await staffLedger.POST(req("/api/staff/ledger", { token: w.operator.token, body }))).status).toBe(403);
    const r = await settle([1, 2, 3].map(() => staffLedger.POST(req("/api/staff/ledger", { token: w.accountant.token, body }))));
    expect(r.ok.every((x) => x.status === 200)).toBe(true);
    expect(await balanceOf(w.link.id)).toBe(250_000);
    expect((await staffLedger.POST(req("/api/staff/ledger", { token: w.accountant.token, body: { ...body, clientKey: undefined, amount: 0 } }))).status).toBe(400);
  });

  it("bekor qilingan to'lovdan keyin eski qarz yana muddati o'tgan bo'ladi", async () => {
    const w = await makeWorld();
    await debt(w.link.id, 200_000, 30, 20);
    const pay = await db.ledgerEntry.create({ data: { shopLinkId: w.link.id, type: "PAYMENT", amount: -200_000, channel: "CASH", createdBy: "staff:x" } });
    const before = summarize(factsFrom(await db.ledgerEntry.findMany({ where: { shopLinkId: w.link.id } })), [], 0);
    expect(before.overdueAmount).toBe(0);
    await staffReverse.POST(req(`/api/staff/ledger/${pay.id}/reverse`, { token: w.admin.token, body: { reason: "Pul olinmagan" } }), ctx({ id: pay.id }));
    const reversal = await db.ledgerEntry.findFirstOrThrow({ where: { reversesId: pay.id } });
    await shopDebtAnswer.POST(req(`/api/shop/debts/${reversal.id}/answer`, { token: w.owner.token, body: { accept: true } }), ctx({ id: reversal.id }));
    const after = summarize(factsFrom(await db.ledgerEntry.findMany({ where: { shopLinkId: w.link.id } })), [], 0);
    expect(after).toMatchObject({ debt: 200_000, overdueAmount: 200_000, overdueDays: 20 });
  });
});

describe("3. fayl ombori: cheklar chegarasi va hajm kuzatuvi", () => {
  it(`tasdiq kutayotgan ${MAX_PENDING_RECEIPTS} ta chekdan keyin yangisi saqlanmaydi`, async () => {
    const w = await makeWorld();
    const sent = await settle(Array.from({ length: MAX_PENDING_RECEIPTS + 3 }, (_, i) => shopPayments.POST(formReq(w.owner.token, receiptForm(w.dist.id, 1000 + i)))));
    expect(sent.ok.filter((r) => r.status === 200)).toHaveLength(MAX_PENDING_RECEIPTS);
    expect(sent.ok.filter((r) => r.status === 429)).toHaveLength(3);
    const entries = await db.ledgerEntry.findMany({ where: { shopLinkId: w.link.id, status: "PENDING" }, select: { receiptUrl: true } });
    expect(entries).toHaveLength(MAX_PENDING_RECEIPTS);
    // Rad etilgan so'rovlarning fayli omborda qolmagan: faqat yozuvga biriktirilganlari bor
    const paths = entries.map((e) => e.receiptUrl!.replace("/api/files/", ""));
    const storedForLink = await db.storedFile.count({ where: { path: { in: paths } } });
    expect(storedForLink).toBe(MAX_PENDING_RECEIPTS);
  });

  it("admin uchun baza hajmi o'lchanadi", async () => {
    const u = await storageUsage();
    expect(u.databaseBytes).toBeGreaterThan(0);
    expect(u.fileBytes).toBeGreaterThanOrEqual(0);
    expect(u.limitBytes).toBe(512 * 1024 * 1024);
  });
});

describe("4. do'kon so'ragan ulanishni faqat admin tasdiqlaydi", () => {
  it("agent va operator faollashtira olmaydi, admin faollashtiradi", async () => {
    const w = await makeWorld();
    const shop = await makeShop();
    const link = await makeLink(shop.id, w.dist.id, { status: "REQUESTED", source: "SEARCH" });
    for (const s of [w.agent, w.operator]) {
      expect((await staffShops.POST(req("/api/staff/shops", { token: s.token, body: shopBody(shop.owner.phone, shop.name) }))).status).toBe(403);
    }
    expect((await db.shopLink.findUniqueOrThrow({ where: { id: link.id } })).status).toBe("REQUESTED");
    expect((await staffShops.POST(req("/api/staff/shops", { token: w.admin.token, body: shopBody(shop.owner.phone, shop.name) }))).status).toBe(200);
    expect((await db.shopLink.findUniqueOrThrow({ where: { id: link.id } })).status).toBe("ACTIVE");
  });
});

describe("5. narx o'zgarganda guruh chegirmasi saqlanadi", () => {
  it("1500/1455 -> 1600/1552", async () => {
    const w = await makeWorld();
    const big = await db.priceGroup.create({ data: { distributorId: w.dist.id, name: "Katta" } });
    await db.price.updateMany({ where: { productId: w.product.id }, data: { price: 1500 } });
    await db.price.create({ data: { productId: w.product.id, priceGroupId: big.id, price: 1455 } });
    const res = await staffProduct.PATCH(req(`/api/staff/products/${w.product.id}`, { method: "PATCH", token: w.admin.token, body: { price: 1600 } }), ctx({ id: w.product.id }));
    expect(res.status).toBe(200);
    expect((await db.price.findFirstOrThrow({ where: { productId: w.product.id, priceGroupId: w.dist.defaultGroupId } })).price).toBe(1600);
    expect((await db.price.findFirstOrThrow({ where: { productId: w.product.id, priceGroupId: big.id } })).price).toBe(1552);
  });
});

describe("6. yagona admin hisobini o'chirsa jamoa boshqaruvsiz qolmaydi", () => {
  it("boshqa xodim bor, admin yo'q: o'chirilmaydi; ikkinchi admin bo'lsa o'chiriladi", async () => {
    const dist = await makeDistributor();
    const admin = await makeStaff(dist.id, "ADMIN");
    await makeStaff(dist.id, "AGENT");
    await expect(deleteAccount({ kind: "staff", id: admin.id })).rejects.toMatchObject({ status: 400 });
    expect((await accountDeleteCode.POST(req("/api/account/delete/code", { token: admin.token, body: {} }))).status).toBe(400);
    expect((await db.staff.findUniqueOrThrow({ where: { id: admin.id } })).active).toBe(true);

    await makeStaff(dist.id, "ADMIN");
    await deleteAccount({ kind: "staff", id: admin.id });
    expect((await db.staff.findUniqueOrThrow({ where: { id: admin.id } })).active).toBe(false);
    expect((await db.distributor.findUniqueOrThrow({ where: { id: dist.id } })).status).toBe("ACTIVE");
  });

  it("jamoada boshqa hech kim bo'lmasa o'chiriladi va distribyutor yopiladi", async () => {
    const dist = await makeDistributor();
    const admin = await makeStaff(dist.id, "ADMIN");
    await deleteAccount({ kind: "staff", id: admin.id });
    expect((await db.distributor.findUniqueOrThrow({ where: { id: dist.id } })).status).toBe("PENDING");
  });
});

describe("7. prays-list: tashqi rasm va ko'p tovar", () => {
  it("yuklab olinmagan rasm tovarni to'xtatmaydi: eski rasm qoladi, ogohlantirish qaytadi", async () => {
    const w = await makeWorld();
    await db.product.update({ where: { id: w.product.id }, data: { imageUrl: "/api/files/products/0123456789abcdef0123456789abcdef.jpg" } });
    const row = { sku: w.product.sku, name: "Yangi nom", brand: "B", category: "T", unit: "dona", packSize: 1, price: 1200, barcode: null, minOrderPacks: 1, inStock: true, extraPrices: {} };
    const fetchImage = async () => {
      throw new Error("javob 404");
    };
    const res = await applyPriceList(w.admin, [{ ...row, imageUrl: "https://example.com/yoq.jpg" }], { fetchImage });
    expect(res.imageWarnings).toEqual([{ sku: w.product.sku, message: expect.stringContaining("javob 404") }]);
    const p = await db.product.findUniqueOrThrow({ where: { id: w.product.id } });
    expect(p).toMatchObject({ name: "Yangi nom", imageUrl: "/api/files/products/0123456789abcdef0123456789abcdef.jpg", imageSource: null });
  });

  it("bir marta olingan rasm qayta yuklanmaydi; bir xil havola bitta faylga", async () => {
    const w = await makeWorld();
    let calls = 0;
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 9]) as Buffer<ArrayBuffer>;
    const fetchImage = async () => {
      calls++;
      return { buf: png, type: "image/png", ext: "png", hash: uid() };
    };
    const base = { brand: "B", category: "T", unit: "dona", packSize: 1, price: 1000, barcode: null, minOrderPacks: 1, inStock: true, extraPrices: {}, imageUrl: "https://example.com/bir.png" };
    const items = [
      { ...base, sku: `A-${uid()}`, name: "Bir" },
      { ...base, sku: `B-${uid()}`, name: "Ikki" },
    ];
    await applyPriceList(w.admin, items, { fetchImage });
    await applyPriceList(w.admin, items, { fetchImage });
    expect(calls).toBe(1);
    const urls = (await db.product.findMany({ where: { distributorId: w.dist.id, sku: { in: items.map((i) => i.sku) } } })).map((p) => p.imageUrl);
    expect(new Set(urls).size).toBe(1);
  });

  it("2000 ta tovar va 2 narx guruhi bir necha so'rovda yoziladi", async () => {
    const w = await makeWorld();
    await db.priceGroup.create({ data: { distributorId: w.dist.id, name: "Ulgurji" } });
    const items = Array.from({ length: 2000 }, (_, i) => ({
      sku: `P-${i}`,
      name: `Tovar ${i}`,
      brand: "B",
      category: "T",
      unit: "dona",
      packSize: 6,
      price: 1000 + i,
      barcode: null,
      minOrderPacks: 1,
      inStock: true,
      imageUrl: null,
      extraPrices: { Ulgurji: 900 + i },
    }));
    const started = Date.now();
    const res = await applyPriceList(w.admin, items);
    expect(Date.now() - started).toBeLessThan(20_000);
    expect(res).toMatchObject({ items: 2000, deactivated: 1 });
    expect(await db.price.count({ where: { product: { distributorId: w.dist.id, active: true } } })).toBe(4000);
    const p = await db.product.findFirstOrThrow({ where: { distributorId: w.dist.id, sku: "P-7" }, include: { prices: { include: { priceGroup: true } } } });
    expect(Object.fromEntries(p.prices.map((x) => [x.priceGroup.name, x.price]))).toEqual({ Oddiy: 1007, Ulgurji: 907 });
  });
});

describe("8. buyurtma takrorlanmaydi", () => {
  it("do'kon: bir xil kalit bilan qayta va parallel yuborilgan buyurtma bitta", async () => {
    const w = await makeWorld();
    const body = { distributorId: w.dist.id, paymentType: "CASH", items: [{ productId: w.product.id, qty: 2 }], clientKey: `o-${uid()}` };
    const r = await settle(Array.from({ length: 5 }, () => shopOrders.POST(req("/api/shop/orders", { token: w.owner.token, body }))));
    const ids = await Promise.all(r.ok.map(async (x) => ((await x.json()) as { id: string }).id));
    expect(new Set(ids).size).toBe(1);
    expect(await db.order.count({ where: { shopLinkId: w.link.id } })).toBe(1);
    // Kalitsiz: har biri alohida buyurtma (eski ilova versiyasi)
    await shopOrders.POST(req("/api/shop/orders", { token: w.owner.token, body: { ...body, clientKey: undefined } }));
    expect(await db.order.count({ where: { shopLinkId: w.link.id } })).toBe(2);
  });

  it("agent: kalit boshqa do'kon buyurtmasi uchun ishlatilmaydi", async () => {
    const w = await makeWorld({ agentId: undefined });
    await db.shopLink.update({ where: { id: w.link.id }, data: { agentId: w.agent.id } });
    const second = await makeLink((await makeShop()).id, w.dist.id, { agentId: w.agent.id });
    const clientKey = `a-${uid()}`;
    const items = [{ productId: w.product.id, qty: 1 }];
    const first = await staffOrders.POST(req("/api/staff/orders", { token: w.agent.token, body: { linkId: w.link.id, paymentType: "CASH", items, clientKey } }));
    const repeat = await staffOrders.POST(req("/api/staff/orders", { token: w.agent.token, body: { linkId: w.link.id, paymentType: "CASH", items, clientKey } }));
    expect(((await repeat.json()) as { id: string }).id).toBe(((await first.json()) as { id: string }).id);
    expect((await staffOrders.POST(req("/api/staff/orders", { token: w.agent.token, body: { linkId: second.id, paymentType: "CASH", items, clientKey } }))).status).toBe(409);
  });
});

describe("9. tasdiqlangan distribyutor nomini o'zi o'zgartira olmaydi", () => {
  it("faol: nom va STIR o'zgarmaydi, boshqa sozlamalar o'zgaradi; tekshiruvdagisi o'zgartira oladi", async () => {
    const w = await makeWorld();
    const set = (token: string, body: object) => staffSettings.PATCH(req("/api/staff/settings", { method: "PATCH", token, body }));
    expect((await set(w.admin.token, { name: "Coca-Cola rasmiy" })).status).toBe(403);
    expect((await set(w.admin.token, { inn: "123456789" })).status).toBe(403);
    expect((await set(w.admin.token, { name: w.dist.name, minOrder: 50_000 })).status).toBe(200);
    expect((await db.distributor.findUniqueOrThrow({ where: { id: w.dist.id } })).minOrder).toBe(50_000);

    const pending = await makeDistributor({ status: "PENDING" });
    const admin = await makeStaff(pending.id, "ADMIN");
    expect((await set(admin.token, { name: "Yangi nom MChJ" })).status).toBe(200);
  });
});

describe("10. qarz hisobi: ko'p do'konda faqat qarzdorlarning yozuvi yuklanadi", () => {
  it("natija butun daftardan hisoblangan bilan bir xil", async () => {
    const w = await makeWorld({ creditLimit: 1_000_000 });
    const shops = await Promise.all([1, 2, 3].map(() => makeShop()));
    const [settled, overpaid, reversed] = await Promise.all(shops.map((s) => makeLink(s.id, w.dist.id, { creditLimit: 500_000 })));
    await debt(w.link.id, 300_000, 30, 16);
    await debt(w.link.id, 200_000, 5, -9);
    await db.ledgerEntry.create({ data: { shopLinkId: w.link.id, type: "PAYMENT", amount: -100_000, channel: "CASH", createdBy: "x" } });
    await db.ledgerEntry.create({ data: { shopLinkId: w.link.id, type: "PAYMENT", amount: -5_000, channel: "CARD_RECEIPT", status: "PENDING", createdBy: "x" } });
    await debt(settled.id, 100_000, 10, 2);
    await db.ledgerEntry.create({ data: { shopLinkId: settled.id, type: "PAYMENT", amount: -100_000, channel: "CASH", createdBy: "x" } });
    await db.ledgerEntry.create({ data: { shopLinkId: overpaid.id, type: "PAYMENT", amount: -50_000, channel: "CASH", createdBy: "x" } });
    const d = await debt(reversed.id, 70_000, 40, 30);
    await db.ledgerEntry.create({ data: { shopLinkId: reversed.id, type: "ADJUSTMENT", amount: -70_000, reversesId: d.id, createdBy: "x" } });
    await debt(reversed.id, 10_000, 3, 1);

    const links = [w.link, settled, overpaid, reversed];
    const facts = await ledgerFacts(links.map((l) => l.id));
    for (const l of links) {
      const all = await db.ledgerEntry.findMany({ where: { shopLinkId: l.id } });
      expect(summarize(facts.get(l.id)!, [], l.creditLimit)).toEqual(summarize(factsFrom(all), [], l.creditLimit));
    }
    expect(facts.get(settled.id)!.entries).toEqual([]);
    expect(summarize(facts.get(overpaid.id)!, [], 500_000).debt).toBe(-50_000);
    expect(summarize(facts.get(reversed.id)!, [], 500_000)).toMatchObject({ debt: 10_000, overdueDays: 1 });
  });
});

describe("11. mobil sessiyani uzaytirish", () => {
  it("yaroqli token yangilanadi; yopilgan sessiya va telefon tokeni yangilanmaydi", async () => {
    const w = await makeWorld();
    const res = await refresh.POST(req("/api/auth/refresh", { token: w.owner.token, body: {} }));
    expect(res.status).toBe(200);
    const { token } = (await res.json()) as { token: string };
    expect(verifyToken(token)).toMatchObject({ kind: "shop", shopUserId: w.owner.id });
    expect(verifyToken(token)!.exp).toBeGreaterThan(Date.now() / 1000 + 29 * 24 * 3600);

    await db.shopUser.update({ where: { id: w.owner.id }, data: { sessionsValidAfter: new Date(Date.now() + 1000) } });
    expect((await refresh.POST(req("/api/auth/refresh", { token: w.owner.token, body: {} }))).status).toBe(401);
    expect((await refresh.POST(req("/api/auth/refresh", { token: tokens.phone(phone()), body: {} }))).status).toBe(401);
    const staff = await refresh.POST(req("/api/auth/refresh", { token: w.courier.token, body: {} }));
    expect(verifyToken(((await staff.json()) as { token: string }).token)).toMatchObject({ kind: "staff", staffId: w.courier.id });
  });
});

describe("12. agent kiritgan do'kon nomi", () => {
  it("egasining bir nechta do'konidan nomi moslari tanlanadi, mos kelmasa taxmin qilinmaydi", async () => {
    const w = await makeWorld();
    const first = await makeShop({ name: "Birinchi do'kon" });
    const second = await makeShop({ name: "Ikkinchi Do'kon" });
    await db.shopUser.update({ where: { id: second.owner.id }, data: { phone: first.owner.phone } });

    const res = await staffShops.POST(req("/api/staff/shops", { token: w.agent.token, body: shopBody(first.owner.phone, "ikkinchi do'kon") }));
    const body = (await res.json()) as { linkId: string; invited: boolean; existingShop: boolean };
    expect(body).toMatchObject({ invited: true, existingShop: true });
    expect((await db.shopLink.findUniqueOrThrow({ where: { id: body.linkId } })).shopId).toBe(second.id);
    expect((await staffShops.POST(req("/api/staff/shops", { token: w.agent.token, body: shopBody(first.owner.phone, "Uchinchi") }))).status).toBe(400);
  });

  it("egasining bitta do'koni bo'lsa, nomi boshqacha yozilsa ham o'shanga taklif", async () => {
    const w = await makeWorld();
    const shop = await makeShop({ name: "Asl nom" });
    const res = await staffShops.POST(req("/api/staff/shops", { token: w.agent.token, body: shopBody(shop.owner.phone, "Boshqa nom") }));
    const body = (await res.json()) as { linkId: string; existingShop: boolean };
    expect(body.existingShop).toBe(true);
    expect((await db.shopLink.findUniqueOrThrow({ where: { id: body.linkId }, include: { shop: true } })).shop.name).toBe("Asl nom");
  });
});

describe("13. egasi qolmagan do'kon", () => {
  it("ulanishlar bloklanadi: buyurtma yozilmaydi, qarz va to'lov ko'rinadi", async () => {
    const w = await makeWorld();
    const other = await makeDistributor();
    const invited = await makeLink(w.shop.id, other.id, { status: "INVITED" });
    await debt(w.link.id, 40_000);
    await deleteAccount({ kind: "shop", id: w.owner.id });

    expect((await db.shopLink.findUniqueOrThrow({ where: { id: w.link.id } })).status).toBe("BLOCKED");
    expect(await db.shopLink.findUnique({ where: { id: invited.id } })).toBeNull();
    const order = await staffOrders.POST(req("/api/staff/orders", { token: w.admin.token, body: { linkId: w.link.id, paymentType: "CASH", items: [{ productId: w.product.id, qty: 1 }] } }));
    expect(order.status).toBe(403);
    expect((await staffPayments.POST(req("/api/staff/payments", { token: w.admin.token, body: { linkId: w.link.id, amount: 40_000, channel: "CASH" } }))).status).toBe(200);
    expect(await balanceOf(w.link.id)).toBe(0);
  });

  it("sotuvchi qolsa do'kon ishlayveradi", async () => {
    const w = await makeWorld();
    await db.shopUser.create({ data: { shopId: w.shop.id, name: "Sotuvchi", phone: phone(), role: "SELLER" } });
    await deleteAccount({ kind: "shop", id: w.owner.id });
    expect((await db.shopLink.findUniqueOrThrow({ where: { id: w.link.id } })).status).toBe("ACTIVE");
  });
});

describe("14. SMS kodning maqsadi", () => {
  it("kirish kodi bilan hisob o'chmaydi; o'chirish kodi bilan kirib bo'lmaydi", async () => {
    const w = await makeWorld();
    const p = w.owner.phone;
    expect((await accountDelete.POST(req("/api/account/delete", { token: w.owner.token, body: {} }))).status).toBe(400);

    const del = (await (await accountDeleteCode.POST(req("/api/account/delete/code", { token: w.owner.token, body: {} }))).json()) as { devCode: string; phone: string };
    expect(del.phone).toBe(p);
    // Bir daqiqadan keyin (qayta yuborish cheklovi) kirish kodi ham so'raladi
    const login = await issueOtp(p, null, new Date(Date.now() + 2 * 60 * 1000));
    await expect(verifyOtp(p, del.devCode)).rejects.toMatchObject({ status: 400 });

    expect((await accountDelete.POST(req("/api/account/delete", { token: w.owner.token, body: { code: login } }))).status).toBe(400);
    expect(await db.shopUser.findUnique({ where: { id: w.owner.id } })).not.toBeNull();
    expect((await accountDelete.POST(req("/api/account/delete", { token: w.owner.token, body: { code: del.devCode } }))).status).toBe(200);
    expect(await db.shopUser.findUnique({ where: { id: w.owner.id } })).toBeNull();
  });

  it("admin kodi faqat admin uchun", async () => {
    const p = phone();
    const code = await issueOtp(p, null, new Date(), undefined, "admin");
    await expect(verifyOtp(p, code)).rejects.toMatchObject({ status: 400 });
    await expect(verifyOtp(p, code, new Date(), "admin")).resolves.toBeUndefined();
  });
});

describe("15. tasdiqlanmagan tashkilot katalog va statistikani ko'rmaydi", () => {
  it("tovar egasi distribyutorlar ro'yxatini, distribyutor tovar egalarini ko'rmaydi", async () => {
    await makeDistributor();
    const brand = await db.brand.create({ data: { name: `Brend ${uid()}`, categories: ["Ichimlik"], status: "PENDING", users: { create: { name: "Ega", phone: phone() } } }, include: { users: true } });
    const list = (await (await brandDistributors.GET(req("/api/brand/distributors", { token: tokens.brand(brand.users[0].id) }))).json()) as { pending: boolean; distributors: unknown[] };
    expect(list).toMatchObject({ pending: true, distributors: [] });

    const active = await db.brand.create({ data: { name: `Brend ${uid()}`, categories: ["Ichimlik"], status: "ACTIVE" } });
    const dist = await makeDistributor({ status: "PENDING" });
    const admin = await makeStaff(dist.id, "ADMIN");
    const brands = (await (await staffBrands.GET(req("/api/staff/brands", { token: admin.token }))).json()) as { pending: boolean; brands: unknown[] };
    expect(brands).toMatchObject({ pending: true, brands: [] });
    expect((await staffBrand.GET(req(`/api/staff/brands/${active.id}`, { token: admin.token }), ctx({ id: active.id }))).status).toBe(403);
  });
});

describe("16. Payme: band to'lovga CheckPerformTransaction ruxsat bermaydi", () => {
  it("tranzaksiya kutilayotganda -31052", async () => {
    const w = await makeWorld();
    const KEY = "payme-kalit";
    const auth = `Basic ${Buffer.from(`Paycom:${KEY}`).toString("base64")}`;
    const method = await db.paymentMethod.create({ data: { distributorId: w.dist.id, type: "PAYME", merchantId: "m", secretKeyEnc: encryptSecret(KEY) } });
    const payment = await db.onlinePayment.create({ data: { shopLinkId: w.link.id, paymentMethodId: method.id, provider: "PAYME", amount: 1000 } });
    const call = async (name: string, params: object) => (await handlePayme(method.id, auth, { id: 1, method: name, params })) as { result?: unknown; error?: { code: number } };
    const check = { amount: 100_000, account: { order_id: payment.id } };
    expect((await call("CheckPerformTransaction", check)).result).toEqual({ allow: true });
    await call("CreateTransaction", { id: `t-${uid()}`, time: Date.now(), ...check });
    expect((await call("CheckPerformTransaction", check)).error?.code).toBe(-31052);
  });
});

describe("17. do'kon sotuvchilari", () => {
  it("egasi qo'shadi va olib tashlaydi; sotuvchi jamoani boshqarmaydi", async () => {
    const w = await makeWorld();
    const p = phone();
    expect((await shopTeam.POST(req("/api/shop/team", { token: w.owner.token, body: { name: "Ali", phone: p } }))).status).toBe(200);
    expect((await shopTeam.POST(req("/api/shop/team", { token: w.owner.token, body: { name: "Ali", phone: p } }))).status).toBe(400);
    const seller = await db.shopUser.findFirstOrThrow({ where: { shopId: w.shop.id, phone: p } });
    expect(seller.role).toBe("SELLER");

    const sellerToken = tokens.shop(seller.id);
    expect((await shopHome.GET(req("/api/shop/home", { token: sellerToken }))).status).toBe(200);
    expect((await shopTeam.GET(req("/api/shop/team", { token: sellerToken }))).status).toBe(403);
    expect((await shopTeam.POST(req("/api/shop/team", { token: sellerToken, body: { name: "Vali", phone: phone() } }))).status).toBe(403);
    expect((await shopTeamMember.DELETE(req(`/api/shop/team/${w.owner.id}`, { method: "DELETE", token: w.owner.token }), ctx({ id: w.owner.id }))).status).toBe(404);

    const team = (await (await shopTeam.GET(req("/api/shop/team", { token: w.owner.token }))).json()) as { team: { id: string; role: string }[] };
    expect(team.team.map((u) => u.role)).toEqual(["OWNER", "SELLER"]);

    expect((await shopTeamMember.DELETE(req(`/api/shop/team/${seller.id}`, { method: "DELETE", token: w.owner.token }), ctx({ id: seller.id }))).status).toBe(200);
    expect((await shopHome.GET(req("/api/shop/home", { token: sellerToken }))).status).toBe(401);
    // Boshqa do'konning sotuvchisini olib tashlab bo'lmaydi
    const other = await makeWorld();
    const foreign = await db.shopUser.create({ data: { shopId: other.shop.id, name: "Begona", phone: phone(), role: "SELLER" } });
    expect((await shopTeamMember.DELETE(req(`/api/shop/team/${foreign.id}`, { method: "DELETE", token: w.owner.token }), ctx({ id: foreign.id }))).status).toBe(404);
  });
});
