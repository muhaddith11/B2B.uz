import { db } from "@/lib/db";
import { bearerPayload, getStaff, handle, HttpError } from "@/lib/session";
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
  } else if (who?.kind === "staff") {
    const staff = await db.staff.findFirst({ where: { id: who.staffId, active: true } });
    allowed = staff?.distributorId === entry.shopLink.distributorId;
  } else {
    const staff = await getStaff();
    allowed = staff?.distributorId === entry.shopLink.distributorId;
  }
  if (!allowed) throw new HttpError(403, "Ruxsat yo'q");

  const file = await readUpload(folder, name);
  if (!file) throw new HttpError(404, "Fayl topilmadi");
  return new Response(new Uint8Array(file.data), { headers: { "content-type": file.type, "cache-control": "private, max-age=3600" } });
});
