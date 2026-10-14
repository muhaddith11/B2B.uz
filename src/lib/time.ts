// Toshkent vaqti (UTC+5, yozgi vaqt yo'q). Server UTC'da ishlaydi, shuning uchun "bugun" va kalendar kuni shu yerda hisoblanadi.
// Bu fayl bazaga murojaat qilmaydi, shuning uchun test qilinadi.

export const DAY_MS = 24 * 60 * 60 * 1000;
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

// Toshkent bo'yicha kalendar kuni tartib raqami: bir kun ichidagi barcha vaqtlar uchun bir xil
export function tashkentDayNumber(date: Date): number {
  return Math.floor((date.getTime() + TASHKENT_OFFSET_MS) / DAY_MS);
}

// Toshkent bo'yicha bugungi kun boshlanishi (00:00), UTC vaqtda
export function startOfTashkentDay(now = new Date()): Date {
  return new Date(tashkentDayNumber(now) * DAY_MS - TASHKENT_OFFSET_MS);
}
