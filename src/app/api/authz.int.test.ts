// Route darajasida ruxsatlar: har rol faqat o'ziga tegishli amalni qila oladi, begona ma'lumotni ko'rmaydi
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { ctx, makeOrder, makeShop, makeStaff, makeWorld, req, tokens, uid } from "@/test/factory";
import * as shopCancel from "./shop/orders/[id]/cancel/route";
import * as shopPayments from "./shop/payments/route";
import * as staffOrder from "./staff/orders/[id]/route";
import * as staffOrders from "./staff/orders/route";
import * as staffPayment from "./staff/payments/[id]/route";
import * as staffPayments from "./staff/payments/route";
import * as staffProducts from "./staff/products/route";
import * as staffRequest from "./staff/requests/[id]/route";
import * as staffShop from "./staff/shops/[linkId]/route";
import * as staffShops from "./staff/shops/route";
import * as staffTeam from "./staff/team/route";
import * as staffTeamMember from "./staff/team/[id]/route";
import * as files from "./files/[folder]/[name]/route";
import * as brandOrder from "./brand/orders/[id]/route";

type World = Awaited<ReturnType<typeof makeWorld>>;
const roles = ["admin", "operator", "accountant", "agent", "courier"] as const;

async function statusFor(w: World, call: (token: string) => Promise<Response>) {
  const out: Record<string, number> = {};
  for (const r of roles) out[r] = (await call(w[r].token)).status;
  return out;
}

