import { randomInt, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { L } from "./i18n";
import { normalizePhone } from "./phone";
import { HttpError } from "./session";
import { sendSms } from "./sms";
import { keyedHash } from "./token";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const RESEND_AFTER_MS = 60 * 1000;
export const MAX_PER_HOUR = 5;
export const MAX_ATTEMPTS = 5;
// Bitta IP manzildan bir soatda nechta kod (mobil operatorlarda ko'p abonent bitta IP'dan chiqadi, shuning uchun juda kichik emas)
export const MAX_PER_IP_HOUR = 20;
// Butun platforma bo'yicha bir soatda nechta SMS: ko'p raqam va IP'dan hujum SMS hisobini bo'shatib yubormasligi uchun
const globalHourlyLimit = () => Number(process.env.OTP_HOURLY_LIMIT) || 500;
// Kod berishni navbatga qo'yuvchi qulf: bir vaqtdagi parallel so'rovlar cheklovni chetlab o'tmasin
const OTP_LOCK_KEY = 7_204_311;

// Yangi kod yuborish mumkinmi: oxirgi kod bir daqiqadan eski va bir soatda 5 tadan kam
export function sendAllowed(recent: Date[], now: Date): { ok: true } | { ok: false; retryInSec: number } {
  const hourAgo = now.getTime() - 60 * 60 * 1000;
  const lastHour = recent.map((d) => d.getTime()).filter((t) => t > hourAgo);
  const last = Math.max(0, ...lastHour);
  // Parallel so'rovda oldingi kod "now"dan sal keyin yozilgan bo'lishi mumkin: o'tgan vaqt manfiy bo'lmasin
  const elapsed = Math.max(0, now.getTime() - last);
  if (last && elapsed < RESEND_AFTER_MS) {
    return { ok: false, retryInSec: Math.ceil((RESEND_AFTER_MS - elapsed) / 1000) };
  }
  if (lastHour.length >= MAX_PER_HOUR) {
    return { ok: false, retryInSec: Math.ceil((Math.min(...lastHour) + 60 * 60 * 1000 - now.getTime()) / 1000) };
  }
  return { ok: true };
}

const hashOf = (phone: string, code: string) => keyedHash(`otp:${phone}:${code}`);

// Cheklovlar: raqam bo'yicha (sendAllowed), IP bo'yicha va butun platforma bo'yicha.
// Tekshiruv va yozuv bitta qulf ostida: parallel so'rovlar bir-birini ko'rmay o'tib ketmaydi.
export async function issueOtp(phone: string, ip: string | null, now = new Date(), fixedCode?: string): Promise<string> {
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const code = fixedCode ?? String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${OTP_LOCK_KEY})`;
    const recent = await tx.otpCode.findMany({ where: { phone, createdAt: { gt: hourAgo } }, select: { createdAt: true } });
    const allowed = sendAllowed(
      recent.map((r) => r.createdAt),
      now,
    );
    if (!allowed.ok) throw new HttpError(429, L("Yangi kodni {sec} soniyadan keyin so'rang", { sec: allowed.retryInSec }));

    const fromIp = ip ? await tx.otpCode.count({ where: { ip, createdAt: { gt: hourAgo } } }) : 0;
    const total = await tx.otpCode.count({ where: { createdAt: { gt: hourAgo } } });
    if (fromIp >= MAX_PER_IP_HOUR) throw new HttpError(429, "Bu tarmoqdan juda ko'p kod so'raldi. Birozdan keyin urinib ko'ring");
    if (total >= globalHourlyLimit()) {
      console.error(`OTP: soatlik umumiy chegara (${globalHourlyLimit()}) to'ldi`);
      throw new HttpError(429, "Kod yuborish vaqtincha cheklangan. Birozdan keyin urinib ko'ring");
    }

    await tx.otpCode.create({ data: { phone, ip, codeHash: hashOf(phone, code), expiresAt: new Date(now.getTime() + OTP_TTL_MS) } });
  });
  return code;
}

// So'rov kelgan IP: Vercel x-real-ip va x-forwarded-for sarlavhalarini o'zi qo'yadi (mijoz yuborganini almashtiradi)
export function clientIp(headers: Headers): string | null {
  const ip = headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0];
  return ip?.trim().slice(0, 64) || null;
}

// Ilova, panel va admin uchun bitta matn: SMS xizmatida (TextUP) bitta shablon tasdiqlatiladi.
// OTP_SMS_TEXT bilan almashtirish mumkin ({code} o'rniga kod qo'yiladi)
const DEFAULT_OTP_TEXT = "Captar: kirish kodi {code}. Kodni hech kimga bermang.";
export function otpSmsText(code: string): string {
  return (process.env.OTP_SMS_TEXT || DEFAULT_OTP_TEXT).replace("{code}", code);
}

// App Store va Google Play tekshiruvchilari uchun: REVIEW_PHONE raqamiga SMS yuborilmaydi, kod har doim REVIEW_CODE.
// Ikkalasi ham to'g'ri yozilgandagina ishlaydi; raqamga faqat demo hisoblar bog'lanadi (npm run db:review)
export function reviewCodeFor(phone: string): string | null {
  const reviewPhone = normalizePhone(process.env.REVIEW_PHONE ?? "");
  const code = process.env.REVIEW_CODE ?? "";
  return reviewPhone && reviewPhone === phone && /^\d{6}$/.test(code) ? code : null;
}

// Kod yaratib, SMS bilan yuboradi. SMS ketmasa kod o'chiriladi: foydalanuvchi bir daqiqa kutmasdan qayta urina oladi.
export async function deliverOtp(phone: string, ip: string | null): Promise<string> {
  const review = reviewCodeFor(phone);
  const code = await issueOtp(phone, ip, new Date(), review ?? undefined);
  if (review) return code;
  try {
    await sendSms(phone, otpSmsText(code));
  } catch (e) {
    console.error("SMS yuborilmadi:", e);
    await db.otpCode.deleteMany({ where: { phone, codeHash: hashOf(phone, code) } });
    throw new HttpError(502, "SMS yuborilmadi. Birozdan keyin qayta urinib ko'ring");
  }
  return code;
}

// Faqat eng oxirgi kod amal qiladi; har bir noto'g'ri urinish sanaladi
export async function verifyOtp(phone: string, code: string, now = new Date()): Promise<void> {
  const otp = await db.otpCode.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
  if (!otp || otp.usedAt || otp.expiresAt < now) throw new HttpError(400, "Kod eskirgan. Yangi kod so'rang");
  if (otp.attempts >= MAX_ATTEMPTS) throw new HttpError(429, "Urinishlar ko'p bo'ldi. Yangi kod so'rang");

  const a = Buffer.from(hashOf(phone, code));
  const b = Buffer.from(otp.codeHash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new HttpError(400, "Kod noto'g'ri");
  }
  // Bir kod faqat bir marta ishlatiladi (bir vaqtdagi ikki so'rovda ham)
  const used = await db.otpCode.updateMany({ where: { id: otp.id, usedAt: null }, data: { usedAt: now } });
  if (used.count === 0) throw new HttpError(400, "Kod allaqachon ishlatilgan");
}
