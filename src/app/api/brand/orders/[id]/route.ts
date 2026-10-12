import { z } from "zod";
import { moveBrandOrder } from "@/lib/brands";
import { db } from "@/lib/db";
import { handle, HttpError, readJson, requireBrandUser } from "@/lib/session";

export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireBrandUser(req);
  const { id } = await ctx.params;
  const o = await db.brandOrder.findUnique({
    where: { id },
    include: { distributor: { select: { name: true } }, items: { include: { brandProduct: { select: { name: true, packSize: true, unit: true } } } } },
  });
  if (!o || o.brandId !== user.brandId) throw new HttpError(404, "Buyurtma topilmadi");
  return Response.json({
    order: {
      id: o.id,
      number: o.number,
      status: o.status,
      total: o.total,
      note: o.note,
      rejectReason: o.rejectReason,
      createdAt: o.createdAt,
      agreementId: o.agreementId,
      distributor: o.distributor.name,
      items: o.items.map((i) => ({ name: i.brandProduct.name, packSize: i.brandProduct.packSize, unit: i.brandProduct.unit, qty: i.qty, price: i.price })),
    },
  });
});

// Tovar egasi: qabul qiladi, rad etadi yoki jo'natadi
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireBrandUser(req);
  const { id } = await ctx.params;
  const body = await readJson(req, z.object({ to: z.enum(["ACCEPTED", "REJECTED", "SHIPPED"]), rejectReason: z.string().trim().max(300).optional() }));
  const o = await moveBrandOrder("BRAND", user.brandId, id, body.to, body.rejectReason);
  return Response.json({ status: o.status });
});
