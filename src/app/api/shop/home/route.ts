import { db } from "@/lib/db";
import { errorResponse, requireShopUser } from "@/lib/session";
import { linkSummaries } from "@/lib/shop-summary";

export async function GET(req: Request) {
  try {
    const user = await requireShopUser(req);
    const [links, requests] = await Promise.all([
      linkSummaries(user.shopId),
      db.shopLink.findMany({
        where: { shopId: user.shopId, status: "REQUESTED" },
        include: { distributor: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return Response.json({
      user: { name: user.name, role: user.role },
      shop: { name: user.shop.name, address: user.shop.address },
      links,
      requests: requests.map((r) => ({ distributorId: r.distributorId, name: r.distributor.name, createdAt: r.createdAt })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