describe("xodim rollari", () => {
  it("do'kon kartasi (qarz daftari): agent va yetkazuvchi faqat o'z do'konini ko'radi", async () => {
    const w = await makeWorld();
    const open = (t: string) => staffShop.GET(req(`/api/staff/shops/${w.link.id}`, { token: t }), ctx({ linkId: w.link.id }));
    expect(await statusFor(w, open)).toEqual({ admin: 200, operator: 200, accountant: 200, agent: 404, courier: 404 });

    await db.shopLink.update({ where: { id: w.link.id }, data: { agentId: w.agent.id } });
    await makeOrder(w, { status: "IN_DELIVERY", courierId: w.courier.id });
    expect(await statusFor(w, open)).toEqual({ admin: 200, operator: 200, accountant: 200, agent: 200, courier: 200 });

    const other = await makeWorld();
    expect((await open(other.admin.token)).status).toBe(404);
    expect((await open(w.owner.token)).status).toBe(401);
    expect((await open("")).status).toBe(401);
  });

  it("nasiya shartlarini faqat admin o'zgartiradi", async () => {
    const w = await makeWorld();
    const patch = (t: string) => staffShop.PATCH(req(`/api/staff/shops/${w.link.id}`, { method: "PATCH", token: t, body: { creditLimit: 5_000_000 } }), ctx({ linkId: w.link.id }));
    expect(await statusFor(w, patch)).toEqual({ admin: 200, operator: 403, accountant: 403, agent: 403, courier: 403 });
  });

  it("chekni faqat admin va hisobchi ko'rib chiqadi", async () => {
    const w = await makeWorld();
    const review = async (t: string) => {
      const e = await db.ledgerEntry.create({ data: { shopLinkId: w.link.id, type: "PAYMENT", amount: -1000, status: "PENDING", channel: "CARD_RECEIPT", createdBy: "test" } });
      return staffPayment.POST(req(`/api/staff/payments/${e.id}`, { token: t, body: { action: "confirm" } }), ctx({ id: e.id }));
    };
    expect(await statusFor(w, review)).toEqual({ admin: 200, operator: 403, accountant: 200, agent: 403, courier: 403 });
  });

  it("to'lovlar ro'yxatini agent va yetkazuvchi ko'rmaydi", async () => {
    const w = await makeWorld();
    const list = (t: string) => staffPayments.GET(req("/api/staff/payments", { token: t }));
    expect(await statusFor(w, list)).toEqual({ admin: 200, operator: 200, accountant: 200, agent: 403, courier: 403 });
  });

  it("buyurtma holati: yetkazuvchi faqat topshiradi, agent va hisobchi o'zgartirmaydi", async () => {
    const w = await makeWorld();
    const move = async (t: string, to: string, status: "SENT" | "IN_DELIVERY" = "SENT") => {
      const o = await makeOrder(w, { status });
      return staffOrder.POST(req(`/api/staff/orders/${o.id}`, { token: t, body: { to } }), ctx({ id: o.id }));
    };
    expect(await statusFor(w, (t) => move(t, "ACCEPTED"))).toEqual({ admin: 200, operator: 200, accountant: 403, agent: 403, courier: 404 });
    expect((await move(w.courier.token, "DELIVERED", "IN_DELIVERY")).status).toBe(200);

    const other = await makeStaff(w.dist.id, "COURIER");
    const assigned = await makeOrder(w, { status: "IN_DELIVERY", courierId: other.id });
    const res = await staffOrder.POST(req(`/api/staff/orders/${assigned.id}`, { token: w.courier.token, body: { to: "DELIVERED" } }), ctx({ id: assigned.id }));
    expect(res.status).toBe(404);
  });

  it("agent faqat o'z do'koni nomidan buyurtma oladi", async () => {
    const w = await makeWorld();
    const create = () => staffOrders.POST(req("/api/staff/orders", { token: w.agent.token, body: { linkId: w.link.id, paymentType: "CASH", items: [{ productId: w.product.id, qty: 1 }] } }));
    expect((await create()).status).toBe(404);
    await db.shopLink.update({ where: { id: w.link.id }, data: { agentId: w.agent.id } });
    expect((await create()).status).toBe(200);
  });

  it("ulanish so'rovini faqat admin hal qiladi", async () => {
    const w = await makeWorld();
    const decide = async (t: string) => {
      const shop = await makeShop();
      const link = await db.shopLink.create({ data: { shopId: shop.id, distributorId: w.dist.id, status: "REQUESTED", source: "SEARCH" } });
      return staffRequest.POST(req(`/api/staff/requests/${link.id}`, { token: t, body: { action: "reject" } }), ctx({ id: link.id }));
    };
    expect(await statusFor(w, decide)).toEqual({ admin: 200, operator: 403, accountant: 403, agent: 403, courier: 403 });
  });

  it("xodimlarni faqat admin boshqaradi va kamida bitta admin qoladi", async () => {
    const w = await makeWorld();
    expect(await statusFor(w, (t) => staffTeam.GET(req("/api/staff/team", { token: t })))).toEqual({ admin: 200, operator: 403, accountant: 403, agent: 403, courier: 403 });

    const second = await makeStaff(w.dist.id, "ADMIN");
    const demote = (by: { token: string }, id: string) => staffTeamMember.PATCH(req(`/api/staff/team/${id}`, { method: "PATCH", token: by.token, body: { role: "OPERATOR" } }), ctx({ id }));
    const results = await Promise.all([demote(w.admin, second.id), demote(second, w.admin.id)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
    expect(await db.staff.count({ where: { distributorId: w.dist.id, role: "ADMIN", active: true } })).toBe(1);
  });
});

describe("ikki marta bosish", () => {
  it("bir artikulli tovar va bir raqamli xodim bir marta qo'shiladi, 500 xato yo'q", async () => {
    const w = await makeWorld();
    const sku = `SKU-${uid()}`;
    const product = { sku, name: "Yangi tovar", brand: "B", category: "Ichimlik", packSize: 1, price: 1000 };
    const p = await Promise.all([1, 2, 3].map(() => staffProducts.POST(req("/api/staff/products", { token: w.operator.token, body: product }))));
    expect(p.map((r) => r.status).sort()).toEqual([200, 400, 400]);

    const member = { name: "Yangi agent", phone: `+99895${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`, role: "AGENT" };
    const t = await Promise.all([1, 2, 3].map(() => staffTeam.POST(req("/api/staff/team", { token: w.admin.token, body: member }))));
    expect(t.map((r) => r.status).sort()).toEqual([200, 400, 400]);
  });
});

describe("do'kon qo'shish", () => {
  it("bloklangan do'konni agent qayta faollashtira olmaydi, admin oladi", async () => {
    const w = await makeWorld({ status: "BLOCKED" });
    const body = { shopName: "Do'kon", address: "Bunyodkor 1", district: "Chilonzor", ownerName: "Ega", phone: w.owner.phone };
    expect((await staffShops.POST(req("/api/staff/shops", { token: w.agent.token, body }))).status).toBe(403);
    expect((await staffShops.POST(req("/api/staff/shops", { token: w.operator.token, body }))).status).toBe(403);
    expect((await db.shopLink.findUniqueOrThrow({ where: { id: w.link.id } })).status).toBe("BLOCKED");
    expect((await staffShops.POST(req("/api/staff/shops", { token: w.admin.token, body }))).status).toBe(200);
  });

  it("bir raqamga bir vaqtda ikki marta qo'shilsa bitta do'kon yaratiladi", async () => {
    const w = await makeWorld();
    const p = `+99897${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
    const body = { shopName: `Yangi ${uid()}`, address: "Bunyodkor 2", district: "Chilonzor", ownerName: "Ega", phone: p };
    const results = await Promise.all([1, 2, 3].map(() => staffShops.POST(req("/api/staff/shops", { token: w.agent.token, body }))));
    expect(results.map((r) => r.status).sort()).toEqual([200, 400, 400]);
    expect(await db.shopUser.count({ where: { phone: p } })).toBe(1);
  });
});

describe("do'kon va tovar egasi", () => {
  it("do'kon boshqa do'kon buyurtmasini bekor qila olmaydi", async () => {
    const w = await makeWorld();
    const other = await makeShop();
    const o = await makeOrder(w);
    expect((await shopCancel.POST(req(`/api/shop/orders/${o.id}/cancel`, { token: other.owner.token, body: {} }), ctx({ id: o.id }))).status).toBe(404);
    expect((await shopCancel.POST(req(`/api/shop/orders/${o.id}/cancel`, { token: w.owner.token, body: {} }), ctx({ id: o.id }))).status).toBe(200);
  });

  it("do'kon ulanmagan distribyutorning to'lov rekvizitlarini ko'rmaydi", async () => {
    const w = await makeWorld();
    const other = await makeShop();
    expect((await shopPayments.GET(req(`/api/shop/payments?distributorId=${w.dist.id}`, { token: other.owner.token }))).status).toBe(403);
    expect((await shopPayments.GET(req(`/api/shop/payments?distributorId=${w.dist.id}`, { token: w.owner.token }))).status).toBe(200);
  });

  it("tovar egasi boshqa tovar egasining buyurtmasini ko'rmaydi", async () => {
    const w = await makeWorld();
    const mk = async () => {
      const brand = await db.brand.create({ data: { name: `B ${uid()}`, categories: [], status: "ACTIVE", users: { create: { name: "Ega", phone: "+998900000000" } } }, include: { users: true } });
      return { brand, token: tokens.brand(brand.users[0].id) };
    };
    const [mine, theirs] = await Promise.all([mk(), mk()]);
    const a = await db.agreement.create({ data: { brandId: mine.brand.id, distributorId: w.dist.id, status: "ACTIVE", initiatedBy: "BRAND" } });
    const o = await db.brandOrder.create({ data: { agreementId: a.id, brandId: mine.brand.id, distributorId: w.dist.id, total: 1 } });
    expect((await brandOrder.GET(req(`/api/brand/orders/${o.id}`, { token: theirs.token }), ctx({ id: o.id }))).status).toBe(404);
    expect((await brandOrder.GET(req(`/api/brand/orders/${o.id}`, { token: mine.token }), ctx({ id: o.id }))).status).toBe(200);
  });
});

describe("chek fayli", () => {
  it("faqat o'sha do'kon va uni ko'ra oladigan xodimlar ochadi", async () => {
    const w = await makeWorld();
    const name = `${Buffer.from(uid().padEnd(16, "0").slice(0, 16)).toString("hex")}.png`;
    await db.storedFile.create({ data: { path: `receipts/${name}`, type: "image/png", data: Buffer.from([1, 2, 3]) } });
    await db.ledgerEntry.create({ data: { shopLinkId: w.link.id, type: "PAYMENT", amount: -1, status: "PENDING", channel: "CARD_RECEIPT", receiptUrl: `/api/files/receipts/${name}`, createdBy: "test" } });
    const open = (t: string) => files.GET(req(`/api/files/receipts/${name}`, { token: t }), ctx({ folder: "receipts", name }));

    expect((await open(w.owner.token)).status).toBe(200);
    expect((await open((await makeShop()).owner.token)).status).toBe(403);
    expect(await statusFor(w, open)).toEqual({ admin: 200, operator: 200, accountant: 200, agent: 403, courier: 403 });
    expect((await open((await makeWorld()).admin.token)).status).toBe(403);
  });
});
