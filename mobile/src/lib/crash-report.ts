// Ilova xatosi hisoboti (React Native'ga bog'liq emas, mobile/test da sinaladi): serverga /api/client-errors orqali boradi.
// Shaxsiy ma'lumot yuborilmaydi: faqat xato matni, stack, ekran va ilova versiyasi

export type CrashReport = { message: string; stack?: string; screen?: string; fatal?: boolean; platform?: 'ios' | 'android' | 'web'; appVersion?: string };

const PHONE = /\+?998\d{9}/g;

export function buildReport(error: unknown, opts: Omit<CrashReport, 'message' | 'stack'> = {}): CrashReport {
  const e = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Noma\'lum xato');
  // Xato matniga tasodifan tushgan telefon raqami yashiriladi
  const clean = (s: string) => s.replace(PHONE, (p) => `${p.slice(0, -7)}*******`);
  return {
    message: clean(`${e.name}: ${e.message}`).slice(0, 500),
    stack: e.stack ? clean(e.stack).split('\n').slice(0, 30).join('\n').slice(0, 4000) : undefined,
    ...opts,
  };
}

// Bir xil xato ketma-ket (masalan, har renderda) yuz marta yuborilmasin: bir sessiyada har biri bir marta
export function createDeduper(limit = 20) {
  const sent = new Set<string>();
  return (report: CrashReport): boolean => {
    const key = `${report.message}|${report.screen ?? ''}`;
    if (sent.has(key) || sent.size >= limit) return false;
    sent.add(key);
    return true;
  };
}
