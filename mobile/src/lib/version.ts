// Ilova versiyasi va yangilanishlar: React Native'ga bog'liq emas, shuning uchun alohida test qilinadi (mobile/test)

const VERSION_RE = /^\d+\.\d+\.\d+$/;

// "1.10.0" > "1.9.2": raqam bo'yicha solishtiriladi, satr bo'yicha emas
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return Math.sign(d);
  }
  return 0;
}

// Ilova server talab qilgan eng kichik versiyadan eskimi. Versiya noma'lum yoki buzuq bo'lsa ilova to'xtatilmaydi:
// xato tekshiruv ishlab turgan ilovani yopib qo'ymasin
export function isOutdated(current: string | null | undefined, min: string | null | undefined): boolean {
  if (!current || !min || !VERSION_RE.test(current) || !VERSION_RE.test(min)) return false;
  return compareVersions(current, min) < 0;
}

// Ilova orqa fondan qaytganda versiya va OTA update shuncha vaqtda bir martadan ko'p tekshirilmaydi
export const RECHECK_AFTER_MS = 30 * 60 * 1000;

export function shouldRecheck(lastCheckedAt: number, now = Date.now()): boolean {
  return now - lastCheckedAt >= RECHECK_AFTER_MS;
}
