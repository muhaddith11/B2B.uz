import { db } from "@/lib/db";
import { saveImage } from "@/lib/product-image";
import { handle, HttpError, requireShopUser } from "@/lib/session";

// Do'kon surati yoki logosi: distribyutor, agent va yetkazuvchi do'konni shu rasmdan taniydi. Faqat do'kon egasi
async function owner(req: Request) {
  const user = await requireShopUser(req);
  if (user.role !== "OWNER") throw new HttpError(403, "Faqat do'kon egasi o'zgartira oladi");
  return user;
}

export const POST = handle(async (req: Request) => {
  const user = await owner(req);
  const imageUrl = await saveImage(req, "logos");
  await db.shop.update({ where: { id: user.shopId }, data: { imageUrl } });
  return Response.json({ imageUrl });
});

export const DELETE = handle(async (req: Request) => {
  const user = await owner(req);
  await db.shop.update({ where: { id: user.shopId }, data: { imageUrl: null } });
  return Response.json({ ok: true });
});
