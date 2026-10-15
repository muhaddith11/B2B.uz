import { TASHKENT_OFFSET_MS } from "./time";

// Summalar bazada butun so'm, 32 bitli son (eng ko'pi 2 147 483 647): bitta buyurtma shundan oshmasligi kerak,
// aks holda yozib bo'lmaydi. Kattaroq xarid bir necha buyurtmaga bo'linadi
export const MAX_ORDER_TOTAL = 2_000_000_000;
// Bitta qatordagi miqdor (dona): yozishdagi xato (masalan, ortiqcha nollar) summani chegaradan oshirib yubormasin
export const MAX_LINE_QTY = 1_000_000;

// 1234500 -> "1 234 500"
export function formatAmount(n: number): string {
  const sign = n < 0 ? "−" : "";
  return sign + Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function formatSom(n: number): string {
  return `${formatAmount(n)} so'm`;
}

// "07.10.2026": brauzerlarda uz-UZ formati har xil chiqadi, shuning uchun qo'lda.
// Toshkent vaqti bo'yicha: server UTC'da ishlaydi, sana esa O'zbekistondagidek ko'rinishi kerak
export function formatDate(d: Date | string): string {
  const x = new Date((typeof d === "string" ? new Date(d) : d).getTime() + TASHKENT_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(x.getUTCDate())}.${p(x.getUTCMonth() + 1)}.${x.getUTCFullYear()}`;
}

// "07.10.2026, 14:30" (Toshkent vaqti)
export function formatDateTime(d: Date | string): string {
  const x = new Date((typeof d === "string" ? new Date(d) : d).getTime() + TASHKENT_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${formatDate(d)}, ${p(x.getUTCHours())}:${p(x.getUTCMinutes())}`;
}
