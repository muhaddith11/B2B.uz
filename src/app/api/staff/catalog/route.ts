import { db } from "@/lib/db";
import { priceGroupFor } from "@/lib/orders";
import { handle, requireStaff } from "@/lib/session";
import { staffLink } from "@/lib/staff-data";

// Agent buyurtma olishi uchun: do'konning narx guruhidagi katalog
export const GET = handle(async (req: Request) => {
  const staff = await requireStaff(req, ["ADMIN", "OPERATOR", "AGENT"]);
  const link = await staffLink(staff.distributorId, new URL(req.url).searchParams.get("linkId") ?? "");
  const groupId = await priceGroupFor(link);
  const products = await db.product.findMany({
    where: { distributorId: staff.distributorId, active: true },
    include: { prices: { where: { priceGroupId: groupId } } },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return Response.json({
    shop: { linkId: link.id, name: link.shop.name },
    distributor: { id: link.distributor.id, name: link.distributor.name, minOrder: link.distributor.minOrder },
    creditLimit: link.creditLimit,
    products: products
      .filter((p) => p.prices.length > 0)
      .map((p) => ({ id: p.id, name: p.name, brand: p.brand, category: p.category, unit: p.unit, packSize: p.packSize, minOrderPacks: p.minOrderPacks, inStock: p.inStock, marked: p.marked, imageUrl: p.imageUrl, price: p.prices[0].price })),
  });
});
