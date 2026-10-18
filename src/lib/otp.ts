import { randomInt, timingSafeEqual } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { L } from "./i18n";
import { reportError } from "./monitoring";
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
// Tizimda hisobi YO'Q raqamlarga bir soatda nechta SMS (butun platforma bo'yicha): ko'p raqam va IP'dan hujum SMS hisobini
// bo'shatib yubormasligi uchun. Hisobi bor raqamlarga bu chegara tegmaydi: hujumchi tasodifiy raqamlarga kod so'rab chegarani
// to'ldirsa ham, mavjud do'kon va xodimlar kiraveradi (ular raqam va IP bo'yicha cheklangan, soni esa foydalanuvchilar soni bilan chegaralangan)
const globalHourlyLimit = () => Number(process.env.OTP_HOURLY_LIMIT) || 500;
// Advisory lock nom fazolari (ikki kalitli variant): raqam va IP qulflari bir-biri bilan to'qnashmaydi
const LOCK_PHONE = 1;
const LOCK_IP = 2;

// Kod nima uchun so'ralgan: bir maqsadga yuborilgan kod boshqasida ishlamaydi. Masalan, kirish uchun aldab olingan kod
// bilan hisobni o'chirib bo'lmaydi, platforma admini kodi esa faqat /admin ga kiritadi
export type OtpPurpose = "login" | "admin" | "delete";

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

// Raqamga biror hisob bog'langanmi: do'kon, faol xodim yoki tovar egasi
async function phoneKnown(tx: Prisma.TransactionClient, phone: string): Promise<boolean> {
  const [shop, staff, brand] = await Promise.all([
    tx.shopUser.count({ where: { phone } }),
    tx.staff.count({ where: { phone, active: true } }),
    tx.brandUser.count({ where: { phone } }),
  ]);
  return shop + staff + brand > 0;
}

// Cheklovlar: raqam bo'yicha (sendAllowed), IP bo'yicha va hisobi yo'q raqamlar uchun butun platforma bo'yicha.
// Tekshiruv va yozuv shu raqam va shu IP qulfi ostida: parallel so'rovlar bir-birini ko'rmay o'tib ketmaydi.
// Turli raqam va IP'dan kelgan so'rovlar esa bir-birini kutmaydi (umumiy chegara parallel so'rovlar soniga sal oshishi mumkin: bu xarajat chegarasi, aniq hisob emas)
export async function issueOtp(phone: string, ip: string | null, now = new Date(), fixedCode?: string, purpose: OtpPurpose = "login"): Promise<string> {
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const code = fixedCode ?? String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.$transaction(async (tx) => {
    // Qulflar doim bir tartibda (avval raqam, keyin IP): ikki so'rov bir-birini abadiy kutib qolmaydi
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_PHONE}::int, hashtext(${phone}))`;
    if (ip) await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_IP}::int, hashtext(${ip}))`;
    const recent = await tx.otpCode.findMany({ where: { phone, createdAt: { gt: hourAgo } }, select: { createdAt: true } });
    const allowed = sendAllowed(
      recent.map((r) => r.createdAt),
      now,
    );
    if (!allowed.ok) throw new HttpError(429, L("Yangi kodni {sec} soniyadan keyin so'rang", { sec: allowed.retryInSec }));

    const fromIp = ip ? await tx.otpCode.count({ where: { ip, createdAt: { gt: hourAgo } } }) : 0;
    if (fromIp >= MAX_PER_IP_HOUR) throw new HttpError(429, "Bu tarmoqdan juda ko'p kod so'raldi. Birozdan keyin urinib ko'ring");

    const known = await phoneKnown(tx, phone);
    if (!known) {
      const total = await tx.otpCode.count({ where: { knownPhone: false, createdAt: { gt: hourAgo } } });
      if (total >= globalHourlyLimit()) {
        // Ehtimoliy hujum: darhol xabar (Telegram), lekin hisobi bor foydalanuvchilar kiraveradi
        reportError(new Error("OTP: yangi raqamlar uchun soatlik chegara to'ldi"), { area: "otp", limit: globalHourlyLimit() }, "fatal");
        throw new HttpError(429, "Kod yuborish vaqtincha cheklangan. Birozdan keyin urinib ko'ring");
      }
    }

    await tx.otpCode.create({ data: { phone, ip, purpose, knownPhone: known, codeHash: hashOf(phone, code), expiresAt: new Date(now.getTime() + OTP_TTL_MS) } });
  });
  return code;
}

