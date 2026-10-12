import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// To'lov tizimi kalitlari (Payme, Click) bazada shifrlangan saqlanadi: AES-256-GCM.
// Kalit SESSION_SECRET dan olinadi, shuning uchun uni almashtirsangiz, kalitlarni qayta kiritish kerak.
function key(): Buffer {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET kamida 32 belgidan iborat bo'lishi kerak");
  return createHash("sha256").update(`payment-keys:${s}`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}

export function decryptSecret(enc: string): string {
  const buf = Buffer.from(enc, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}
