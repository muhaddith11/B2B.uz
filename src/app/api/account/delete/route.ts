import { z } from "zod";
import { accountPhone, assertDeletable, deleteAccount } from "@/lib/account";
import { verifyOtp } from "@/lib/otp";
import { handle, readJson, requireAccount } from "@/lib/session";

// Mobil ilova: hozir kirgan hisobni o'chirish. Qaytarib bo'lmaydigan amal, shuning uchun telefon egasi
// alohida SMS kod bilan tasdiqlaydi (delete/code): qo'lga tushgan telefon yoki sessiya bilan hisobni o'chirib bo'lmaydi
export const POST = handle(async (req: Request) => {
  const { code } = await readJson(req, z.object({ code: z.string().regex(/^\d{6}$/) }), "SMS koddagi 6 ta raqamni kiriting");
  const account = await requireAccount(req);
  await assertDeletable([account]);
  await verifyOtp(await accountPhone(account), code, new Date(), "delete");
  await deleteAccount(account);
  return Response.json({ ok: true });
});
