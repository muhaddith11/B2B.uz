import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, get, put } from "@vercel/blob";
import { db } from "./db";
import { HttpError } from "./session";

// Yuklangan fayllar: to'lov cheklari, tovar rasmlari, logolar (distribyutor, tovar egasi, do'kon surati) va avatarlar.
// Ochiq havola yo'q: fayl faqat /api/files orqali beriladi (chek ruxsat tekshirilgandan keyin, rasmlar esa hammaga,
// faqat biror tovar, tashkilot yoki foydalanuvchiga biriktirilgan bo'lsa).
// Qayerda: BLOB_READ_WRITE_TOKEN bo'lsa yopiq Vercel Blob omborida; Vercel'da (yoki UPLOAD_STORAGE=db) bazada;
// aks holda diskda (UPLOAD_DIR yoki ./uploads).

const ROOT = path.resolve(process.env.UPLOAD_DIR || "uploads");
// Vercel funksiyasi 4,5 MB dan katta so'rov tanasini qabul qilmaydi
const MAX_BYTES = 4 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "application/pdf": "pdf" };
// Rasmlar barcha telefonlarda ko'rinishi kerak: HEIC va PDF emas
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export type UploadFolder = "receipts" | "products" | "logos" | "avatars";
export type ImageFolder = Exclude<UploadFolder, "receipts">;

function backend(): "blob" | "db" | "disk" {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  if (process.env.UPLOAD_STORAGE === "db" || process.env.VERCEL) return "db";
  return "disk";
}

export type PreparedUpload = { buf: Buffer<ArrayBuffer>; type: string; ext: string; hash: string };

// Faylni tekshirib o'qiydi va xeshini hisoblaydi, lekin hali saqlamaydi (masalan, takroriy chekni saqlashdan oldin rad etish uchun)
export async function prepareUpload(file: File): Promise<PreparedUpload> {
  if (file.size === 0) throw new HttpError(400, "Fayl bo'sh");
  if (file.size > MAX_BYTES) throw new HttpError(400, "Fayl 4 MB dan katta bo'lmasin");
  const ext = TYPES[file.type];
  if (!ext) throw new HttpError(400, "Faqat rasm (JPG, PNG, WEBP, HEIC) yoki PDF yuklang");
  const buf = Buffer.from(await file.arrayBuffer());
  return { buf, type: file.type, ext, hash: createHash("sha256").update(buf).digest("hex") };
}

export async function prepareImage(file: File): Promise<PreparedUpload> {
  if (file.size > 0 && !IMAGE_TYPES.has(file.type)) throw new HttpError(400, "Faqat rasm (JPG, PNG, WEBP) yuklang");
  return prepareUpload(file);
}

export async function storeUpload(folder: UploadFolder, file: PreparedUpload): Promise<{ url: string; hash: string }> {
  const name = `${randomBytes(16).toString("hex")}.${file.ext}`;
  const where = backend();
  if (where === "blob") {
    await put(`${folder}/${name}`, file.buf, { access: "private", contentType: file.type, addRandomSuffix: false });
  } else if (where === "db") {
    await db.storedFile.create({ data: { path: `${folder}/${name}`, type: file.type, data: file.buf } });
  } else {
    await mkdir(path.join(ROOT, folder), { recursive: true });
    await writeFile(path.join(ROOT, folder, name), file.buf);
  }
  return { url: `/api/files/${folder}/${name}`, hash: file.hash };
}

export async function readUpload(folder: string, name: string): Promise<{ data: Buffer; type: string } | null> {
  if (!/^[a-z]+$/.test(folder) || !/^[a-f0-9]{32}\.[a-z]+$/.test(name)) return null;
  const ext = name.split(".")[1];
  const type = Object.entries(TYPES).find(([, e]) => e === ext)?.[0] ?? "application/octet-stream";
  try {
    const where = backend();
    if (where === "blob") {
      const res = await get(`${folder}/${name}`, { access: "private" });
      if (!res || res.statusCode !== 200) return null;
      return { data: Buffer.from(await new Response(res.stream).arrayBuffer()), type: res.blob.contentType || type };
    }
    if (where === "db") {
      const f = await db.storedFile.findUnique({ where: { path: `${folder}/${name}` } });
      return f ? { data: Buffer.from(f.data), type: f.type } : null;
    }
    return { data: await readFile(path.join(ROOT, folder, name)), type };
  } catch {
    return null;
  }
}

