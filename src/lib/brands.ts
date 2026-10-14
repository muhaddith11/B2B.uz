import type { AgreementSide, BrandOrderStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { formatSom } from "./money";
import { notifyBrand, notifyStaff } from "./push";
import { HttpError } from "./session";

// Tovar egasi va distribyutor: kelishuv, katalogga qo'shish, xarid buyurtmasi, savdo statistikasi.

export const brandProductInput = z.object({
  name: z.string().trim().min(2).max(200),
  category: z.string().trim().min(2).max(100),
  unit: z.string().trim().min(1).max(20).default("dona"),
  packSize: z.coerce.number().int().min(1).max(10_000),
  price: z.coerce.number().int().positive().max(100_000_000),
  retailPrice: z.coerce.number().int().positive().max(100_000_000).nullable().optional(),
  barcode: z.string().trim().max(50).nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  active: z.boolean().optional(),
});

export const proposeInput = z.object({
  districts: z.array(z.string().trim().min(2)).max(50).default([]),
  discountPercent: z.coerce.number().int().min(0).max(90).default(0),
  terms: z.string().trim().max(2000).optional(),
});

// Chegirmali xarid narxi: butun so'mga yaxlitlanadi
export function purchasePrice(price: number, discountPercent: number): number {
  return Math.round((price * (100 - discountPercent)) / 100);
}

const OPEN = ["PROPOSED", "ACTIVE"] as const;

export async function proposeAgreement(side: AgreementSide, brandId: string, distributorId: string, input: z.infer<typeof proposeInput>, actor: string) {
  const [brand, dist] = await Promise.all([db.brand.findUnique({ where: { id: brandId } }), db.distributor.findUnique({ where: { id: distributorId } })]);
  if (!brand || brand.status !== "ACTIVE") throw new HttpError(side === "BRAND" ? 403 : 404, side === "BRAND" ? "Hisobingiz hali tasdiqlanmagan" : "Tovar egasi topilmadi");
  if (!dist || dist.status !== "ACTIVE") throw new HttpError(side === "DISTRIBUTOR" ? 403 : 404, side === "DISTRIBUTOR" ? "Hisobingiz hali tasdiqlanmagan" : "Distribyutor topilmadi");

  const agreement = await db.$transaction(async (tx) => {
    // Bir juftlik uchun takliflar navbat bilan: ikki marta bosilsa yoki ikkala tomon bir vaqtda taklif qilsa, ochiq kelishuv bitta bo'ladi
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`agreement:${brandId}:${distributorId}`}))`;
    const open = await tx.agreement.findFirst({ where: { brandId, distributorId, status: { in: [...OPEN] } } });
    if (open) throw new HttpError(400, open.status === "ACTIVE" ? "Kelishuv allaqachon faol" : "Taklif allaqachon yuborilgan, javob kutilmoqda");
    const created = await tx.agreement.create({
      data: {
        brandId,
        distributorId,
        initiatedBy: side,
        districts: input.districts.length ? input.districts : dist.districts,
        discountPercent: input.discountPercent,
        terms: input.terms || null,
      },
    });
    await tx.auditLog.create({ data: { actor, action: "agreement.proposed", entity: "Agreement", entityId: created.id, after: { brandId, distributorId } } });
    return created;
  });
  if (side === "BRAND") {
    notifyStaff(distributorId, ["ADMIN"], { title: "Kelishuv taklifi", body: `${brand.name} hamkorlik taklif qilmoqda`, data: { url: `/staff/brand/${brandId}` } });
  } else {
    notifyBrand(brandId, { title: "Kelishuv taklifi", body: `${dist.name} hamkorlik taklif qilmoqda`, data: { url: `/brand/agreement/${agreement.id}` } });
  }
  return agreement;
}

// Javob: qabul qilish yoki rad etish faqat taklif olgan tomonda; tugatish ikkala tomonda
export async function respondAgreement(side: AgreementSide, sideId: string, agreementId: string, action: "accept" | "reject" | "end", actor: string) {
  const a = await db.agreement.findUnique({ where: { id: agreementId }, include: { brand: true, distributor: true } });
  const mine = a && (side === "BRAND" ? a.brandId === sideId : a.distributorId === sideId);
  if (!a || !mine) throw new HttpError(404, "Kelishuv topilmadi");

  let data: { status: "ACTIVE" | "REJECTED" | "ENDED"; respondedAt?: Date; endedAt?: Date };
  if (action === "end") {
    if (a.status !== "ACTIVE") throw new HttpError(400, "Faqat faol kelishuvni tugatish mumkin");
    data = { status: "ENDED", endedAt: new Date() };
  } else {
    if (a.status !== "PROPOSED") throw new HttpError(400, "Taklif allaqachon ko'rib chiqilgan");
    if (a.initiatedBy === side) throw new HttpError(400, "O'z taklifingizga javob bera olmaysiz");
    data = { status: action === "accept" ? "ACTIVE" : "REJECTED", respondedAt: new Date() };
  }

  const updated = await db.$transaction(async (tx) => {
    // Shart bilan: bir vaqtda biri qabul qilib, biri rad etsa, faqat birinchisining javobi yoziladi
    const res = await tx.agreement.updateMany({ where: { id: a.id, status: a.status }, data });
    if (res.count === 0) throw new HttpError(409, "Kelishuv holati hozirgina o'zgardi. Sahifani yangilang");
    // Kelishuv tugasa, tovar egasining tovarlari distribyutor katalogidan olinadi
    if (data.status === "ENDED") {
      await tx.product.updateMany({ where: { distributorId: a.distributorId, brandProduct: { brandId: a.brandId } }, data: { active: false } });
    }
    await tx.auditLog.create({ data: { actor, action: `agreement.${action}`, entity: "Agreement", entityId: a.id, before: { status: a.status }, after: { status: data.status } } });
    return tx.agreement.findUniqueOrThrow({ where: { id: a.id } });
  });

  const label = { ACTIVE: "qabul qilindi", REJECTED: "rad etildi", ENDED: "tugatildi" }[data.status];
  if (side === "BRAND") {
    notifyStaff(a.distributorId, ["ADMIN"], { title: `Kelishuv ${label}`, body: a.brand.name, data: { url: `/staff/brand/${a.brandId}` } });
  } else {
    notifyBrand(a.brandId, { title: `Kelishuv ${label}`, body: a.distributor.name, data: { url: `/brand/agreement/${a.id}` } });
  }
  return updated;
}

async function activeAgreement(distributorId: string, agreementId: string) {
  const a = await db.agreement.findUnique({ where: { id: agreementId }, include: { brand: true } });
  if (!a || a.distributorId !== distributorId) throw new HttpError(404, "Kelishuv topilmadi");
  if (a.status !== "ACTIVE") throw new HttpError(400, "Kelishuv faol emas");
  return a;
}

export const importInput = z.object({
  brandProductId: z.string().min(1),
  price: z.coerce.number().int().positive().max(100_000_000), // distribyutorning do'konlarga sotish narxi, bir dona
  minOrderPacks: z.coerce.number().int().min(1).max(1000).default(1),
});

// Faol kelishuvdagi tovarni distribyutor o'z katalogiga qo'shadi (barcha narx guruhlariga bir xil narx)
export async function importBrandProduct(staff: { id: string; distributorId: string }, agreementId: string, input: z.infer<typeof importInput>) {
  const a = await activeAgreement(staff.distributorId, agreementId);
  const bp = await db.brandProduct.findFirst({ where: { id: input.brandProductId, brandId: a.brandId, active: true } });
  if (!bp) throw new HttpError(404, "Tovar topilmadi");
  const groups = await db.priceGroup.findMany({ where: { distributorId: staff.distributorId } });
  if (groups.length === 0) throw new HttpError(400, "Avval narx guruhi yarating");

  const existing = await db.product.findFirst({ where: { distributorId: staff.distributorId, brandProductId: bp.id } });
  const fields = { name: bp.name, brand: a.brand.name, category: bp.category, unit: bp.unit, packSize: bp.packSize, barcode: bp.barcode, imageUrl: bp.imageUrl, minOrderPacks: input.minOrderPacks, active: true, inStock: true };
  return db.$transaction(async (tx) => {
    const product = existing
      ? await tx.product.update({ where: { id: existing.id }, data: fields })
      : await tx.product.create({ data: { ...fields, distributorId: staff.distributorId, sku: `BR-${bp.id.slice(-8).toUpperCase()}`, brandProductId: bp.id } });
    for (const g of groups) {
      await tx.price.upsert({
        where: { productId_priceGroupId: { productId: product.id, priceGroupId: g.id } },
        create: { productId: product.id, priceGroupId: g.id, price: input.price },
        update: { price: input.price, validFrom: new Date() },
      });
    }
    return product;
  });
}

export const brandOrderInput = z.object({
  agreementId: z.string().min(1),
  note: z.string().trim().max(500).optional(),
  items: z
    .array(z.object({ brandProductId: z.string().min(1), qty: z.number().int().positive() }))
    .min(1)
    .max(200),
});

export async function createBrandOrder(staff: { id: string; distributorId: string }, input: z.infer<typeof brandOrderInput>) {
  const a = await activeAgreement(staff.distributorId, input.agreementId);
  const products = await db.brandProduct.findMany({ where: { id: { in: input.items.map((i) => i.brandProductId) }, brandId: a.brandId, active: true } });
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = input.items.map((i) => {
    const p = byId.get(i.brandProductId);
    if (!p) throw new HttpError(400, "Tovar topilmadi");
    if (i.qty % p.packSize !== 0) throw new HttpError(400, `"${p.name}" yashik bo'yicha (${p.packSize} dona) buyurtma qilinadi`);
    return { brandProductId: p.id, qty: i.qty, price: purchasePrice(p.price, a.discountPercent) };
  });
  const total = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const order = await db.brandOrder.create({
    data: { agreementId: a.id, brandId: a.brandId, distributorId: staff.distributorId, total, note: input.note || null, items: { create: lines } },
    include: { distributor: true },
  });
  notifyBrand(a.brandId, { title: `Xarid buyurtmasi №${order.number}`, body: `${order.distributor.name}: ${formatSom(total)}`, data: { url: `/brand/order/${order.id}` } });
  return order;
}

