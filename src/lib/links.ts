import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { notifyStaff } from "./push";
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

const DISCOVER_LIMIT = 100;

// Do'kon hali ulanmagan faol distribyutorlar. Qidiruv nomi, tovar nomi va brend bo'yicha.
// Natija cheklangan, shuning uchun avval do'kon hududiga yetkazadiganlar olinadi, qolgan joyga boshqalari.
export async function discoverDistributors(shop: { id: string; district: string }, opts: z.infer<typeof discoverQuery>) {
  const { q, category } = opts;
  const where: Prisma.DistributorWhereInput = {
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
  };
  const find = (extra: Prisma.DistributorWhereInput, take: number) =>
    db.distributor.findMany({
      where: { AND: [where, extra] },
      include: { links: { where: { shopId: shop.id }, select: { status: true } } },
      orderBy: { name: "asc" },
      take,
    });
  const serving = await find({ districts: { has: shop.district } }, DISCOVER_LIMIT);
  const others = serving.length < DISCOVER_LIMIT ? await find({ NOT: { districts: { has: shop.district } } }, DISCOVER_LIMIT - serving.length) : [];
  const distributors = [...serving, ...others];

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
      logoUrl: d.logoUrl,
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
  // Distribyutor allaqachon taklif qilgan: do'kon o'zi ham ulanmoqchi, demak taklif qabul qilinadi
  if (existing?.status === "INVITED") {
    await answerInvite(shopId, existing.id, "accept", `shop:${shopId}`);
    return { ...existing, status: "ACTIVE" as const };
  }
  if (existing) return existing;

  let link;
  try {
    link = await db.shopLink.create({ data: { shopId, distributorId, status: "REQUESTED", source: "SEARCH" } });
  } catch (e) {
    // Ikki marta bosilganda ikkinchi so'rov birinchisi yaratgan ulanishni oladi (500 xato o'rniga)
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const created = await db.shopLink.findUnique({ where: { shopId_distributorId: { shopId, distributorId } } });
      if (created) return created;
    }
    throw e;
  }
  await db.auditLog.create({
    data: { actor: `shop:${shopId}`, action: "link.requested", entity: "ShopLink", entityId: link.id, after: { distributorId } },
  });
  return link;
}

// Distribyutor xodimi tizimda bor do'konni qo'shsa, ulanish taklif bo'lib turadi (INVITED): do'kon egasi ilovada
// tasdiqlamaguncha distribyutor do'kon ma'lumotini ko'rmaydi, buyurtma ham, qarz ham yoza olmaydi.
// Rad etilgan taklif o'chiriladi: distribyutor keyinroq yana taklif qilishi mumkin
export async function answerInvite(shopId: string, linkId: string, action: "accept" | "reject", actor: string): Promise<void> {
  const link = await db.$transaction(async (tx) => {
    const found = await tx.shopLink.findFirst({ where: { id: linkId, shopId }, include: { shop: { select: { name: true } } } });
    if (!found || found.status !== "INVITED") throw new HttpError(404, "Taklif topilmadi");
    // Shart bilan: ikki marta bosilsa yoki bir vaqtda qabul va rad qilinsa, faqat bittasi o'tadi
    const res =
      action === "accept"
        ? await tx.shopLink.updateMany({ where: { id: found.id, status: "INVITED" }, data: { status: "ACTIVE" } })
        : await tx.shopLink.deleteMany({ where: { id: found.id, status: "INVITED" } });
    if (res.count === 0) throw new HttpError(409, "Taklif holati hozirgina o'zgardi. Sahifani yangilang");
    await tx.auditLog.create({
      data: { actor, action: `link.invite.${action}`, entity: "ShopLink", entityId: found.id, before: { status: "INVITED" }, after: { status: action === "accept" ? "ACTIVE" : "DELETED" } },
    });
    return found;
  });
  notifyStaff(
    link.distributorId,
    ["ADMIN", "OPERATOR"],
    {
      title: action === "accept" ? "Do'kon ulanishni tasdiqladi" : "Do'kon ulanish taklifini rad etdi",
      body: link.shop.name,
      data: { url: action === "accept" ? `/staff/shop/${link.id}` : "/staff/requests" },
    },
    link.agentId ? [link.agentId] : [],
  );
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
    // Shart bilan: ikki marta bosilsa yoki shu payt rad etilsa, faqat bitta qaror o'tadi
    const res = await tx.shopLink.updateMany({ where: { id: link.id, status: "REQUESTED" }, data: after });
    if (res.count === 0) throw new HttpError(409, "So'rov allaqachon ko'rib chiqilgan");
    await tx.auditLog.create({
      data: { actor: `staff:${staff.id}`, action: "link.approved", entity: "ShopLink", entityId: link.id, before: { status: link.status }, after },
    });
    return tx.shopLink.findUniqueOrThrow({ where: { id: link.id } });
  });
}

// Rad etilgan so'rov o'chiriladi: do'kon keyinroq qayta so'rashi mumkin
export async function rejectLink(staff: { id: string; distributorId: string }, linkId: string) {
  return db.$transaction(async (tx) => {
    const link = await tx.shopLink.findUnique({ where: { id: linkId } });
    if (!link || link.distributorId !== staff.distributorId) throw new HttpError(404, "So'rov topilmadi");
    if (link.status !== "REQUESTED") throw new HttpError(400, "So'rov allaqachon ko'rib chiqilgan");
    // Faqat hali so'rov holatida bo'lsa o'chiriladi: shu payt tasdiqlangan faol ulanish o'chib ketmasin
    const res = await tx.shopLink.deleteMany({ where: { id: link.id, status: "REQUESTED" } });
    if (res.count === 0) throw new HttpError(409, "So'rov allaqachon ko'rib chiqilgan");
    await tx.auditLog.create({
      data: { actor: `staff:${staff.id}`, action: "link.rejected", entity: "ShopLink", entityId: link.id, before: { shopId: link.shopId, status: link.status } },
    });
  });
}
