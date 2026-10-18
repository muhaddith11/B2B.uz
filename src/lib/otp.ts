import { randomInt, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import type { Prisma } from "@prisma/client";
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
// Butun platforma bo'yicha bir soatda hisobi yo'q raqamlarga nechta SMS: ko'p raqam va IP'dan hujum SMS hisobini bo'shatib
// yubormasligi uchun. Hisobi bor raqamga (kirish, panel, obuna, o'chirish) bu chegara qo'llanmaydi: tasodifiy raqamlarga kod
// so'rab chegarani to'ldirgan hujum mavjud foydalanuvchilarning kirishini to'xtatib qo'ymaydi (ular raqam va IP bo'yicha cheklanadi)
const globalHourlyLimit = () => Number(process.env.OTP_HOURLY_LIMIT) || 500;
// Kod berishni navbatga qo'yuvchi qulf: bir vaqtdagi parallel so'rovlar cheklovni chetlab o'tmasin
const OTP_LOCK_KEY = 7_204_311;

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

// Raqamga biror hisob (do'kon, faol xodim, tovar egasi) bog'langanmi
async function hasAccount(tx: Prisma.TransactionClient, phone: string): Promise<boolean> {
  const [shop, staff, brand] = await Promise.all([
    tx.shopUser.count({ where: { phone } }),
    tx.staff.count({ where: { phone, active: true } }),
    tx.brandUser.count({ where: { phone } }),
  ]);
  return shop + staff + brand > 0;
}

// Cheklovlar: raqam bo'yicha (sendAllowed), IP bo'yicha va butun platforma bo'yicha.
// Tekshiruv va yozuv bitta qulf ostida: parallel so'rovlar bir-birini ko'rmay o'tib ketmaydi.
export async function issueOtp(phone: string, ip: string | null, now = new Date(), fixedCode?: string, purpose: OtpPurpose = "login"): Promise<string> {
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
    if (fromIp >= MAX_PER_IP_HOUR) throw new HttpError(429, "Bu tarmoqdan juda ko'p kod so'raldi. Birozdan keyin urinib ko'ring");
    // Hisobni o'chirish va admin kodi faqat mavjud hisobga so'raladi; kirish kodi yangi raqamga ham (ro'yxatdan o'tish)
    const newPhone = purpose === "login" && !(await hasAccount(tx, phone));
    if (newPhone) {
      const total = await tx.otpCode.count({ where: { newPhone: true, createdAt: { gt: hourAgo } } });
      if (total >= globalHourlyLimit()) {
        console.error(`OTP: yangi raqamlar uchun soatlik umumiy chegara (${globalHourlyLimit()}) to'ldi`);
        throw new HttpError(429, "Kod yuborish vaqtincha cheklangan. Birozdan keyin urinib ko'ring");
      }
    }

    await tx.otpCode.create({ data: { phone, ip, purpose, newPhone, codeHash: hashOf(phone, code), expiresAt: new Date(now.getTime() + OTP_TTL_MS) } });
  });
  return code;
}

// IP bo'yicha cheklov kaliti: IPv4 manzilning o'zi, IPv6 uchun /64 tarmoq. Bitta abonentga odatda butun /64 tarmoq beriladi:
// har so'rovda manzilni almashtirib (IPv6 da bu tekin) cheklovni aylanib o'tib bo'lmaydi
export function ipKey(raw: string): string {
  const ip = raw.trim().replace(/^\[|\]$/g, "").replace(/%.*$/, "");
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped) return mapped[1];
  if (isIP(ip) !== 6) return ip.slice(0, 64);
  const [head, tail] = ip.split("::");
  const groups = (s: string | undefined) => (s ? s.split(":") : []);
  // Oxirida IPv4 yozuvi bo'lsa (masalan, 64:ff9b::1.2.3.4), u ikki guruh o'rnida
  const size = (s: string | undefined) => groups(s).reduce((n, g) => n + (g.includes(".") ? 2 : 1), 0);
  const full = tail === undefined ? groups(head) : [...groups(head), ...Array<string>(8 - size(head) - size(tail)).fill("0"), ...groups(tail)];
  return `${full
    .slice(0, 4)
    .map((g) => parseInt(g, 16).toString(16))
    .join(":")}::/64`;
}

// So'rov kelgan IP: Vercel x-real-ip va x-forwarded-for sarlavhalarini o'zi qo'yadi (mijoz yuborganini almashtiradi)
export function clientIp(headers: Headers): string | null {
  const ip = (headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0])?.trim();
  return ip ? ipKey(ip) : null;
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
    console.error("SMS yuborilmadi:", e);
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
}
