import { db } from "@/lib/db";
import { saveImage } from "@/lib/product-image";
import { handle, HttpError, requireStaff } from "@/lib/session";
import { linkScope } from "@/lib/staff-data";

// Agent do'kon oldida turib uning suratini qo'yadi (yetkazuvchi do'konni shundan topadi).
// Do'kon surati hamma distribyutorlar uchun bitta: xodim faqat surat yo'q bo'lsa qo'yadi, almashtirish do'kon egasining ishi
export const POST = handle(async (req: Request, ctx: { params: Promise<{ linkId: string }> }) => {
  const staff = await requireStaff(req, ["ADMIN", "OPERATOR", "AGENT"]);
  const { linkId } = await ctx.params;
  const link = await db.shopLink.findFirst({ where: { id: linkId, ...linkScope(staff) }, include: { shop: true } });
  if (!link) throw new HttpError(404, "Do'kon topilmadi");
  if (link.shop.imageUrl) throw new HttpError(409, "Do'konning surati bor: uni faqat do'kon egasi almashtiradi");
  const imageUrl = await saveImage(req, "logos");
  // Bir vaqtdagi ikki so'rovda ham faqat birinchisi yoziladi
  const set = await db.shop.updateMany({ where: { id: link.shopId, imageUrl: null }, data: { imageUrl } });
  if (set.count === 0) throw new HttpError(409, "Do'konning surati bor: uni faqat do'kon egasi almashtiradi");
  await db.auditLog.create({ data: { actor: `staff:${staff.id}`, action: "shop.image", entity: "Shop", entityId: link.shopId, after: { imageUrl } } });
  return Response.json({ imageUrl });
});
