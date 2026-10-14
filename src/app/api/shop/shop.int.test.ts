// Do'kon ilovasining asosiy oqimi route'lar orqali: katalog, buyurtma, ro'yxat, qarz, distribyutor topish
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { makeDistributor, makeProduct, makeWorld, req, tokens } from "@/test/factory";
import * as catalog from "./catalog/route";
import * as debts from "./debts/route";
import * as distributors from "./distributors/route";
import * as home from "./home/route";
import * as orders from "./orders/route";

describe("do'kon ilovasi", () => {
  it("katalog, buyurtma, buyurtmalar ro'yxati va bosh sahifa", async () => {
    const w = await makeWorld({ creditLimit: 100_000 });
    const t = w.owner.token;

    const cat = await catalog.GET(req(`/api/shop/catalog?distributorId=${w.dist.id}`, { token: t }));
    expect(cat.status).toBe(200);
    const catBody = (await cat.json()) as { products: { id: string; price: number }[] };
    expect(catBody.products).toEqual([expect.objectContaining({ id: w.product.id, price: 1000 })]);

    const created = await orders.POST(req("/api/shop/orders", { token: t, body: { distributorId: w.dist.id, paymentType: "CREDIT", items: [{ productId: w.product.id, qty: 30 }] } }));
    expect(created.status).toBe(200);
    expect(await created.json()).toMatchObject({ total: 30_000 });

    const bad = await orders.POST(req("/api/shop/orders", { token: t, body: { distributorId: w.dist.id, items: [] } }));
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: "Buyurtma ma'lumotlari noto'g'ri" });
    // Ilova rus tilida bo'lsa, xato ham ruscha
    const badRu = await orders.POST(req("/api/shop/orders", { token: t, body: { distributorId: w.dist.id, items: [] }, headers: { "x-lang": "ru" } }));
    expect(await badRu.json()).toEqual({ error: "Неверные данные заказа" });

    const list = (await (await orders.GET(req("/api/shop/orders", { token: t }))).json()) as { orders: { total: number; status: string }[] };
    expect(list.orders).toEqual([expect.objectContaining({ total: 30_000, status: "SENT" })]);

    const h = (await (await home.GET(req("/api/shop/home", { token: t }))).json()) as { links: { creditAvailable: number }[] };
    expect(h.links[0].creditAvailable).toBe(70_000);
  });

  it("qarz ekrani faqat o'z yozuvlarini ko'rsatadi", async () => {
    const w = await makeWorld();
    const other = await makeWorld();
    await db.ledgerEntry.create({ data: { shopLinkId: w.link.id, type: "DEBT", amount: 5_000, createdBy: "test" } });
    await db.ledgerEntry.create({ data: { shopLinkId: other.link.id, type: "DEBT", amount: 9_000, createdBy: "test" } });
    const body = (await (await debts.GET(req("/api/shop/debts", { token: w.owner.token }))).json()) as { links: { debt: number }[]; entries: { amount: number }[] };
    expect(body.links.map((l) => l.debt)).toEqual([5_000]);
    expect(body.entries.map((e) => e.amount)).toEqual([5_000]);
  });

  it("distribyutor topish va ulanish so'rovi; sotuvchi so'rov yubora olmaydi", async () => {
    const w = await makeWorld();
    const fresh = await makeDistributor({ name: `Yangi distribyutor ${Date.now()}` });
    await makeProduct(fresh.id, fresh.defaultGroupId, { brand: "Noyob brend" });

    const found = (await (await distributors.GET(req(`/api/shop/distributors?q=${encodeURIComponent(fresh.name)}`, { token: w.owner.token }))).json()) as { distributors: { id: string }[] };
    expect(found.distributors.map((d) => d.id)).toEqual([fresh.id]);

    const seller = await db.shopUser.create({ data: { shopId: w.shop.id, name: "Sotuvchi", phone: "+998900000009", role: "SELLER" } });
    expect((await distributors.POST(req("/api/shop/distributors", { token: tokens.shop(seller.id), body: { distributorId: fresh.id } }))).status).toBe(403);
    const asked = await distributors.POST(req("/api/shop/distributors", { token: w.owner.token, body: { distributorId: fresh.id } }));
    expect(await asked.json()).toEqual({ status: "REQUESTED" });
  });
});
