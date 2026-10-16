import { removeShopUser } from "@/lib/account";
import { db } from "@/lib/db";
import { handle, HttpError, requireShopUser } from "@/lib/session";
import { releaseImage } from "@/lib/uploads";

// Egasi sotuvchini olib tashlaydi: u boshqa kira olmaydi (sessiyasi darhol yopiladi), buyurtmalari tarixda qoladi
export const DELETE = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireShopUser(req);
  if (user.role !== "OWNER") throw new HttpError(403, "Faqat do'kon egasi");
  const { id } = await ctx.params;
  const target = await db.shopUser.findFirst({ where: { id, shopId: user.shopId, role: "SELLER" } });
  if (!target) throw new HttpError(404, "Sotuvchi topilmadi");
  const avatarUrl = await db.$transaction(async (tx) => {
    const url = await removeShopUser(tx, target.id);
    await tx.auditLog.create({ data: { actor: `shop:${user.id}`, action: "shop.seller.removed", entity: "ShopUser", entityId: target.id } });
    return url;
  });
  await releaseImage(avatarUrl);
  return Response.json({ ok: true });
});
