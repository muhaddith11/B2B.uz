import { db } from "@/lib/db";
import { handle, requireStaff } from "@/lib/session";

// Tovar egalari: tasdiqlangan brendlar va ular bilan kelishuv holati
export const GET = handle(async (req: Request) => {
  const staff = await requireStaff(req, ["ADMIN"]);
  // Platforma tasdiqlamagan distribyutor tovar egalari ro'yxatini ko'rmaydi
  if (staff.distributor.status !== "ACTIVE") return Response.json({ pending: true, categories: [], brands: [] });
  const params = new URL(req.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 100);
  const category = (params.get("category") ?? "").trim();
  const brands = await db.brand.findMany({
    where: {
      status: "ACTIVE",
      ...(category ? { categories: { has: category } } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { products: { some: { active: true, name: { contains: q, mode: "insensitive" } } } }] } : {}),
    },
    include: {
      _count: { select: { products: { where: { active: true } } } },
      agreements: { where: { distributorId: staff.distributorId }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { name: "asc" },
    take: 200,
  });
  const all = await db.brand.findMany({ where: { status: "ACTIVE" }, select: { categories: true } });
  return Response.json({
    categories: [...new Set(all.flatMap((b) => b.categories))].sort((a, b) => a.localeCompare(b)),
    brands: brands.map((b) => {
      const a = b.agreements[0];
      return {
        id: b.id,
        name: b.name,
        logoUrl: b.logoUrl,
        description: b.description,
        categories: b.categories,
        productCount: b._count.products,
        agreement: a ? { id: a.id, status: a.status, initiatedBy: a.initiatedBy } : null,
      };
    }),
  });
});
