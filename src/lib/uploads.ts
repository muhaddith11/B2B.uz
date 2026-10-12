import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { get, put } from "@vercel/blob";
import { HttpError } from "./session";

// Yuklangan fayllar (to'lov cheklari). Ochiq havola yo'q: fayl faqat /api/files orqali, ruxsat tekshirilgandan keyin beriladi.
// Vercel'da (BLOB_READ_WRITE_TOKEN bor bo'lsa) yopiq Vercel Blob omborida, aks holda diskda (UPLOAD_DIR yoki ./uploads).

const ROOT = path.resolve(process.env.UPLOAD_DIR || "uploads");
const MAX_BYTES = 8 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "application/pdf": "pdf" };

const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export async function saveUpload(folder: "receipts", file: File): Promise<{ url: string; hash: string }> {
  if (file.size === 0) throw new HttpError(400, "Fayl bo'sh");
  if (file.size > MAX_BYTES) throw new HttpError(400, "Fayl 8 MB dan katta bo'lmasin");
  const ext = TYPES[file.type];
  if (!ext) throw new HttpError(400, "Faqat rasm (JPG, PNG, WEBP, HEIC) yoki PDF yuklang");
  const buf = Buffer.from(await file.arrayBuffer());
  const name = `${randomBytes(16).toString("hex")}.${ext}`;
  if (useBlob()) {
    await put(`${folder}/${name}`, buf, { access: "private", contentType: file.type, addRandomSuffix: false });
  } else {
    await mkdir(path.join(ROOT, folder), { recursive: true });
    await writeFile(path.join(ROOT, folder, name), buf);
  }
  return { url: `/api/files/${folder}/${name}`, hash: createHash("sha256").update(buf).digest("hex") };
}

export async function readUpload(folder: string, name: string): Promise<{ data: Buffer; type: string } | null> {
  if (!/^[a-z]+$/.test(folder) || !/^[a-f0-9]{32}\.[a-z]+$/.test(name)) return null;
  const ext = name.split(".")[1];
  const type = Object.entries(TYPES).find(([, e]) => e === ext)?.[0] ?? "application/octet-stream";
  try {
    if (useBlob()) {
      const res = await get(`${folder}/${name}`, { access: "private" });
      if (!res || res.statusCode !== 200) return null;
      return { data: Buffer.from(await new Response(res.stream).arrayBuffer()), type: res.blob.contentType || type };
    }
    return { data: await readFile(path.join(ROOT, folder, name)), type };
  } catch {
    return null;
  }
}
