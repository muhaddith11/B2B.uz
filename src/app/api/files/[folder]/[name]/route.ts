import { db } from "@/lib/db";
import { bearerPayload, getStaff, handle, HttpError } from "@/lib/session";
import { linkScope } from "@/lib/staff-data";
import { readUpload } from "@/lib/uploads";

// Rasmlar (tovar, logo, do'kon surati, avatar) hammaga ochiq, lekin faqat biror tovar, tashkilot yoki foydalanuvchiga
// biriktirilgan bo'lsa (tashlab yuborilgan fayl berilmaydi). Yuklangan chekni faqat o'sha do'kon yoki o'sha distribyutor xodimi ko'radi.
async function imageAttached(folder: string, url: string): Promise<boolean> {
  const counts =
    folder === "products"
      ? [db.product.count({ where: { imageUrl: url } }), db.brandProduct.count({ where: { imageUrl: url } })]
      : folder === "logos"
        ? [db.distributor.count({ where: { logoUrl: url } }), db.brand.count({ where: { logoUrl: url } }), db.shop.count({ where: { imageUrl: url } })]
        : folder === "avatars"
          ? [db.staff.count({ where: { avatarUrl: url } }), db.shopUser.count({ where: { avatarUrl: url } }), db.brandUser.count({ where: { avatarUrl: url } })]
          : [];
  return (await Promise.all(counts)).some((n) => n > 0);
}

export const GET = handle(async (req: Request, ctx: { params: Promise<{ folder: string; name: string }> }) => {
  const { folder, name } = await ctx.params;
  const url = `/api/files/${folder}/${name}`;

  if (folder === "products" || folder === "logos" || folder === "avatars") {
    const file = (await imageAttached(folder, url)) ? await readUpload(folder, name) : null;
    if (!file) throw new HttpError(404, "Fayl topilmadi");
    // Fayl nomi tasodifiy va o'zgarmaydi: uzoq keshlanadi
    return new Response(new Uint8Array(file.data), { headers: { "content-type": file.type, "cache-control": "public, max-age=31536000, immutable" } });
  }
  const entry = await db.ledgerEntry.findFirst({ where: { receiptUrl: url }, include: { shopLink: true } });
  if (!entry) throw new HttpError(404, "Fayl topilmadi");

  const who = bearerPayload(req);
  let allowed = false;
  if (who?.kind === "shop") {
    const user = await db.shopUser.findUnique({ where: { id: who.shopUserId } });
    allowed = user?.shopId === entry.shopLink.shopId;
  } else {
    // Xodim: o'sha do'konning qarz daftarini ko'ra oladigan bo'lsa (agent faqat o'z do'konlari)
    const staff = who?.kind === "staff" ? await db.staff.findFirst({ where: { id: who.staffId, active: true } }) : await getStaff();
    allowed = staff ? (await db.shopLink.count({ where: { id: entry.shopLinkId, ...linkScope(staff) } })) > 0 : false;
  }
  if (!allowed) throw new HttpError(403, "Ruxsat yo'q");

  const file = await readUpload(folder, name);
  if (!file) throw new HttpError(404, "Fayl topilmadi");
  return new Response(new Uint8Array(file.data), { headers: { "content-type": file.type, "cache-control": "private, max-age=3600" } });
});
