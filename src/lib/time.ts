// Toshkent vaqti (UTC+5, yozgi vaqt yo'q). Server UTC'da ishlaydi, shuning uchun "bugun" va kalendar kuni shu yerda hisoblanadi.
// Bu fayl bazaga murojaat qilmaydi, shuning uchun test qilinadi.

export const DAY_MS = 24 * 60 * 60 * 1000;
export const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

// Toshkent bo'yicha kalendar kuni tartib raqami: bir kun ichidagi barcha vaqtlar uchun bir xil
export function tashkentDayNumber(date: Date): number {
  return Math.floor((date.getTime() + TASHKENT_OFFSET_MS) / DAY_MS);
}

// Toshkent bo'yicha bugungi kun boshlanishi (00:00), UTC vaqtda
export function startOfTashkentDay(now = new Date()): Date {
  return new Date(tashkentDayNumber(now) * DAY_MS - TASHKENT_OFFSET_MS);
}

// Kalendar oylari qo'shish (obuna uchun). Oy oxiri saqlanadi: 31-yanvar + 1 oy = 28 (yoki 29)-fevral
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}
