import { db } from "@/lib/db";
import { saveImage } from "@/lib/product-image";
import { handle, requireBrandUser } from "@/lib/session";
import { releaseImage } from "@/lib/uploads";

// Tovar egasi (brend) logosi: distribyutorlar takliflar va kelishuvlarda ko'radi. Eski logo ombordan tozalanadi
export const POST = handle(async (req: Request) => {
  const user = await requireBrandUser(req);
  const logoUrl = await saveImage(req, "logos");
  await db.brand.update({ where: { id: user.brandId }, data: { logoUrl } });
  await releaseImage(user.brand.logoUrl);
  return Response.json({ logoUrl });
});

export const DELETE = handle(async (req: Request) => {
  const user = await requireBrandUser(req);
  await db.brand.update({ where: { id: user.brandId }, data: { logoUrl: null } });
  await releaseImage(user.brand.logoUrl);
  return Response.json({ ok: true });
});
