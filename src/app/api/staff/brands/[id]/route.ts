import { purchasePrice } from "@/lib/brands";
import { db } from "@/lib/db";
import { handle, HttpError, requireStaff } from "@/lib/session";

// Tovar egasi kartasi: tovarlari, kelishuv, katalogga qo'shilganlar va xarid buyurtmalari
export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const staff = await requireStaff(req, ["ADMIN"]);
  const { id } = await ctx.params;
  const brand = await db.brand.findFirst({ where: { id, status: "ACTIVE" }, include: { products: { where: { active: true }, orderBy: [{ category: "asc" }, { name: "asc" }] } } });
  if (!brand) throw new HttpError(404, "Tovar egasi topilmadi");

  const agreement = await db.agreement.findFirst({ where: { brandId: id, distributorId: staff.distributorId }, orderBy: { createdAt: "desc" } });
  const [imported, orders, def] = await Promise.all([
    db.product.findMany({ where: { distributorId: staff.distributorId, brandProduct: { brandId: id } }, include: { prices: true } }),
    db.brandOrder.findMany({ where: { brandId: id, distributorId: staff.distributorId }, include: { items: { include: { brandProduct: { select: { name: true } } } } }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.priceGroup.findFirst({ where: { distributorId: staff.distributorId, isDefault: true } }),
  ]);
  const byBp = new Map(imported.map((p) => [p.brandProductId, p]));
  const discount = agreement?.status === "ACTIVE" ? agreement.discountPercent : 0;

  return Response.json({
    brand: { id: brand.id, name: brand.name, logoUrl: brand.logoUrl, description: brand.description, categories: brand.categories, inn: brand.inn },
    agreement: agreement && {
      id: agreement.id,
      status: agreement.status,
      initiatedBy: agreement.initiatedBy,
      districts: agreement.districts,
      discountPercent: agreement.discountPercent,
      terms: agreement.terms,
      createdAt: agreement.createdAt,
    },
    products: brand.products.map((p) => {
      const mine = byBp.get(p.id);
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        unit: p.unit,
        packSize: p.packSize,
        description: p.description,
        price: p.price,
        retailPrice: p.retailPrice,
        imageUrl: p.imageUrl,
        purchasePrice: purchasePrice(p.price, discount),
        inCatalog: mine ? { productId: mine.id, active: mine.active, price: mine.prices.find((x) => x.priceGroupId === def?.id)?.price ?? null } : null,
      };
    }),
    orders: orders.map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt,
      rejectReason: o.rejectReason,
      items: o.items.map((i) => ({ name: i.brandProduct.name, qty: i.qty, price: i.price })),
    })),
  });
});
