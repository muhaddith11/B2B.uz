import { createHmac, timingSafeEqual } from "node:crypto";

// Imzolangan token: Mini App uchun Authorization sarlavhasida, panel uchun cookie'da yuradi.
// Telegram Web'da Mini App iframe ichida ochiladi, shuning uchun do'kon tomonida cookie emas, token ishlatiladi.

export type SessionPayload =
  | { kind: "shop"; shopUserId: string; exp: number }
  | { kind: "staff"; staffId: string; exp: number }
  | { kind: "brand"; brandUserId: string; exp: number }
  // Platforma admini (web /admin): distribyutor va tovar egalarini tasdiqlaydi
  | { kind: "admin"; phone: string; exp: number }
  // SMS kod bilan tasdiqlangan, lekin hali hisobi yo'q telefon: faqat ro'yxatdan o'tish uchun
  | { kind: "phone"; phone: string; exp: number };

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET kamida 32 belgidan iborat bo'lishi kerak");
  return s;
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

// Maxfiy kalit bilan xesh (masalan, SMS kodini bazada ochiq saqlamaslik uchun)
export function keyedHash(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("hex");
}

export function signToken(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function verifyToken(token: string | null | undefined, now = Date.now()): SessionPayload | null {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const a = Buffer.from(sign(data));
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as SessionPayload;
    if (payload.exp < now / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export const DAY_SECONDS = 24 * 60 * 60;
