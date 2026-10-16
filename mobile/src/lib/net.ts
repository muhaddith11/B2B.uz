// Tarmoq yordamchilari: React Native'ga bog'liq emas, shuning uchun alohida test qilinadi (mobile/test)

// So'rov shu vaqtda javob olmasa, to'xtatiladi: yomon internetda tugma abadiy aylanib qolmasin
export const REQUEST_TIMEOUT_MS = 20_000;
// Fayl (chek, rasm) yuborish sekinroq tarmoqda ko'proq vaqt oladi
export const UPLOAD_TIMEOUT_MS = 60_000;

export class TimeoutError extends Error {
  constructor() {
    super('timeout');
  }
}

export async function fetchWithTimeout(fetchImpl: typeof fetch, url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (controller.signal.aborted) throw new TimeoutError();
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// Bir martalik so'rov kaliti (buyurtma, to'lov, tuzatish): javob yo'lda yo'qolib so'rov qayta yuborilsa,
// server shu kalitdan uni tanib, ikkinchi marta yozmaydi
export function newRequestKey(random: () => number = Math.random, now: () => number = Date.now): string {
  const part = () => Math.floor(random() * 36 ** 6).toString(36).padStart(6, '0');
  return `${now().toString(36)}-${part()}${part()}${part()}`;
}

// Sessiya tokeni shu muddatdan eski bo'lsa, ilova ochilganda yangilanadi (token 30 kun amal qiladi):
// faol foydalanuvchi har oy SMS kod bilan qayta kirishi shart emas
export const REFRESH_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

export function needsRefresh(refreshedAt: number | undefined, now = Date.now()): boolean {
  return !refreshedAt || now - refreshedAt > REFRESH_AFTER_MS;
}

// Rasm uzun tomoni bo'yicha shu o'lchamgacha kichraytiriladi: server 4 MB dan kattasini qabul qilmaydi,
// zamonaviy telefon kamerasining asl surati esa undan katta bo'ladi
export const MAX_IMAGE_SIDE = 1600;

// Kichraytirish kerakmi va qaysi tomoni bo'yicha (nisbat saqlanadi). Kichik rasm o'zgarmaydi
export function fitWithin(width: number, height: number, max = MAX_IMAGE_SIDE): { width: number } | { height: number } | null {
  if (!width || !height || (width <= max && height <= max)) return null;
  return width >= height ? { width: max } : { height: max };
}
