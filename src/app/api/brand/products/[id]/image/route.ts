import { db } from "@/lib/db";
import { saveProductImage } from "@/lib/product-image";
import { handle, HttpError, requireBrandUser } from "@/lib/session";
import { releaseImage } from "@/lib/uploads";

async function ownProduct(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireBrandUser(req);
  const { id } = await ctx.params;
  const product = await db.brandProduct.findUnique({ where: { id } });
  if (!product || product.brandId !== user.brandId) throw new HttpError(404, "Tovar topilmadi");
  return product;
}

// Tovar egasi taklifiga rasm qo'yadi: distribyutor katalogga qo'shganda rasm ham o'tadi.
// Eski rasm distribyutor katalogida ishlatilayotgan bo'lsa qoladi, aks holda ombordan tozalanadi
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const product = await ownProduct(req, ctx);
  const imageUrl = await saveProductImage(req);
  await db.brandProduct.update({ where: { id: product.id }, data: { imageUrl } });
  await releaseImage(product.imageUrl);
  return Response.json({ imageUrl });
});

export const DELETE = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const product = await ownProduct(req, ctx);
  await db.brandProduct.update({ where: { id: product.id }, data: { imageUrl: null } });
  await releaseImage(product.imageUrl);
  return Response.json({ ok: true });
});
