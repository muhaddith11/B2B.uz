import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { get, put } from "@vercel/blob";
import { db } from "./db";
import { HttpError } from "./session";

// Yuklangan fayllar: to'lov cheklari va tovar rasmlari. Ochiq havola yo'q: fayl faqat /api/files orqali beriladi
// (chek ruxsat tekshirilgandan keyin, tovar rasmi esa hammaga, faqat biror tovarga biriktirilgan bo'lsa).
// Qayerda: BLOB_READ_WRITE_TOKEN bo'lsa yopiq Vercel Blob omborida; Vercel'da (yoki UPLOAD_STORAGE=db) bazada;
// aks holda diskda (UPLOAD_DIR yoki ./uploads).

const ROOT = path.resolve(process.env.UPLOAD_DIR || "uploads");
// Vercel funksiyasi 4,5 MB dan katta so'rov tanasini qabul qilmaydi
const MAX_BYTES = 4 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "application/pdf": "pdf" };
// Tovar rasmi barcha telefonlarda ko'rinishi kerak: HEIC va PDF emas
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export type UploadFolder = "receipts" | "products";

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
