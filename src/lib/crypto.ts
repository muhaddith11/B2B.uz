import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// To'lov tizimi kalitlari (Payme, Click) bazada shifrlangan saqlanadi: AES-256-GCM.
// Shifrlash kaliti sessiya kalitidan alohida: PAYMENT_KEYS_SECRET. Shunda SESSION_SECRET ni almashtirish (masalan, sizib chiqsa)
// distribyutorlarning kassa kalitlarini yo'qotmaydi. Yangi yozuvlar "v2:" bilan boshlanadi.
// Eski yozuvlar (prefiksiz) SESSION_SECRET dan olingan kalit bilan shifrlangan: o'qiladi, `npm run keys:reencrypt` ularni v2 ga o'tkazadi.

const V2 = "v2:";

function derive(label: string, secret: string): Buffer {
  return createHash("sha256").update(`${label}:${secret}`).digest();
}

function paymentKey(): Buffer | null {
  const s = process.env.PAYMENT_KEYS_SECRET;
  if (!s) return null;
  if (s.length < 32) throw new Error("PAYMENT_KEYS_SECRET kamida 32 belgidan iborat bo'lishi kerak");
  return derive("payment-keys-v2", s);
}

// Eski format: SESSION_SECRET (yoki almashtirish davrida SESSION_SECRET_PREVIOUS) dan olingan kalit
function legacyKeys(): Buffer[] {
  return [process.env.SESSION_SECRET, process.env.SESSION_SECRET_PREVIOUS].filter((s): s is string => Boolean(s && s.length >= 32)).map((s) => derive("payment-keys", s));
}

function seal(key: Buffer, plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}

function open(key: Buffer, enc: string): string {
  const buf = Buffer.from(enc, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

export function encryptSecret(plain: string): string {
  const key = paymentKey();
  if (key) return V2 + seal(key, plain);
  const [legacy] = legacyKeys();
  if (!legacy) throw new Error("SESSION_SECRET kamida 32 belgidan iborat bo'lishi kerak");
  return seal(legacy, plain);
}

export function decryptSecret(enc: string): string {
  if (enc.startsWith(V2)) {
    const key = paymentKey();
    if (!key) throw new Error("PAYMENT_KEYS_SECRET o'rnatilmagan: v2 kalitni ochib bo'lmaydi");
    return open(key, enc.slice(V2.length));
  }
  for (const key of legacyKeys()) {
    try {
      return open(key, enc);
    } catch {
      /* keyingi kalit */
    }
  }
  throw new Error("To'lov kaliti ochilmadi: SESSION_SECRET almashgan bo'lishi mumkin");
}

// Eski formatdagi yozuvmi (v2 ga o'tkazish kerak)
export function isLegacySecret(enc: string): boolean {
  return !enc.startsWith(V2);
}
