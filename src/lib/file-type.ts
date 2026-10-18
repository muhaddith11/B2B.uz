// Fayl turi birinchi baytlardan aniqlanadi: mijoz yuborgan content-type ga ishonilmaydi.
// Aks holda rasm deb e'lon qilingan istalgan fayl (HTML, skript, dastur) omborga tushib, havola orqali tarqalishi mumkin edi.

export type SniffedType = "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "application/pdf";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// HEIC/HEIF: 4-baytdan "ftyp", keyin brend (iPhone kamerasi "heic" yoki "mif1" yozadi)
const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);

export function sniffType(buf: Uint8Array): SniffedType | null {
  const b = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b.subarray(0, 8).equals(PNG)) return "image/png";
  if (b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (b.length >= 12 && b.toString("ascii", 4, 8) === "ftyp" && HEIC_BRANDS.has(b.toString("ascii", 8, 12))) return "image/heic";
  if (b.length >= 5 && b.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  return null;
}
