import { accountPhone, assertDeletable } from "@/lib/account";
import { clientIp, deliverOtp } from "@/lib/otp";
import { handle, requireAccount } from "@/lib/session";
import { exposeCode } from "@/lib/sms";

// Hisobni o'chirishni tasdiqlash kodi: hisob bog'langan raqamga. Bu kod bilan ilovaga kirib bo'lmaydi va aksincha
export const POST = handle(async (req: Request) => {
  const account = await requireAccount(req);
  // Yagona admin avval jamoani boshqasiga topshiradi: SMS behuda yuborilmasin
  await assertDeletable([account]);
  const phone = await accountPhone(account);
  const code = await deliverOtp(phone, clientIp(req.headers), "delete");
  return Response.json({ ok: true, phone, devCode: exposeCode() ? code : undefined });
});
