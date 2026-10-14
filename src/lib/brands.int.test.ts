import { describe, expect, it } from "vitest";
import { createBrandOrder, importBrandProduct, moveBrandOrder, proposeAgreement, respondAgreement } from "./brands";
import { db } from "./db";
import { makeDistributor, makeStaff, settle, uid } from "@/test/factory";

async function setup() {
  const dist = await makeDistributor();
  const admin = await makeStaff(dist.id, "ADMIN");
  const brand = await db.brand.create({ data: { name: `Brend ${uid()}`, categories: ["Ichimlik"], status: "ACTIVE" } });
  const bp = await db.brandProduct.create({ data: { brandId: brand.id, name: "Sharbat", category: "Ichimlik", packSize: 6, price: 10_000 } });
  return { dist, admin, brand, bp };
}

describe("tovar egasi va distribyutor kelishuvi", () => {
  it("ikki marta bosilsa ham bitta taklif", async () => {
    const s = await setup();
    const r = await settle([1, 2, 3].map(() => proposeAgreement("DISTRIBUTOR", s.brand.id, s.dist.id, { districts: [], discountPercent: 5 }, "test")));
    expect(r.ok).toHaveLength(1);
    expect(await db.agreement.count({ where: { brandId: s.brand.id, distributorId: s.dist.id } })).toBe(1);
  });

  it("o'z taklifiga javob berib bo'lmaydi; qabul va rad bir vaqtda kelsa bittasi o'tadi", async () => {
    const s = await setup();
    const a = await proposeAgreement("BRAND", s.brand.id, s.dist.id, { districts: [], discountPercent: 10 }, "test");
    await expect(respondAgreement("BRAND", s.brand.id, a.id, "accept", "test")).rejects.toMatchObject({ status: 400 });
    const r = await settle([respondAgreement("DISTRIBUTOR", s.dist.id, a.id, "accept", "x"), respondAgreement("DISTRIBUTOR", s.dist.id, a.id, "reject", "y")]);
    expect(r.ok).toHaveLength(1);
    expect(await db.auditLog.count({ where: { entityId: a.id, action: { in: ["agreement.accept", "agreement.reject"] } } })).toBe(1);
  });

  it("katalogga qo'shish, xarid buyurtmasi chegirma bilan; kelishuv tugasa tovar katalogdan olinadi", async () => {
    const s = await setup();
    const a = await proposeAgreement("BRAND", s.brand.id, s.dist.id, { districts: [], discountPercent: 10 }, "test");
    await respondAgreement("DISTRIBUTOR", s.dist.id, a.id, "accept", "test");

    const product = await importBrandProduct(s.admin, a.id, { brandProductId: s.bp.id, price: 12_000, minOrderPacks: 1 });
    expect(product.active).toBe(true);
    const order = await createBrandOrder(s.admin, { agreementId: a.id, items: [{ brandProductId: s.bp.id, qty: 12 }] });
    expect(order.total).toBe(12 * 9_000);
    await expect(createBrandOrder(s.admin, { agreementId: a.id, items: [{ brandProductId: s.bp.id, qty: 5 }] })).rejects.toMatchObject({ status: 400 });

    await respondAgreement("BRAND", s.brand.id, a.id, "end", "test");
    expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).active).toBe(false);
    await expect(createBrandOrder(s.admin, { agreementId: a.id, items: [{ brandProductId: s.bp.id, qty: 6 }] })).rejects.toMatchObject({ status: 400 });
  });

  it("xarid buyurtmasi: tomonlar faqat o'z o'tishlarini qiladi, to'qnashuvda bittasi o'tadi", async () => {
    const s = await setup();
    const a = await proposeAgreement("DISTRIBUTOR", s.brand.id, s.dist.id, { districts: [], discountPercent: 0 }, "test");
    await respondAgreement("BRAND", s.brand.id, a.id, "accept", "test");
    const order = await createBrandOrder(s.admin, { agreementId: a.id, items: [{ brandProductId: s.bp.id, qty: 6 }] });

    await expect(moveBrandOrder("DISTRIBUTOR", s.dist.id, order.id, "ACCEPTED")).rejects.toMatchObject({ status: 400 });
    const other = await makeDistributor();
    await expect(moveBrandOrder("DISTRIBUTOR", other.id, order.id, "CANCELLED")).rejects.toMatchObject({ status: 404 });

    const r = await settle([moveBrandOrder("BRAND", s.brand.id, order.id, "ACCEPTED"), moveBrandOrder("DISTRIBUTOR", s.dist.id, order.id, "CANCELLED")]);
    expect(r.ok).toHaveLength(1);
    expect(r.errors[0]).toMatchObject({ status: 409 });
    expect((await db.brandOrder.findUniqueOrThrow({ where: { id: order.id } })).status).toBe(r.ok[0].status);
  });
});
