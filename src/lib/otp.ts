import { randomInt, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { HttpError } from "./session";
import { sendSms } from "./sms";
import { keyedHash } from "./token";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const RESEND_AFTER_MS = 60 * 1000;
export const MAX_PER_HOUR = 5;
export const MAX_ATTEMPTS = 5;

// Yangi kod yuborish mumkinmi: oxirgi kod bir daqiqadan eski va bir soatda 5 tadan kam
export function sendAllowed(recent: Date[], now: Date): { ok: true } | { ok: false; retryInSec: number } {
  const hourAgo = now.getTime() - 60 * 60 * 1000;
  const lastHour = recent.map((d) => d.getTime()).filter((t) => t > hourAgo);
  const last = Math.max(0, ...lastHour);
  if (last && now.getTime() - last < RESEND_AFTER_MS) {
    return { ok: false, retryInSec: Math.ceil((RESEND_AFTER_MS - (now.getTime() - last)) / 1000) };
  }
  if (lastHour.length >= MAX_PER_HOUR) {
    return { ok: false, retryInSec: Math.ceil((Math.min(...lastHour) + 60 * 60 * 1000 - now.getTime()) / 1000) };
  }
  return { ok: true };
}

const hashOf = (phone: string, code: string) => keyedHash(`otp:${phone}:${code}`);

export async function issueOtp(phone: string, now = new Date()): Promise<string> {
  const recent = await db.otpCode.findMany({
    where: { phone, createdAt: { gt: new Date(now.getTime() - 60 * 60 * 1000) } },
    select: { createdAt: true },
  });
  const allowed = sendAllowed(
    recent.map((r) => r.createdAt),
    now,
  );
  if (!allowed.ok) throw new HttpError(429, `Yangi kodni ${allowed.retryInSec} soniyadan keyin so'rang`);

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.otpCode.create({ data: { phone, codeHash: hashOf(phone, code), expiresAt: new Date(now.getTime() + OTP_TTL_MS) } });
  return code;
}

// Ilova, panel va admin uchun bitta matn: SMS xizmatida (TextUP) bitta shablon tasdiqlatiladi.
// OTP_SMS_TEXT bilan almashtirish mumkin ({code} o'rniga kod qo'yiladi)
const DEFAULT_OTP_TEXT = "Captar: kirish kodi {code}. Kodni hech kimga bermang.";
export function otpSmsText(code: string): string {
  return (process.env.OTP_SMS_TEXT || DEFAULT_OTP_TEXT).replace("{code}", code);
}

// Kod yaratib, SMS bilan yuboradi. SMS ketmasa kod o'chiriladi: foydalanuvchi bir daqiqa kutmasdan qayta urina oladi.
export async function deliverOtp(phone: string): Promise<string> {
  const code = await issueOtp(phone);
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
