// Serverdagi src/lib/money.ts bilan bir xil: o'zgartirsangiz, ikkalasini ham yangilang
import { t } from './i18n';

// Uzilmaydigan bo'sh joy: summa va "so'm" ikki qatorga bo'linmaydi
const NBSP = ' ';

// 1234500 -> "1 234 500"
export function formatAmount(n: number): string {
  const sign = n < 0 ? '−' : '';
  return sign + Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

// "1 234 500 so'm", ruschada "1 234 500 сум"
export function formatSom(n: number): string {
  return `${formatAmount(n)}${NBSP}${t("so'm")}`;
}

const p2 = (n: number) => String(n).padStart(2, '0');
const asDate = (d: Date | string) => (typeof d === 'string' ? new Date(d) : d);

// "07.10.2026"
export function formatDate(d: Date | string): string {
  const x = asDate(d);
  return `${p2(x.getDate())}.${p2(x.getMonth() + 1)}.${x.getFullYear()}`;
}

// Holat bosqichi vaqti: bugun bo'lsa "14:30", aks holda "07.10"
export function formatStepTime(d: Date | string, now = new Date()): string {
  const x = asDate(d);
  const sameDay = x.getFullYear() === now.getFullYear() && x.getMonth() === now.getMonth() && x.getDate() === now.getDate();
  return sameDay ? `${p2(x.getHours())}:${p2(x.getMinutes())}` : `${p2(x.getDate())}.${p2(x.getMonth() + 1)}`;
}
