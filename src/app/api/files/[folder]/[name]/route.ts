import { db } from "@/lib/db";
import { bearerPayload, getStaff, handle, HttpError } from "@/lib/session";
import { linkScope } from "@/lib/staff-data";
import { readUpload } from "@/lib/uploads";

// Yuklangan chekni faqat o'sha do'kon yoki o'sha distribyutor xodimi ko'radi
export const GET = handle(async (req: Request, ctx: { params: Promise<{ folder: string; name: string }> }) => {
  const { folder, name } = await ctx.params;
  const url = `/api/files/${folder}/${name}`;
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