// So'rov kelgan IP: Vercel x-real-ip va x-forwarded-for sarlavhalarini o'zi qo'yadi (mijoz yuborganini almashtiradi)
export function clientIp(headers: Headers): string | null {
  const ip = headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0];
  return ip?.trim().slice(0, 64) || null;
}

// Ilova, panel va admin uchun bitta matn: SMS xizmatida (TextUP) bitta shablon tasdiqlatiladi.
// OTP_SMS_TEXT bilan almashtirish mumkin ({code} o'rniga kod qo'yiladi).
// Hisobni o'chirish kodi uchun alohida matn: OTP_DELETE_SMS_TEXT (TextUP'da shablon tasdiqlangach yoziladi; bo'sh bo'lsa umumiy matn)
const DEFAULT_OTP_TEXT = "Captar ilovasi kirish kodi {code}. Kodni hech kimga bermang.";
export function otpSmsText(code: string, purpose: OtpPurpose = "login"): string {
  const template = (purpose === "delete" && process.env.OTP_DELETE_SMS_TEXT) || process.env.OTP_SMS_TEXT || DEFAULT_OTP_TEXT;
  return template.replace("{code}", code);
}

// App Store va Google Play tekshiruvchilari uchun: REVIEW_PHONE raqamiga SMS yuborilmaydi, kod har doim REVIEW_CODE.
// Ikkalasi ham to'g'ri yozilgandagina ishlaydi; raqamga faqat demo hisoblar bog'lanadi (npm run db:review)
export function reviewCodeFor(phone: string): string | null {
  const reviewPhone = normalizePhone(process.env.REVIEW_PHONE ?? "");
  const code = process.env.REVIEW_CODE ?? "";
  return reviewPhone && reviewPhone === phone && /^\d{6}$/.test(code) ? code : null;
}

// Kod yaratib, SMS bilan yuboradi. SMS ketmasa kod o'chiriladi: foydalanuvchi bir daqiqa kutmasdan qayta urina oladi.
export async function deliverOtp(phone: string, ip: string | null, purpose: OtpPurpose = "login"): Promise<string> {
  const review = reviewCodeFor(phone);
  const code = await issueOtp(phone, ip, new Date(), review ?? undefined, purpose);
  if (review) return code;
  try {
    await sendSms(phone, otpSmsText(code, purpose));
  } catch (e) {
    reportError(e, { area: "sms", purpose });
    await db.otpCode.deleteMany({ where: { phone, codeHash: hashOf(phone, code) } });
    throw new HttpError(502, "SMS yuborilmadi. Birozdan keyin qayta urinib ko'ring");
  }
  return code;
}

// Shu maqsaddagi eng oxirgi kod amal qiladi; har bir urinish (to'g'risi ham) sanaladi
export async function verifyOtp(phone: string, code: string, now = new Date(), purpose: OtpPurpose = "login"): Promise<void> {
  const otp = await db.otpCode.findFirst({ where: { phone, purpose }, orderBy: { createdAt: "desc" } });
  if (!otp || otp.usedAt || otp.expiresAt < now) throw new HttpError(400, "Kod eskirgan. Yangi kod so'rang");

  // Urinish kod solishtirilishidan OLDIN, shart bilan band qilinadi: bir vaqtda yuborilgan yuzlab so'rov ham
  // MAX_ATTEMPTS tadan ortiq kodni sinab ko'ra olmaydi (avval o'qib, keyin oshirilsa, hammasi 0 ni ko'rib o'tib ketardi)
  const slot = await db.otpCode.updateMany({ where: { id: otp.id, usedAt: null, attempts: { lt: MAX_ATTEMPTS } }, data: { attempts: { increment: 1 } } });
  if (slot.count === 0) throw new HttpError(429, "Urinishlar ko'p bo'ldi. Yangi kod so'rang");

  const a = Buffer.from(hashOf(phone, code));
  const b = Buffer.from(otp.codeHash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(400, "Kod noto'g'ri");
  // Bir kod faqat bir marta ishlatiladi (bir vaqtdagi ikki so'rovda ham)
  const used = await db.otpCode.updateMany({ where: { id: otp.id, usedAt: null }, data: { usedAt: now } });
  if (used.count === 0) throw new HttpError(400, "Kod allaqachon ishlatilgan");
  // Raqam egasi kod bilan tasdiqlandi: agent shu raqamga qo'shgan do'konlar endi egasining roziligi bilan ishlaydi (nasiya ochiladi)
  if (purpose === "login") await markOwnerVerified(phone, now);
}

export async function markOwnerVerified(phone: string, now = new Date()): Promise<void> {
  await db.shop.updateMany({ where: { verifiedAt: null, users: { some: { phone, role: "OWNER" } } }, data: { verifiedAt: now } });
}
