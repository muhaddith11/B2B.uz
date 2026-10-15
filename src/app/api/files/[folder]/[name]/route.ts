import { db } from "@/lib/db";
import { bearerPayload, getStaff, handle, HttpError, requireShopUser, requireStaff } from "@/lib/session";
import { linkScope } from "@/lib/staff-data";
import { imageInUse, readUpload } from "@/lib/uploads";

// Rasmlar (tovar, logo, do'kon surati, avatar) hammaga ochiq, lekin faqat biror tovar, tashkilot yoki foydalanuvchiga
// biriktirilgan bo'lsa (tashlab yuborilgan fayl berilmaydi). Yuklangan chekni faqat o'sha do'kon yoki o'sha distribyutor xodimi ko'radi.
export const GET = handle(async (req: Request, ctx: { params: Promise<{ folder: string; name: string }> }) => {
  const { folder, name } = await ctx.params;
  const url = `/api/files/${folder}/${name}`;

  if (folder === "products" || folder === "logos" || folder === "avatars") {
    const file = (await imageInUse(folder, url)) ? await readUpload(folder, name) : null;
    if (!file) throw new HttpError(404, "Fayl topilmadi");
    // Fayl nomi tasodifiy va o'zgarmaydi: telefon uzoq saqlaydi, Vercel CDN bir kun keshlaydi
    // (har ochilishda funksiya va baza ishlamaydi; olib tashlangan rasm keshdan ko'pi bilan bir kunda ketadi)
    return new Response(new Uint8Array(file.data), {
      headers: { "content-type": file.type, "cache-control": "public, max-age=31536000, s-maxage=86400, immutable" },
    });
  }
  const entry = await db.ledgerEntry.findFirst({ where: { receiptUrl: url }, include: { shopLink: true } });
  if (!entry) throw new HttpError(404, "Fayl topilmadi");

  // Token tekshiruvi to'liq (hisob o'chirilmagan, "barcha qurilmalardan chiqish" qilinmagan); yaroqsiz bo'lsa ruxsat yo'q
  const who = bearerPayload(req);
  let allowed = false;
  if (who?.kind === "shop") {
    const user = await requireShopUser(req).catch(() => null);
    allowed = user?.shopId === entry.shopLink.shopId;
  } else {
    // Xodim: o'sha do'konning qarz daftarini ko'ra oladigan bo'lsa (agent faqat o'z do'konlari)
    const staff = who?.kind === "staff" ? await requireStaff(req).catch(() => null) : await getStaff();
    allowed = staff ? (await db.shopLink.count({ where: { id: entry.shopLinkId, ...linkScope(staff) } })) > 0 : false;
  }
  if (!allowed) throw new HttpError(403, "Ruxsat yo'q");

  const file = await readUpload(folder, name);
  if (!file) throw new HttpError(404, "Fayl topilmadi");
  return new Response(new Uint8Array(file.data), { headers: { "content-type": file.type, "cache-control": "private, max-age=3600" } });
});
