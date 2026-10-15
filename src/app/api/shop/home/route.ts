import { db } from "@/lib/db";
import { handle, requireShopUser } from "@/lib/session";
import { subscriptionInfo } from "@/lib/subscription";
import { linkSummaries } from "@/lib/shop-summary";

export const GET = handle(async (req: Request) => {
    const user = await requireShopUser(req);
    const [links, requests, invites, active] = await Promise.all([
      linkSummaries(user.shopId),
      db.shopLink.findMany({
        where: { shopId: user.shopId, status: "REQUESTED" },
        include: { distributor: { select: { name: true, logoUrl: true } } },
        orderBy: { createdAt: "desc" },
      }),
      // Distribyutorlar takliflari: do'kon egasi tasdiqlaguncha ular do'konni ko'rmaydi
      db.shopLink.findMany({
        where: { shopId: user.shopId, status: "INVITED" },
        include: { distributor: { select: { name: true, logoUrl: true, categories: true } } },
        orderBy: { createdAt: "desc" },
      }),
      // Yo'ldagi buyurtmalar: bosh sahifada holat chizig'i bilan (eng yangilari)
      db.order.findMany({
        where: { shopLink: { shopId: user.shopId }, status: { in: ["SENT", "ACCEPTED", "IN_DELIVERY"] } },
        include: { shopLink: { include: { distributor: { select: { name: true, logoUrl: true } } } }, items: { include: { product: { select: { packSize: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);
    return Response.json({
      user: { name: user.name, role: user.role, avatarUrl: user.avatarUrl },
      shop: { name: user.shop.name, address: user.shop.address, imageUrl: user.shop.imageUrl },
      // Obuna holati (ilovada faqat ko'rsatiladi, to'lov saytda)
      subscription: subscriptionInfo(user.shop),
      links,
      requests: requests.map((r) => ({ distributorId: r.distributorId, name: r.distributor.name, logoUrl: r.distributor.logoUrl, createdAt: r.createdAt })),
      invites: invites.map((r) => ({
        linkId: r.id,
        distributorId: r.distributorId,
        name: r.distributor.name,
        logoUrl: r.distributor.logoUrl,
        categories: r.distributor.categories,
        createdAt: r.createdAt,
      })),
      active: active.map((o) => ({
        id: o.id,
        number: o.number,
        status: o.status,
        total: o.total,
        packs: o.items.reduce((n, i) => n + Math.ceil(i.qty / i.product.packSize), 0),
        createdAt: o.createdAt,
        acceptedAt: o.acceptedAt,
        dispatchedAt: o.dispatchedAt,
        deliveredAt: o.deliveredAt,
        distributor: { id: o.shopLink.distributorId, name: o.shopLink.distributor.name, logoUrl: o.shopLink.distributor.logoUrl },
      })),
    });
});