// ---- Rasmlar: kimga biriktirilgani va eskisini tozalash ----

function imagePath(url: string): { folder: ImageFolder; name: string } | null {
  const m = /^\/api\/files\/(products|logos|avatars)\/([a-f0-9]{32}\.[a-z]+)$/.exec(url);
  return m ? { folder: m[1] as ImageFolder, name: m[2] } : null;
}

// Rasm biror tovar, tashkilot yoki foydalanuvchiga biriktirilganmi (ustunlar indeksli: har so'rovda tez)
export async function imageInUse(folder: ImageFolder, url: string): Promise<boolean> {
  const counts =
    folder === "products"
      ? [db.product.count({ where: { imageUrl: url } }), db.brandProduct.count({ where: { imageUrl: url } })]
      : folder === "logos"
        ? [db.distributor.count({ where: { logoUrl: url } }), db.brand.count({ where: { logoUrl: url } }), db.shop.count({ where: { imageUrl: url } })]
        : [db.staff.count({ where: { avatarUrl: url } }), db.shopUser.count({ where: { avatarUrl: url } }), db.brandUser.count({ where: { avatarUrl: url } })];
  return (await Promise.all(counts)).some((n) => n > 0);
}

// Ombordan o'chirish. Tozalash asosiy amalni to'xtatmaydi: xato logga yoziladi, xolos
async function removeStored(folder: string, name: string): Promise<void> {
  const key = `${folder}/${name}`;
  try {
    const where = backend();
    if (where === "blob") await del(key);
    else if (where === "db") await db.storedFile.deleteMany({ where: { path: key } });
    else await unlink(path.join(ROOT, folder, name));
  } catch (e) {
    console.error("fayl o'chirilmadi:", key, e);
  }
}

// Almashtirilgan yoki olib tashlangan rasm hech kimga biriktirilmagan bo'lsa, ombordan o'chiriladi (baza to'lib ketmasin).
// Bitta rasm bir nechta joyda bo'lishi mumkin (tovar egasi rasmi distribyutor katalogida ham): unda qoladi
export async function releaseImage(url: string | null | undefined): Promise<void> {
  const file = url ? imagePath(url) : null;
  if (!file || (await imageInUse(file.folder, url!))) return;
  await removeStored(file.folder, file.name);
}

// Saqlangan, lekin yozuvga biriktirilmay qolgan chek (masalan, tranzaksiya rad etilgan): ombordan o'chiriladi
export async function discardReceipt(url: string): Promise<void> {
  const m = /^\/api\/files\/receipts\/([a-f0-9]{32}\.[a-z]+)$/.exec(url);
  if (m) await removeStored("receipts", m[1]);
}

// Bazadagi fayllar hajmi (Vercel'da Blob bo'lmasa cheklar va rasmlar shu yerda) va butun baza hajmi: admin sahifasida
// ogohlantirish uchun. Bepul Neon tarifida baza hajmi cheklangan: to'lsa, butun platforma yozishdan to'xtaydi
export async function storageUsage(): Promise<{ files: number; fileBytes: number; databaseBytes: number; limitBytes: number }> {
  const [row] = await db.$queryRaw<{ files: bigint; fileBytes: bigint; databaseBytes: bigint }[]>`
    SELECT COUNT(*) AS "files", COALESCE(SUM(octet_length("data")), 0)::bigint AS "fileBytes", pg_database_size(current_database()) AS "databaseBytes"
    FROM "StoredFile"`;
  const limitMb = Number(process.env.DATABASE_LIMIT_MB) || 512;
  return { files: Number(row.files), fileBytes: Number(row.fileBytes), databaseBytes: Number(row.databaseBytes), limitBytes: limitMb * 1024 * 1024 };
}
