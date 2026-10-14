// Qarz daftari hisob-kitobi. Bu fayldagi funksiyalar bazaga murojaat qilmaydi, shuning uchun test qilinadi.
// Belgilar: qarz musbat, to'lov manfiy. Faqat CONFIRMED yozuvlar qoldiqqa kiradi.

import { DAY_MS, tashkentDayNumber } from "./time";

export type LedgerLike = {
  amount: number;
  date: Date;
  dueDate: Date | null;
  status: "CONFIRMED" | "PENDING" | "REJECTED";
  orderId?: string | null; // topshirishda olingan naqd o'sha buyurtma qarzini yopadi
};

export type OpenDebt = { date: Date; dueDate: Date | null; remaining: number };

export function balance(entries: LedgerLike[]): number {
  return entries.filter((e) => e.status === "CONFIRMED").reduce((s, e) => s + e.amount, 0);
}

// To'lovlar eng eski qarzdan boshlab yopiladi (spetsifikatsiya, "Nasiya qoidalari" 4-band).
// Istisno: buyurtmaga bog'langan to'lov (topshirishda olingan naqd) avval o'sha buyurtma qarzini yopadi.
export function openDebts(entries: LedgerLike[]): OpenDebt[] {
  const confirmed = entries.filter((e) => e.status === "CONFIRMED");
  const debts = confirmed
    .filter((e) => e.amount > 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((e) => ({ date: e.date, dueDate: e.dueDate, remaining: e.amount, orderId: e.orderId ?? null }));
  let credit = 0;
  for (const p of confirmed.filter((e) => e.amount < 0)) {
    let left = -p.amount;
    const own = p.orderId ? debts.find((d) => d.orderId === p.orderId && d.remaining > 0) : undefined;
    if (own) {
      const used = Math.min(left, own.remaining);
      own.remaining -= used;
      left -= used;
    }
    credit += left;
  }
  for (const d of debts) {
    if (credit <= 0) break;
    const used = Math.min(credit, d.remaining);
    d.remaining -= used;
    credit -= used;
  }
  return debts.filter((d) => d.remaining > 0).map(({ date, dueDate, remaining }) => ({ date, dueDate, remaining }));
}

// Toshkent bo'yicha kalendar kunlari farqi (soatlar emas): muddat kuni tugagan zahoti 1 kun o'tgan bo'ladi
function daysBetween(from: Date, to: Date): number {
  return tashkentDayNumber(to) - tashkentDayNumber(from);
}

// Muddat kuni o'tib ketgandan keyingina muddati o'tgan hisoblanadi (muddat kuni hali to'lash mumkin)
export function overdue(entries: LedgerLike[], today: Date): { amount: number; maxDays: number } {
  let amount = 0;
  let maxDays = 0;
  for (const d of openDebts(entries)) {
    const days = d.dueDate ? daysBetween(d.dueDate, today) : 0;
    if (days >= 1) {
      amount += d.remaining;
      maxDays = Math.max(maxDays, days);
    }
  }
  return { amount, maxDays };
}

export type CreditTerms = { creditLimit: number; blockAfterDays: number | null };

export type CreditCheck =
  | { ok: true; available: number }
  | { ok: false; reason: "CREDIT_OFF" }
  | { ok: false; reason: "OVERDUE_BLOCK"; overdueDays: number }
  | { ok: false; reason: "LIMIT_EXCEEDED"; available: number; exceedBy: number };

// Nasiyali buyurtma faqat "joriy qarz + buyurtma summasi <= limit" bo'lsa o'tadi (2-band),
// muddati o'tgan qarz blockAfterDays dan oshsa bloklanadi (6-band).
export function checkCredit(
  terms: CreditTerms,
  entries: LedgerLike[],
  orderTotal: number,
  today: Date,
): CreditCheck {
  if (terms.creditLimit <= 0) return { ok: false, reason: "CREDIT_OFF" };
  const od = overdue(entries, today);
  if (terms.blockAfterDays !== null && od.amount > 0 && od.maxDays > terms.blockAfterDays) {
    return { ok: false, reason: "OVERDUE_BLOCK", overdueDays: od.maxDays };
  }
  const current = balance(entries);
  const available = Math.max(0, terms.creditLimit - current);
  if (current + orderTotal > terms.creditLimit) {
    return { ok: false, reason: "LIMIT_EXCEEDED", available, exceedBy: current + orderTotal - terms.creditLimit };
  }
  return { ok: true, available };
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}