const brandOrderTransitions: Record<BrandOrderStatus, { by: AgreementSide; to: BrandOrderStatus[] }[]> = {
  SENT: [
    { by: "BRAND", to: ["ACCEPTED", "REJECTED"] },
    { by: "DISTRIBUTOR", to: ["CANCELLED"] },
  ],
  ACCEPTED: [{ by: "BRAND", to: ["SHIPPED"] }],
  SHIPPED: [{ by: "DISTRIBUTOR", to: ["DELIVERED"] }],
  REJECTED: [],
  DELIVERED: [],
  CANCELLED: [],
};

export function canMoveBrandOrder(from: BrandOrderStatus, to: BrandOrderStatus, by: AgreementSide): boolean {
  return brandOrderTransitions[from].some((t) => t.by === by && t.to.includes(to));
}

const BRAND_ORDER_LABEL: Record<BrandOrderStatus, string> = {
  SENT: "yuborildi",
  ACCEPTED: "qabul qilindi",
  REJECTED: "rad etildi",
  SHIPPED: "jo'natildi",
  DELIVERED: "qabul qilib olindi",
  CANCELLED: "bekor qilindi",
};

export async function moveBrandOrder(side: AgreementSide, sideId: string, orderId: string, to: BrandOrderStatus, rejectReason?: string) {
  const o = await db.brandOrder.findUnique({ where: { id: orderId }, include: { brand: true, distributor: true } });
  const mine = o && (side === "BRAND" ? o.brandId === sideId : o.distributorId === sideId);
  if (!o || !mine) throw new HttpError(404, "Buyurtma topilmadi");
  if (!canMoveBrandOrder(o.status, to, side)) throw new HttpError(400, "Bu holatga o'tkazib bo'lmaydi");
  // Shart bilan: masalan, tovar egasi qabul qilayotgan paytda distribyutor bekor qilsa, faqat bittasi o'tadi
  const res = await db.brandOrder.updateMany({
    where: { id: o.id, status: o.status },
    data: { status: to, rejectReason: to === "REJECTED" ? rejectReason || null : o.rejectReason },
  });
  if (res.count === 0) throw new HttpError(409, "Buyurtma holati hozirgina o'zgardi. Sahifani yangilang");
  const updated = await db.brandOrder.findUniqueOrThrow({ where: { id: o.id } });
  const body = `Xarid buyurtmasi ${BRAND_ORDER_LABEL[to]}`;
  if (side === "BRAND") notifyStaff(o.distributorId, ["ADMIN"], { title: `${o.brand.name}, №${o.number}`, body, data: { url: `/staff/brand/${o.brandId}` } });
  else notifyBrand(o.brandId, { title: `${o.distributor.name}, №${o.number}`, body, data: { url: `/brand/order/${o.id}` } });
  return updated;
}

