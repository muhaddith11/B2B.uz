import { db } from "@/lib/db";
import { activeLink, priceGroupFor } from "@/lib/orders";
import { errorResponse, requireShopUser } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const user = await requireShopUser(req);
    const distributorId = new URL(req.url).searchParams.get("distributorId") ?? "";
    const link = await activeLink(user.shopId, distributorId);
    const groupId = await priceGroupFor(link);

    const products = await db.product.findMany({
      where: { distributorId, active: true },
      include: { prices: { where: { priceGroupId: groupId } } },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return Response.json({
      distributor: { id: link.distributor.id, name: link.distributor.name, minOrder: link.distributor.minOrder, deliveryDays: link.distributor.deliveryDays },
      products: products
        .filter((p) => p.prices.length > 0)
        .map((p) => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          category: p.category,
          unit: p.unit,
          packSize: p.packSize,
          minOrderPacks: p.minOrderPacks,
          inStock: p.inStock,
          marked: p.marked,
          imageUrl: p.imageUrl,
          price: p.prices[0].price,
        })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
