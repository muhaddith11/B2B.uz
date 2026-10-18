// Bazadagi fayllarni (StoredFile: cheklar, rasmlar) Vercel Blob omboriga ko'chirish.
// Blob ombori ulangandan keyin bir marta ishga tushiriladi (BLOB_READ_WRITE_TOKEN va DATABASE_URL production'niki):
//   npm run files:to-blob
// Ko'chirish davomida ham fayllar ko'rinadi: Blob'da topilmasa bazadan o'qiladi (src/lib/uploads.ts). Har fayl Blob'ga
// yozilib, qayta o'qib tekshirilgandan keyingina bazadan o'chiriladi. Qayta ishga tushirilsa, qolganini davom ettiradi.
import { PrismaClient } from "@prisma/client";
import { get, put } from "@vercel/blob";

const db = new PrismaClient();
const BATCH = 50;

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN o'rnatilmagan");
  let moved = 0;
  let cursor: string | undefined;
  for (;;) {
    const rows = await db.storedFile.findMany({ select: { id: true }, orderBy: { id: "asc" }, take: BATCH, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;
    for (const { id } of rows) {
      const f = await db.storedFile.findUnique({ where: { id } });
      if (!f) continue;
      await put(f.path, Buffer.from(f.data), { access: "private", contentType: f.type, addRandomSuffix: false, allowOverwrite: true });
      const check = await get(f.path, { access: "private" });
      if (!check || check.statusCode !== 200) throw new Error(`Blob'ga yozilmadi: ${f.path}`);
      await db.storedFile.delete({ where: { id } });
      moved++;
    }
    console.log(`ko'chirildi: ${moved}`);
  }
  console.log(`Tayyor: ${moved} ta fayl Blob'ga ko'chirildi`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
