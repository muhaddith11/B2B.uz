import { db } from "@/lib/db";
import { handle, requireBrandUser } from "@/lib/session";

// Tovar egasi uchun distribyutorlar: hudud, toifa, qamrov (nechta do'kon bilan ishlaydi)
export const GET = handle(async (req: Request) => {
  const user = await requireBrandUser(req);
  const params = new URL(req.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 100);
  const category = (params.get("category") ?? "").trim();
  const district = (params.get("district") ?? "").trim();
  const distributors = await db.distributor.findMany({
    where: {
      status: "ACTIVE",
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      ...(category ? { categories: { has: category } } : {}),
      ...(district ? { districts: { has: district } } : {}),
    },
    include: {
      _count: { select: { links: { where: { status: "ACTIVE" } }, products: { where: { active: true } } } },
      agreements: { where: { brandId: user.brandId }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { name: "asc" },
    take: 200,
  });
  const all = await db.distributor.findMany({ where: { status: "ACTIVE" }, select: { categories: true, districts: true } });
  const uniq = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b));
  return Response.json({
    categories: uniq(all.flatMap((d) => d.categories)),
    districts: uniq(all.flatMap((d) => d.districts)),
    distributors: distributors.map((d) => {
      const a = d.agreements[0];
      return {
        id: d.id,
        name: d.name,
        districts: d.districts,
        categories: d.categories,
        deliveryDays: d.deliveryDays,
        shops: d._count.links,
        products: d._count.products,
        agreement: a ? { id: a.id, status: a.status, initiatedBy: a.initiatedBy } : null,
      };
    }),
  });
});
