import { z } from "zod";
import { deliverOtp } from "@/lib/otp";
import { normalizePhone } from "@/lib/phone";
import { errorResponse, HttpError } from "@/lib/session";
import { exposeCode } from "@/lib/sms";

// Mobil ilova: telefon raqamiga kirish kodini yuborish
export async function POST(req: Request) {
  try {
    const parsed = z.object({ phone: z.string() }).safeParse(await req.json().catch(() => null));
    const phone = parsed.success ? normalizePhone(parsed.data.phone) : null;
    if (!phone) throw new HttpError(400, "Telefon raqami +998 XX XXX XX XX ko'rinishida bo'lsin");

    const code = await deliverOtp(phone);
    // Sinov yoki demo rejimida SMS xizmati sozlanmagan bo'lsa, kod javobda qaytadi
    return Response.json({ ok: true, phone, devCode: exposeCode() ? code : undefined });
  } catch (e) {
    return errorResponse(e);
  }
}
