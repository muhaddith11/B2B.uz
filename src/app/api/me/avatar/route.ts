import { db } from "@/lib/db";
import { saveImage } from "@/lib/product-image";
import { handle, requireAccount, type AccountRef } from "@/lib/session";
import { releaseImage } from "@/lib/uploads";

// O'z rasmi (avatar): do'konchi, distribyutor xodimi yoki tovar egasi, kim kirgan bo'lsa.
// Avval kimligi tekshiriladi, keyin fayl saqlanadi (kirmagan odamning fayli omborda qolmaydi).
// Eski rasm boshqa joyda ishlatilmasa ombordan o'chiriladi
async function setAvatar(who: AccountRef, avatarUrl: string | null) {
  const where = { where: { id: who.id }, select: { avatarUrl: true } };
  const before =
    who.kind === "shop" ? await db.shopUser.findUniqueOrThrow(where) : who.kind === "staff" ? await db.staff.findUniqueOrThrow(where) : await db.brandUser.findUniqueOrThrow(where);
  const data = { where: { id: who.id }, data: { avatarUrl } };
  if (who.kind === "shop") await db.shopUser.update(data);
  else if (who.kind === "staff") await db.staff.update(data);
  else await db.brandUser.update(data);
  if (before.avatarUrl !== avatarUrl) await releaseImage(before.avatarUrl);
}

export const POST = handle(async (req: Request) => {
  const who = await requireAccount(req);
  const avatarUrl = await saveImage(req, "avatars");
  await setAvatar(who, avatarUrl);
  return Response.json({ avatarUrl });
});

export const DELETE = handle(async (req: Request) => {
  await setAvatar(await requireAccount(req), null);
  return Response.json({ ok: true });
});
