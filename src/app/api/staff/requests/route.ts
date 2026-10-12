import { db } from "@/lib/db";
import { handle, requireStaff } from "@/lib/session";

// Ilovada distribyutorni topib, ulanishni so'ragan do'konlar
export const GET = handle(async (req: Request) => {
  const staff = await requireStaff(req, ["ADMIN", "OPERATOR"]);
  const requests = await db.shopLink.findMany({
    where: { distributorId: staff.distributorId, status: "REQUESTED" },
    include: { shop: { include: { users: { where: { role: "OWNER" }, take: 1 } } } },
    orderBy: { createdAt: "asc" },
  });
  return Response.json({
    requests: requests.map((r) => ({
      linkId: r.id,
      createdAt: r.createdAt,
      shop: { name: r.shop.name, address: r.shop.address, district: r.shop.district },
      owner: r.shop.users[0] ? { name: r.shop.users[0].name, phone: r.shop.users[0].phone } : null,
      servesDistrict: staff.distributor.districts.includes(r.shop.district),
    })),
  });
});
