import { z } from "zod";
import { db } from "./db";
import { HttpError } from "./session";

// Do'kon va distribyutor ulanishi: yangi do'kon distribyutor topadi, so'rov yuboradi, distribyutor tasdiqlaydi.

// O'z hududiga yetkazadiganlar birinchi, qolgani nomi bo'yicha
export function rankByDistrict<T extends { name: string; districts: string[] }>(list: T[], district: string) {
  return list
    .map((d) => ({ ...d, servesYou: d.districts.includes(district) }))
    .sort((a, b) => Number(b.servesYou) - Number(a.servesYou) || a.name.localeCompare(b.name));
}

// Tovarlar soni va eng ko'p tovari bor brendlar
export function brandStats(rows: { distributorId: string; brand: string; count: number }[], topN = 5) {
  const byDist = new Map<string, { productCount: number; brands: { brand: string; count: number }[] }>();
  for (const r of rows) {
    const s = byDist.get(r.distributorId) ?? { productCount: 0, brands: [] };
    s.productCount += r.count;
    s.brands.push({ brand: r.brand, count: r.count });
    byDist.set(r.distributorId, s);
  }
  return new Map(
    [...byDist].map(([id, s]) => [
      id,
      {
        productCount: s.productCount,
        brands: s.brands
          .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand))
          .slice(0, topN)
          .map((b) => b.brand),
      },
    ]),
  );
}

export const discoverQuery = z.object({
  q: z.string().trim().max(100).default(""),
  category: z.string().trim().max(100).default(""),
});

// Do'kon hali ulanmagan faol distribyutorlar. Qidiruv nomi, tovar nomi va brend bo'yicha.
export async function discoverDistributors(shop: { id: string; district: string }, opts: z.infer<typeof discoverQuery>) {
  const { q, category } = opts;
  const distributors = await db.distributor.findMany({
    where: {
      status: "ACTIVE",
      links: { none: { shopId: shop.id, status: { in: ["ACTIVE", "BLOCKED"] } } },
      ...(category ? { categories: { has: category } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              {
                products: {
                  some: {
                    active: true,
                    OR: [{ name: { contains: q, mode: "insensitive" } }, { brand: { contains: q, mode: "insensitive" } }],
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: { links: { where: { shopId: shop.id }, select: { status: true } } },
    take: 100,
  });

  const rows = distributors.length
    ? await db.product.groupBy({
        by: ["distributorId", "brand"],
        where: { distributorId: { in: distributors.map((d) => d.id) }, active: true },
        _count: { _all: true },
      })
    : [];
  const stats = brandStats(rows.map((r) => ({ distributorId: r.distributorId, brand: r.brand, count: r._count._all })));

  return rankByDistrict(
    distributors.map((d) => ({
      id: d.id,
      name: d.name,
      categories: d.categories,
      districts: d.districts,
      minOrder: d.minOrder,
      deliveryDays: d.deliveryDays,
      productCount: stats.get(d.id)?.productCount ?? 0,
      brands: stats.get(d.id)?.brands ?? [],
      requested: d.links[0]?.status === "REQUESTED",
    })),
    shop.district,
  );
}

// Filtr uchun: faol distribyutorlardagi barcha toifalar
export async function allCategories() {
  const rows = await db.distributor.findMany({ where: { status: "ACTIVE" }, select: { categories: true } });
  return [...new Set(rows.flatMap((r) => r.categories))].sort((a, b) => a.localeCompare(b));
}

export async function requestLink(shopId: string, distributorId: string) {
  const dist = await db.distributor.findUnique({ where: { id: distributorId } });
  if (!dist || dist.status !== "ACTIVE") throw new HttpError(404, "Distribyutor topilmadi");

  const existing = await db.shopLink.findUnique({ where: { shopId_distributorId: { shopId, distributorId } } });
  if (existing?.status === "ACTIVE") throw new HttpError(400, "Bu distribyutorga allaqachon ulangansiz");
  if (existing?.status === "BLOCKED") throw new HttpError(403, "Bu distribyutor bilan ulanish yopilgan");
  if (existing) return existing;

  const link = await db.shopLink.create({ data: { shopId, distributorId, status: "REQUESTED", source: "SEARCH" } });
  await db.auditLog.create({
    data: { actor: `shop:${shopId}`, action: "link.requested", entity: "ShopLink", entityId: link.id, after: { distributorId } },
  });
  return link;
}

export const approveInput = z.object({
  linkId: z.string().min(1),
  priceGroupId: z.string().min(1),
  creditLimit: z.coerce.number().int().min(0).max(1_000_000_000),
  creditDays: z.coerce.number().int().min(1).max(90),
});

export async function approveLink(staff: { id: string; distributorId: string }, input: z.infer<typeof approveInput>) {
  return db.$transaction(async (tx) => {
    const link = await tx.shopLink.findUnique({ where: { id: input.linkId } });
    if (!link || link.distributorId !== staff.distributorId) throw new HttpError(404, "So'rov topilmadi");
    if (link.status !== "REQUESTED") throw new HttpError(400, "So'rov allaqachon ko'rib chiqilgan");
    const group = await tx.priceGroup.findFirst({ where: { id: input.priceGroupId, distributorId: staff.distributorId } });
    if (!group) throw new HttpError(400, "Narx guruhi topilmadi");

    const after = { status: "ACTIVE", priceGroupId: group.id, creditLimit: input.creditLimit, creditDays: input.creditDays } as const;
    await tx.auditLog.create({
      data: { actor: `staff:${staff.id}`, action: "link.approved", entity: "ShopLink", entityId: link.id, before: { status: link.status }, after },
    });
    return tx.shopLink.update({ where: { id: link.id }, data: after });
  });
}

// Rad etilgan so'rov o'chiriladi: do'kon keyinroq qayta so'rashi mumkin
export async function rejectLink(staff: { id: string; distributorId: string }, linkId: string) {
  return db.$transaction(async (tx) => {
    const link = await tx.shopLink.findUnique({ where: { id: linkId } });
    if (!link || link.distributorId !== staff.distributorId) throw new HttpError(404, "So'rov topilmadi");
    if (link.status !== "REQUESTED") throw new HttpError(400, "So'rov allaqachon ko'rib chiqilgan");
    await tx.shopLink.delete({ where: { id: link.id } });
    await tx.auditLog.create({
      data: { actor: `staff:${staff.id}`, action: "link.rejected", entity: "ShopLink", entityId: link.id, before: { shopId: link.shopId, status: link.status } },
    });
  });
}
