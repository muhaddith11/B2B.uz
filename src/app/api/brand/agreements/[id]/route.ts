import { z } from "zod";
import { respondAgreement } from "@/lib/brands";
import { db } from "@/lib/db";
import { handle, HttpError, readJson, requireBrandUser } from "@/lib/session";

// Kelishuv kartasi: shartlar, distribyutor, uning katalogidagi tovarlarimiz va xarid buyurtmalari
export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireBrandUser(req);
  const { id } = await ctx.params;
  const a = await db.agreement.findUnique({
    where: { id },
    include: { distributor: { include: { _count: { select: { links: { where: { status: "ACTIVE" } } } } } }, orders: { orderBy: { createdAt: "desc" }, take: 30 } },
  });
  if (!a || a.brandId !== user.brandId) throw new HttpError(404, "Kelishuv topilmadi");
  const listed = await db.product.findMany({
    where: { distributorId: a.distributorId, brandProduct: { brandId: user.brandId } },
    include: { prices: { include: { priceGroup: { select: { isDefault: true } } } } },
  });
  return Response.json({
    agreement: {
      id: a.id,
      status: a.status,
      initiatedBy: a.initiatedBy,
      districts: a.districts,
      discountPercent: a.discountPercent,
      terms: a.terms,
      createdAt: a.createdAt,
      respondedAt: a.respondedAt,
      endedAt: a.endedAt,
    },
    distributor: { id: a.distributor.id, name: a.distributor.name, logoUrl: a.distributor.logoUrl, districts: a.distributor.districts, categories: a.distributor.categories, shops: a.distributor._count.links },
    listed: listed.map((p) => ({ name: p.name, active: p.active, inStock: p.inStock, price: p.prices.find((x) => x.priceGroup.isDefault)?.price ?? null })),
    orders: a.orders.map((o) => ({ id: o.id, number: o.number, status: o.status, total: o.total, createdAt: o.createdAt })),
  });
});

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireBrandUser(req);
  const { id } = await ctx.params;
  const { action } = await readJson(req, z.object({ action: z.enum(["accept", "reject", "end"]) }));
  const a = await respondAgreement("BRAND", user.brandId, id, action, `brand:${user.id}`);
  return Response.json({ status: a.status });
});
