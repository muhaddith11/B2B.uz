import { z } from "zod";
import { clientIp, deliverOtp } from "@/lib/otp";
import { normalizePhone } from "@/lib/phone";
import { handle, HttpError, readJson } from "@/lib/session";
import { exposeCode } from "@/lib/sms";

// Mobil ilova: telefon raqamiga kirish kodini yuborish
export const POST = handle(async (req: Request) => {
  const message = "Telefon raqami +998 XX XXX XX XX ko'rinishida bo'lsin";
  const phone = normalizePhone((await readJson(req, z.object({ phone: z.string() }), message)).phone);
  if (!phone) throw new HttpError(400, message);

  const code = await deliverOtp(phone, clientIp(req.headers));
  // Sinov yoki demo rejimida SMS xizmati sozlanmagan bo'lsa, kod javobda qaytadi
  return Response.json({ ok: true, phone, devCode: exposeCode() ? code : undefined });
});
