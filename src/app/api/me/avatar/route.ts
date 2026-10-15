import { db } from "@/lib/db";
import { saveImage } from "@/lib/product-image";
import { bearerPayload, handle, HttpError } from "@/lib/session";

// O'z rasmi (avatar): do'konchi, distribyutor xodimi yoki tovar egasi, kim kirgan bo'lsa.
// Avval kimligi tekshiriladi, keyin fayl saqlanadi (kirmagan odamning fayli omborda qolmaydi)
async function avatarSetter(req: Request): Promise<(avatarUrl: string | null) => Promise<unknown>> {
  const who = bearerPayload(req);
  if (who?.kind === "shop") {
    const id = who.shopUserId;
    if (!(await db.shopUser.findUnique({ where: { id } }))) throw new HttpError(401, "Foydalanuvchi topilmadi");
    return (avatarUrl) => db.shopUser.update({ where: { id }, data: { avatarUrl } });
  }
  if (who?.kind === "staff") {
    const staff = await db.staff.findFirst({ where: { id: who.staffId, active: true } });
    if (!staff) throw new HttpError(401, "Xodim topilmadi yoki o'chirilgan");
    return (avatarUrl) => db.staff.update({ where: { id: staff.id }, data: { avatarUrl } });
  }
  if (who?.kind === "brand") {
    const id = who.brandUserId;
    if (!(await db.brandUser.findUnique({ where: { id } }))) throw new HttpError(401, "Foydalanuvchi topilmadi");
    return (avatarUrl) => db.brandUser.update({ where: { id }, data: { avatarUrl } });
  }
  throw new HttpError(401, "Kirish kerak");
}

export const POST = handle(async (req: Request) => {
  const set = await avatarSetter(req);
  const avatarUrl = await saveImage(req, "avatars");
  await set(avatarUrl);
  return Response.json({ avatarUrl });
});

export const DELETE = handle(async (req: Request) => {
  await (await avatarSetter(req))(null);
  return Response.json({ ok: true });
});
