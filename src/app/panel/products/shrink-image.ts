// Telefon rasmi ko'pincha 3-8 MB: yuborishdan oldin brauzerda 1600 px gacha kichraytirib JPEG qilinadi
// (tezroq yuklanadi va 4 MB chegarasiga urilmaydi). Kichraytirib bo'lmasa, fayl o'zicha qaytadi
const MAX_SIDE = 1600;

export async function shrinkImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const g = canvas.getContext("2d");
    if (!g) return file;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    if (!blob) return file;
    // Fayl nomi saqlanadi: ko'plab yuklashda nomdan artikul olinadi
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
