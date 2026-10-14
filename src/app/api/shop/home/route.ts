import { db } from "@/lib/db";
import { handle, requireShopUser } from "@/lib/session";
import { subscriptionInfo } from "@/lib/subscription";
import { linkSummaries } from "@/lib/shop-summary";

export const GET = handle(async (req: Request) => {
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
      // Obuna holati (ilovada faqat ko'rsatiladi, to'lov saytda)
      subscription: subscriptionInfo(user.shop),
      links,
      requests: requests.map((r) => ({ distributorId: r.distributorId, name: r.distributor.name, createdAt: r.createdAt })),
    });
});
