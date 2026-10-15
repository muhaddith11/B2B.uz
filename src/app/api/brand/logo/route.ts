import { db } from "@/lib/db";
import { saveImage } from "@/lib/product-image";
import { handle, requireBrandUser } from "@/lib/session";

// Tovar egasi (brend) logosi: distribyutorlar takliflar va kelishuvlarda ko'radi
export const POST = handle(async (req: Request) => {
  const user = await requireBrandUser(req);
  const logoUrl = await saveImage(req, "logos");
  await db.brand.update({ where: { id: user.brandId }, data: { logoUrl } });
  return Response.json({ logoUrl });
});

export const DELETE = handle(async (req: Request) => {
  const user = await requireBrandUser(req);
  await db.brand.update({ where: { id: user.brandId }, data: { logoUrl: null } });
  return Response.json({ ok: true });
});
