import { describe, expect, it } from "vitest";
import { db } from "./db";
import { approveLink, discoverDistributors, rejectLink, requestLink } from "./links";
import { makeDistributor, makeLink, makeShop, makeStaff, settle, uid } from "@/test/factory";

describe("ulanish so'rovi", () => {
  it("ikki marta bosilsa ham bitta ulanish, xato yo'q", async () => {
    const dist = await makeDistributor();
    const shop = await makeShop();
    const r = await settle([1, 2, 3].map(() => requestLink(shop.id, dist.id)));
    expect(r.errors).toEqual([]);
    expect(new Set(r.ok.map((l) => l.id)).size).toBe(1);
    expect(await db.shopLink.count({ where: { shopId: shop.id, distributorId: dist.id } })).toBe(1);
  });

  it("tasdiqlanmagan distribyutorga, faol yoki bloklangan ulanishga so'rov bo'lmaydi", async () => {
    const pending = await makeDistributor({ status: "PENDING" });
    const shop = await makeShop();
    await expect(requestLink(shop.id, pending.id)).rejects.toMatchObject({ status: 404 });

    const active = await makeDistributor();
    await makeLink(shop.id, active.id);
    await expect(requestLink(shop.id, active.id)).rejects.toMatchObject({ status: 400 });

    const blocked = await makeDistributor();
    await makeLink(shop.id, blocked.id, { status: "BLOCKED" });
    await expect(requestLink(shop.id, blocked.id)).rejects.toMatchObject({ status: 403 });
  });

  it("admin tasdiqlaydi: narx guruhi va nasiya shartlari qo'yiladi; ikkinchi marta tasdiqlanmaydi", async () => {
    const dist = await makeDistributor();
    const admin = await makeStaff(dist.id, "ADMIN");
    const shop = await makeShop();
    const link = await requestLink(shop.id, dist.id);
    const input = { linkId: link.id, priceGroupId: dist.defaultGroupId, creditLimit: 500_000, creditDays: 10 };
    const r = await settle([approveLink(admin, input), approveLink(admin, input)]);
    expect(r.ok).toHaveLength(1);
    expect(await db.shopLink.findUniqueOrThrow({ where: { id: link.id } })).toMatchObject({ status: "ACTIVE", creditLimit: 500_000, creditDays: 10 });
  });

  it("boshqa distribyutorning narx guruhi yoki so'rovi bilan ishlamaydi", async () => {
    const dist = await makeDistributor();
    const other = await makeDistributor();
    const admin = await makeStaff(dist.id, "ADMIN");
    const otherAdmin = await makeStaff(other.id, "ADMIN");
    const shop = await makeShop();
    const link = await requestLink(shop.id, dist.id);
    await expect(approveLink(admin, { linkId: link.id, priceGroupId: other.defaultGroupId, creditLimit: 0, creditDays: 14 })).rejects.toMatchObject({ status: 400 });
    await expect(approveLink(otherAdmin, { linkId: link.id, priceGroupId: other.defaultGroupId, creditLimit: 0, creditDays: 14 })).rejects.toMatchObject({ status: 404 });
    await expect(rejectLink(otherAdmin, link.id)).rejects.toMatchObject({ status: 404 });
  });

  it("rad etilgan so'rov o'chadi va do'kon qayta so'ray oladi", async () => {
    const dist = await makeDistributor();
    const admin = await makeStaff(dist.id, "ADMIN");
    const shop = await makeShop();
    const link = await requestLink(shop.id, dist.id);
    await rejectLink(admin, link.id);
    expect(await db.shopLink.findUnique({ where: { id: link.id } })).toBeNull();
    await expect(requestLink(shop.id, dist.id)).resolves.toMatchObject({ status: "REQUESTED" });
  });

  it("qidiruvda faol ulanishdagi distribyutor ko'rinmaydi, so'ralgani belgilanadi, hududdagilar birinchi", async () => {
    const tag = uid();
    const shop = await makeShop();
    const linked = await makeDistributor({ name: `${tag} A` });
    const requested = await makeDistributor({ name: `${tag} B`, districts: ["Yunusobod"] });
    const serving = await makeDistributor({ name: `${tag} C` });
    await makeLink(shop.id, linked.id);
    await requestLink(shop.id, requested.id);
    const list = await discoverDistributors({ id: shop.id, district: shop.district }, { q: tag, category: "" });
    expect(list.map((d) => d.id)).toEqual([serving.id, requested.id]);
    expect(list.map((d) => d.requested)).toEqual([false, true]);
  });

  it("natija chegarasi to'lganda ham hududga yetkazadiganlar tushib qolmaydi", async () => {
    const tag = uid();
    const shop = await makeShop();
    await Promise.all(Array.from({ length: 101 }, (_, i) => makeDistributor({ name: `${tag} A${String(i).padStart(3, "0")}`, districts: ["Yunusobod"] })));
    const serving = await makeDistributor({ name: `${tag} Z` });
    const list = await discoverDistributors({ id: shop.id, district: shop.district }, { q: tag, category: "" });
    expect(list).toHaveLength(100);
    expect(list[0].id).toBe(serving.id);
  });
});
