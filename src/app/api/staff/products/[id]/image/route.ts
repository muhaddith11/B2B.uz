import { db } from "@/lib/db";
import { saveProductImage } from "@/lib/product-image";
import { handle, HttpError, requireStaff } from "@/lib/session";

async function ownProduct(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(req, ["ADMIN", "OPERATOR"]);
  const { id } = await ctx.params;
  const product = await db.product.findUnique({ where: { id } });
  if (!product || product.distributorId !== staff.distributorId) throw new HttpError(404, "Tovar topilmadi");
  return { staff, product };
}

// Distribyutor tovariga rasm qo'yadi (katalogda do'konlarga ko'rinadi)
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { staff, product } = await ownProduct(req, ctx);
  const imageUrl = await saveProductImage(req);
  await db.product.update({ where: { id: product.id }, data: { imageUrl } });
  await db.auditLog.create({ data: { actor: `staff:${staff.id}`, action: "product.image", entity: "Product", entityId: product.id, after: { imageUrl } } });
  return Response.json({ imageUrl });
});

export const DELETE = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { staff, product } = await ownProduct(req, ctx);
  await db.product.update({ where: { id: product.id }, data: { imageUrl: null } });
  await db.auditLog.create({ data: { actor: `staff:${staff.id}`, action: "product.image", entity: "Product", entityId: product.id, after: { imageUrl: null } } });
  return Response.json({ ok: true });
});
