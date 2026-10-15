import { db } from "@/lib/db";
import { handle, requireStaff } from "@/lib/session";

// Ilovada distribyutorni topib, ulanishni so'ragan do'konlar va javob kutilayotgan takliflar
export const GET = handle(async (req: Request) => {
  const staff = await requireStaff(req, ["ADMIN", "OPERATOR"]);
  const [requests, invited] = await Promise.all([
    db.shopLink.findMany({
      where: { distributorId: staff.distributorId, status: "REQUESTED" },
      include: { shop: { include: { users: { where: { role: "OWNER" }, take: 1 } } } },
      orderBy: { createdAt: "asc" },
    }),
    // Taklif qilingan do'kon: egasi tasdiqlaguncha faqat xodimning o'zi kiritgan raqam ko'rinadi (do'kon nomi va manzili emas)
    db.shopLink.findMany({
      where: { distributorId: staff.distributorId, status: "INVITED" },
      include: { agent: { select: { name: true } }, shop: { select: { users: { where: { role: "OWNER" }, take: 1, select: { phone: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  return Response.json({
    invited: invited.map((l) => ({ linkId: l.id, createdAt: l.createdAt, phone: l.shop.users[0]?.phone ?? null, agent: l.agent?.name ?? null })),
    requests: requests.map((r) => ({
      linkId: r.id,
      createdAt: r.createdAt,
      shop: { name: r.shop.name, address: r.shop.address, district: r.shop.district },
      owner: r.shop.users[0] ? { name: r.shop.users[0].name, phone: r.shop.users[0].phone } : null,
      servesDistrict: staff.distributor.districts.includes(r.shop.district),
    })),
  });
});
