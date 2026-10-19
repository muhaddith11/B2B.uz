// Ro'yxatlar jim kesilmaydi: sahifalar oxirigacha o'qiladi, takrorlanmaydi; jami ko'rsatkichlar butun ro'yxat bo'yicha.
// Kunlik tozalash faqat keraksiz narsani o'chiradi
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { cleanup } from "@/lib/cleanup";
import { db } from "@/lib/db";
import { ctx, makeLink, makeOrder, makeShop, makeWorld, req } from "@/test/factory";
import * as cron from "./cron/cleanup/route";
import * as shopDebts from "./shop/debts/route";
import * as shopOrders from "./shop/orders/route";
import * as staffShopLedger from "./staff/shops/[linkId]/ledger/route";
import * as staffOrders from "./staff/orders/route";
import * as staffPayments from "./staff/payments/route";
import * as staffShops from "./staff/shops/route";

const hex = () => randomBytes(16).toString("hex");
type Page<T> = { nextCursor: string | null } & Record<string, T[] | string | null>;

// Kursor bo'yicha barcha sahifalarni o'qish
async function readAll<T extends { id: string }>(call: (cursor: string | null) => Promise<Response>, key: string) {
  const all: T[] = [];
  let cursor: string | null = null;
  let pages = 0;
  do {
    const body = (await (await call(cursor)).json()) as Page<T>;
    all.push(...(body[key] as T[]));
    cursor = body.nextCursor;
    pages++;
  } while (cursor && pages < 50);
  return { all, pages };
}

describe("sahifalash", () => {
  it("xodim buyurtmalari: hammasi, bir martadan, tartib bilan", async () => {
    const w = await makeWorld();
    for (let i = 0; i < 7; i++) await makeOrder(w, { status: "DELIVERED" });
    const { all, pages } = await readAll<{ id: string; number: number }>(
      (c) => staffOrders.GET(req(`/api/staff/orders?status=DELIVERED&limit=3${c ? `&cursor=${c}` : ""}`, { token: w.admin.token })),
      "orders",
    );
    expect(pages).toBe(3);
    expect(all).toHaveLength(7);
    expect(new Set(all.map((o) => o.id)).size).toBe(7);
    expect(all.map((o) => o.number)).toEqual([...all.map((o) => o.number)].sort((a, b) => b - a));
  });

  it("do'kon buyurtmalari va qarz daftari ham sahifalanadi", async () => {
    const w = await makeWorld();
    for (let i = 0; i < 5; i++) await makeOrder(w);
    for (let i = 0; i < 5; i++) await db.ledgerEntry.create({ data: { shopLinkId: w.link.id, type: "DEBT", amount: 1000 + i, createdBy: "test" } });
    const orders = await readAll((c) => shopOrders.GET(req(`/api/shop/orders?limit=2${c ? `&cursor=${c}` : ""}`, { token: w.owner.token })), "orders");
    expect(orders.all).toHaveLength(5);
    const entries = await readAll((c) => shopDebts.GET(req(`/api/shop/debts?limit=2${c ? `&cursor=${c}` : ""}`, { token: w.owner.token })), "entries");
    expect(entries.all).toHaveLength(5);
    const card = await readAll((c) => staffShopLedger.GET(req(`/api/staff/shops/${w.link.id}/ledger?limit=2${c ? `&cursor=${c}` : ""}`, { token: w.admin.token }), ctx({ linkId: w.link.id })), "entries");
    expect(card.all).toHaveLength(5);
    // Boshqa distribyutor xodimi bu do'kon daftarini ololmaydi
    const other = await makeWorld();
    expect((await staffShopLedger.GET(req(`/api/staff/shops/${w.link.id}/ledger`, { token: other.admin.token }), ctx({ linkId: w.link.id }))).status).toBe(404);
  });

  it("tasdiq kutayotgan chek 100 dan ortiq tasdiqlangan to'lov orasida ham ko'rinadi", async () => {
    const w = await makeWorld();
    await db.ledgerEntry.createMany({
      data: Array.from({ length: 120 }, (_, i) => ({ shopLinkId: w.link.id, type: "PAYMENT" as const, amount: -(1000 + i), channel: "CASH" as const, createdBy: "test" })),
    });
    const pendingEntry = await db.ledgerEntry.create({
      data: { shopLinkId: w.link.id, type: "PAYMENT", amount: -5000, status: "PENDING", channel: "CARD_RECEIPT", createdBy: "test", date: new Date(Date.now() - 86_400_000) },
    });
    const body = (await (await staffPayments.GET(req("/api/staff/payments", { token: w.accountant.token }))).json()) as { pending: { id: string }[]; recent: unknown[]; nextCursor: string | null };
    expect(body.pending.map((p) => p.id)).toEqual([pendingEntry.id]);
    expect(body.recent).toHaveLength(50);
    expect(body.nextCursor).not.toBeNull();
  });

  it("do'konlar ro'yxati: sahifalab, jami soni va umumiy qarz hamma do'kon bo'yicha", async () => {
    const w = await makeWorld();
    for (let i = 0; i < 4; i++) {
      const s = await makeShop();
      const l = await makeLink(s.id, w.dist.id);
      await db.ledgerEntry.create({ data: { shopLinkId: l.id, type: "DEBT", amount: 10_000, createdBy: "test" } });
    }
    const first = (await (await staffShops.GET(req("/api/staff/shops?limit=2", { token: w.admin.token }))).json()) as { shops: unknown[]; total: number; totalDebt: number; nextOffset: number };
    expect(first).toMatchObject({ total: 5, totalDebt: 40_000, nextOffset: 2 });
    expect(first.shops).toHaveLength(2);
    const last = (await (await staffShops.GET(req("/api/staff/shops?limit=2&offset=4", { token: w.admin.token }))).json()) as { shops: unknown[]; nextOffset: number | null };
    expect(last.shops).toHaveLength(1);
    expect(last.nextOffset).toBeNull();
  });
});

