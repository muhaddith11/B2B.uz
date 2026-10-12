import { brandProductInput } from "@/lib/brands";
import { db } from "@/lib/db";
import { handle, readJson, requireBrandUser } from "@/lib/session";

export const GET = handle(async (req: Request) => {
  const user = await requireBrandUser(req);
  const products = await db.brandProduct.findMany({
    where: { brandId: user.brandId },
    include: { _count: { select: { products: { where: { active: true } } } } },
    orderBy: [{ active: "desc" }, { category: "asc" }, { name: "asc" }],
  });
  return Response.json({
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      unit: p.unit,
      packSize: p.packSize,
      barcode: p.barcode,
      description: p.description,
      price: p.price,
      retailPrice: p.retailPrice,
      active: p.active,
      distributors: p._count.products, // nechta distribyutor katalogida
    })),
  });
});

export const POST = handle(async (req: Request) => {
  const user = await requireBrandUser(req);
  const input = await readJson(req, brandProductInput, "Tovar ma'lumotlarini to'liq kiriting");
  const p = await db.brandProduct.create({ data: { ...input, brandId: user.brandId } });
  return Response.json({ id: p.id });
});
