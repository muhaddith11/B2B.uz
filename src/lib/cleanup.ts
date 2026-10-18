import { db } from "./db";

// Kunlik tozalash (Vercel Cron, /api/cron/cleanup). Har biri qayta ishga tushirilsa zarar qilmaydi.
// - SMS kodlar: cheklovlar oxirgi bir soatga qaraydi; bir kundan eskisi faqat telefon raqamini behuda saqlaydi
//   (maxfiylik siyosati: ma'lumot kerakli muddatgacha saqlanadi);
// - hech kimga biriktirilmay qolgan fayllar: yuklash va yozuv orasida server to'xtab qolsa paydo bo'ladi, bazani to'ldiradi.
//   Bir kunlik zaxira vaqti: hozir yuklanayotgan fayl tegilmaydi.

export const OTP_RETENTION_HOURS = 24;
export const ORPHAN_GRACE_HOURS = 24;

export async function cleanup(now = new Date()) {
  const otpBefore = new Date(now.getTime() - OTP_RETENTION_HOURS * 3600_000);
  const fileBefore = new Date(now.getTime() - ORPHAN_GRACE_HOURS * 3600_000);
  const otp = await db.otpCode.deleteMany({ where: { createdAt: { lt: otpBefore } } });
  // Fayl yo'li "/api/files/<papka>/<nom>" ko'rinishida yozuvlarga biriktiriladi (uploads.ts)
  const files = await db.$executeRaw`
    DELETE FROM "StoredFile" f
    WHERE f."createdAt" < ${fileBefore}
      AND NOT EXISTS (SELECT 1 FROM "LedgerEntry" x WHERE x."receiptUrl" = '/api/files/' || f.path)
      AND NOT EXISTS (SELECT 1 FROM "Product" x WHERE x."imageUrl" = '/api/files/' || f.path)
      AND NOT EXISTS (SELECT 1 FROM "BrandProduct" x WHERE x."imageUrl" = '/api/files/' || f.path)
      AND NOT EXISTS (SELECT 1 FROM "Distributor" x WHERE x."logoUrl" = '/api/files/' || f.path)
      AND NOT EXISTS (SELECT 1 FROM "Brand" x WHERE x."logoUrl" = '/api/files/' || f.path)
      AND NOT EXISTS (SELECT 1 FROM "Shop" x WHERE x."imageUrl" = '/api/files/' || f.path)
      AND NOT EXISTS (SELECT 1 FROM "Staff" x WHERE x."avatarUrl" = '/api/files/' || f.path)
      AND NOT EXISTS (SELECT 1 FROM "ShopUser" x WHERE x."avatarUrl" = '/api/files/' || f.path)
      AND NOT EXISTS (SELECT 1 FROM "BrandUser" x WHERE x."avatarUrl" = '/api/files/' || f.path)`;
  return { otpCodes: otp.count, orphanFiles: files };
}