describe("kunlik tozalash", () => {
  it("bir kundan eski SMS kodlar va biriktirilmagan fayllar o'chadi, kerakli fayl qoladi", async () => {
    const old = new Date(Date.now() - 2 * 86_400_000);
    const code = await db.otpCode.create({ data: { phone: "+998990000001", codeHash: "x", expiresAt: old, createdAt: old } });
    const fresh = await db.otpCode.create({ data: { phone: "+998990000001", codeHash: "y", expiresAt: new Date() } });
    const w = await makeWorld();
    const orphan = await db.storedFile.create({ data: { path: `receipts/${hex()}.jpg`, type: "image/jpeg", data: Buffer.from("x"), createdAt: old } });
    const used = await db.storedFile.create({ data: { path: `products/${hex()}.jpg`, type: "image/jpeg", data: Buffer.from("y"), createdAt: old } });
    await db.product.update({ where: { id: w.product.id }, data: { imageUrl: `/api/files/${used.path}` } });
    const recentOrphan = await db.storedFile.create({ data: { path: `logos/${hex()}.png`, type: "image/png", data: Buffer.from("z") } });

    const res = await cleanup();
    expect(res.otpCodes).toBeGreaterThanOrEqual(1);
    expect(await db.otpCode.findUnique({ where: { id: code.id } })).toBeNull();
    expect(await db.otpCode.findUnique({ where: { id: fresh.id } })).not.toBeNull();
    expect(await db.storedFile.findUnique({ where: { id: orphan.id } })).toBeNull();
    expect(await db.storedFile.findUnique({ where: { id: used.id } })).not.toBeNull();
    expect(await db.storedFile.findUnique({ where: { id: recentOrphan.id } })).not.toBeNull();
  });

  it("cron faqat CRON_SECRET bilan ishlaydi", async () => {
    process.env.CRON_SECRET = "cron-sinov-kaliti";
    try {
      expect((await cron.GET(req("/api/cron/cleanup"))).status).toBe(401);
      expect((await cron.GET(req("/api/cron/cleanup", { headers: { authorization: "Bearer boshqa" } }))).status).toBe(401);
      expect((await cron.GET(req("/api/cron/cleanup", { headers: { authorization: "Bearer cron-sinov-kaliti" } }))).status).toBe(200);
    } finally {
      delete process.env.CRON_SECRET;
    }
    expect((await cron.GET(req("/api/cron/cleanup", { headers: { authorization: "Bearer undefined" } }))).status).toBe(401);
  });
});