// Tovar egasi: tovarlari distribyutorlar orqali qancha sotilgani (topshirilgan buyurtmalar)
export async function brandSales(brandId: string, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const items = await db.orderItem.findMany({
    where: { product: { brandProduct: { brandId } }, order: { status: "DELIVERED", updatedAt: { gte: since } } },
    select: { qty: true, deliveredQty: true, price: true, product: { select: { distributorId: true, distributor: { select: { name: true } }, brandProductId: true, name: true } } },
  });
  const byDist = new Map<string, { distributorId: string; name: string; qty: number; sum: number }>();
  const byProduct = new Map<string, { name: string; qty: number; sum: number }>();
  for (const it of items) {
    const q = it.deliveredQty ?? it.qty;
    const d = byDist.get(it.product.distributorId) ?? { distributorId: it.product.distributorId, name: it.product.distributor.name, qty: 0, sum: 0 };
    d.qty += q;
    d.sum += q * it.price;
    byDist.set(it.product.distributorId, d);
    const key = it.product.brandProductId ?? it.product.name;
    const p = byProduct.get(key) ?? { name: it.product.name, qty: 0, sum: 0 };
    p.qty += q;
    p.sum += q * it.price;
    byProduct.set(key, p);
  }
  const sort = <T extends { sum: number }>(m: Map<string, T>) => [...m.values()].sort((a, b) => b.sum - a.sum);
  const distributors = sort(byDist);
  return { days, total: distributors.reduce((s, d) => s + d.sum, 0), distributors, products: sort(byProduct) };
}
