// Integratsiya testlari: faqat alohida test bazasida ishlaydi. Ishchi yoki production bazaga hech qachon ulanmaydi.
import { existsSync } from "node:fs";

// .env dan TEST_DATABASE_URL olinadi (CI'da muhit o'zgaruvchisi; mavjud qiymatlar almashtirilmaydi)
if (existsSync(".env")) process.loadEnvFile(".env");

const url = process.env.TEST_DATABASE_URL;
const dbName = url ? new URL(url).pathname.replace(/^\//, "") : "";
if (!url || !dbName.endsWith("_test")) {
  throw new Error("TEST_DATABASE_URL o'rnatilmagan yoki baza nomi _test bilan tugamaydi. Integratsiya testlari faqat alohida test bazasida ishlaydi");
}

process.env.DATABASE_URL = url;
process.env.DATABASE_URL_UNPOOLED = url;
process.env.SESSION_SECRET = "integration-test-secret-0123456789abcdef";
process.env.UPLOAD_STORAGE = "db";
process.env.OTP_HOURLY_LIMIT = "1000000";
// SMS xizmati sozlanmagan sinov rejimi: kod javobda qaytadi (devCode), SMS yuborilmaydi
process.env.DEV_AUTH = "1";
// Tovar egasi qismi production'da yopiq, lekin kodi saqlanadi va sinaladi (yopiqligini alohida test tekshiradi)
process.env.BRANDS_ENABLED = "1";
// Testda tashqi xizmatlarga so'rov ketmasin
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.EXPO_ACCESS_TOKEN;
delete process.env.TEXTUP_EMAIL;
delete process.env.ESKIZ_EMAIL;
delete process.env.VERCEL;

// Ikkinchi himoya: ulangan bazaning haqiqiy nomini tekshiramiz
const { db } = await import("@/lib/db");
const [row] = await db.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
if (!row?.name.endsWith("_test")) throw new Error(`Test ${row?.name} bazasiga ulanib qoldi, to'xtatildi`);
