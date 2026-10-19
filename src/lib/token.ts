import { createHmac, timingSafeEqual } from "node:crypto";

// Imzolangan token: mobil ilova uchun Authorization sarlavhasida, panel, admin va obuna sahifasi uchun cookie'da yuradi.

// Token qayerda ishlaydi (aud). Har biri faqat o'z joyida qabul qilinadi: masalan, agentning ilova tokeni panel cookie'siga
// qo'yilsa ham panel ochilmaydi, panel cookie'si esa ilova API'sida ishlamaydi. Eski (aud'siz) tokenlar "app" hisoblanadi
export type Audience = "app" | "panel" | "admin" | "obuna";

// iat: berilgan vaqt (ms). "Barcha qurilmalardan chiqish"dan oldin berilgan token bekor bo'ladi (session.ts).
// Eski tokenlarda iat yo'q: 0 deb olinadi
type Issued = { exp: number; iat?: number; aud?: Audience };

export type SessionPayload = Issued &
  (
    | { kind: "shop"; shopUserId: string }
    | { kind: "staff"; staffId: string }
    | { kind: "brand"; brandUserId: string }
    // Platforma admini (web /admin): distribyutor va tovar egalarini tasdiqlaydi
    | { kind: "admin"; phone: string }
    // SMS kod bilan tasdiqlangan, lekin hali hisobi yo'q telefon: faqat ro'yxatdan o'tish (yoki obuna sahifasi) uchun
    | { kind: "phone"; phone: string }
  );

function checked(s: string | undefined, name: string): string {
  if (!s || s.length < 32) throw new Error(`${name} kamida 32 belgidan iborat bo'lishi kerak`);
  return s;
}

// Joriy kalit bilan imzolanadi. Kalitni almashtirishda eskisi SESSION_SECRET_PREVIOUS ga yoziladi: u bilan imzolangan
// tokenlar muddati tugaguncha ishlayveradi, foydalanuvchilar qayta kirishi shart emas (docs/SECURITY.md)
function secret(): string {
  return checked(process.env.SESSION_SECRET, "SESSION_SECRET");
}

function verificationSecrets(): string[] {
  const prev = process.env.SESSION_SECRET_PREVIOUS;
  return prev ? [secret(), checked(prev, "SESSION_SECRET_PREVIOUS")] : [secret()];
}

function sign(data: string, key = secret()): string {
  return createHmac("sha256", key).update(data).digest("base64url");
}

// Maxfiy kalit bilan xesh (masalan, SMS kodini bazada ochiq saqlamaslik uchun). Imzo kalitidan alohida, undan hosil qilingan kalit:
// bir maqsadning qiymati boshqasida ishlamaydi
export function keyedHash(data: string): string {
  const key = createHmac("sha256", secret()).update("keyed-hash:v1").digest();
  return createHmac("sha256", key).update(data).digest("hex");
}

export function signToken(payload: SessionPayload, aud: Audience = "app"): string {
  const data = Buffer.from(JSON.stringify({ ...payload, aud, iat: payload.iat ?? Date.now() })).toString("base64url");
  return `${data}.${sign(data)}`;
}

function signatureValid(data: string, sig: string): boolean {
  const b = Buffer.from(sig);
  return verificationSecrets().some((key) => {
    const a = Buffer.from(sign(data, key));
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

export function verifyToken(token: string | null | undefined, aud: Audience = "app", now = Date.now()): SessionPayload | null {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig || !signatureValid(data, sig)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < now / 1000) return null;
    if ((payload.aud ?? "app") !== aud) return null;
    return payload;
  } catch {
    return null;
  }
}

export const DAY_SECONDS = 24 * 60 * 60;
