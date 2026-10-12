import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError, readJson, requireStaff } from "@/lib/session";

// Tovarlar: asosiy narx guruhidagi narx bilan. Ko'p tovarni Excel prays-list orqali web panelda yuklash qulay.
export const GET = handle(async (req: Request) => {
  const staff = await requireStaff(req, ["ADMIN", "OPERATOR", "AGENT"]);
  const def = await db.priceGroup.findFirst({ where: { distributorId: staff.distributorId, isDefault: true } });
  const products = await db.product.findMany({
    where: { distributorId: staff.distributorId },
    include: { prices: { include: { priceGroup: { select: { name: true } } } }, brandProduct: { select: { brand: { select: { name: true } } } } },
    orderBy: [{ active: "desc" }, { category: "asc" }, { name: "asc" }],
  });
  return Response.json({
    products: products.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      brand: p.brand,
      category: p.category,
      unit: p.unit,
      packSize: p.packSize,
      minOrderPacks: p.minOrderPacks,
      inStock: p.inStock,
      active: p.active,
      fromBrand: p.brandProduct?.brand.name ?? null,
      price: p.prices.find((x) => x.priceGroupId === def?.id)?.price ?? null,
      prices: p.prices.map((x) => ({ group: x.priceGroup.name, price: x.price })),
    })),
  });
});

const productInput = z.object({
  sku: z.string().trim().min(1).max(50),
  name: z.string().trim().min(2).max(200),
  brand: z.string().trim().min(1).max(100),
  category: z.string().trim().min(2).max(100),
  unit: z.string().trim().min(1).max(20).default("dona"),
  packSize: z.coerce.number().int().min(1).max(10_000),
  minOrderPacks: z.coerce.number().int().min(1).max(1000).default(1),
  price: z.coerce.number().int().positive().max(100_000_000),
  barcode: z.string().trim().max(50).optional(),
});

// Bitta tovar qo'shish: narx barcha narx guruhlariga yoziladi
export const POST = handle(async (req: Request) => {
  const staff = await requireStaff(req, ["ADMIN", "OPERATOR"]);
  const input = await readJson(req, productInput, "Tovar ma'lumotlarini to'liq kiriting");
  if (await db.product.findUnique({ where: { distributorId_sku: { distributorId: staff.distributorId, sku: input.sku } } })) {
    throw new HttpError(400, `Artikul ${input.sku} allaqachon bor`);
  }
  const groups = await db.priceGroup.findMany({ where: { distributorId: staff.distributorId } });
  const { price, barcode, ...rest } = input;
  const product = await db.product.create({
    data: { ...rest, barcode: barcode || null, distributorId: staff.distributorId, prices: { create: groups.map((g) => ({ priceGroupId: g.id, price })) } },
  });
  return Response.json({ id: product.id });
});
