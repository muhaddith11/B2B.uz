import { createHmac, timingSafeEqual } from "node:crypto";

// Imzolangan token: mobil ilova uchun Authorization sarlavhasida, panel va admin uchun cookie'da yuradi.

// iat: berilgan vaqt (ms). "Barcha qurilmalardan chiqish"dan oldin berilgan token bekor bo'ladi (session.ts).
// Eski tokenlarda iat yo'q: 0 deb olinadi
type Issued = { exp: number; iat?: number };

export type SessionPayload = Issued &
  (
    | { kind: "shop"; shopUserId: string }
    | { kind: "staff"; staffId: string }
    | { kind: "brand"; brandUserId: string }
    // Platforma admini (web /admin): distribyutor va tovar egalarini tasdiqlaydi
    | { kind: "admin"; phone: string }
    // SMS kod bilan tasdiqlangan, lekin hali hisobi yo'q telefon: faqat ro'yxatdan o'tish uchun
    | { kind: "phone"; phone: string }
  );

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
  const data = Buffer.from(JSON.stringify({ ...payload, iat: payload.iat ?? Date.now() })).toString("base64url");
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
