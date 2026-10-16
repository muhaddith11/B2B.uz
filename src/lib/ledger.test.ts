import { describe, expect, it } from "vitest";
import { balance, checkCredit, openDebts, overdue, type LedgerLike } from "./ledger";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const debt = (amount: number, date: string, due: string, status: LedgerLike["status"] = "CONFIRMED"): LedgerLike => ({
  amount,
  date: d(date),
  dueDate: d(due),
  status,
});
const pay = (amount: number, date: string, status: LedgerLike["status"] = "CONFIRMED"): LedgerLike => ({
  amount: -amount,
  date: d(date),
  dueDate: null,
  status,
});

describe("balance", () => {
  it("faqat tasdiqlangan yozuvlarni hisoblaydi", () => {
    expect(balance([debt(500_000, "2026-10-01", "2026-10-15"), pay(200_000, "2026-10-05"), pay(100_000, "2026-10-06", "PENDING")])).toBe(300_000);
  });
});

describe("openDebts", () => {
  it("to'lovni eng eski qarzdan boshlab yopadi", () => {
    const open = openDebts([
      debt(300_000, "2026-10-01", "2026-10-15"),
      debt(400_000, "2026-10-03", "2026-10-17"),
      pay(350_000, "2026-10-05"),
    ]);
    expect(open).toHaveLength(1);
    expect(open[0].remaining).toBe(350_000);
    expect(open[0].date).toEqual(d("2026-10-03"));
  });
});

describe("overdue", () => {
  it("muddati o'tgan qoldiq va kunlarni topadi", () => {
    const od = overdue([debt(300_000, "2026-09-01", "2026-09-15"), pay(100_000, "2026-09-20")], d("2026-09-25"));
    expect(od).toEqual({ amount: 200_000, maxDays: 10 });
  });
  it("muddati kelmagan qarz overdue emas", () => {
    expect(overdue([debt(300_000, "2026-10-01", "2026-10-15")], d("2026-10-10"))).toEqual({ amount: 0, maxDays: 0 });
  });
  it("muddat kunining o'zida hali muddati o'tgan emas", () => {
    expect(overdue([debt(300_000, "2026-10-01", "2026-10-15")], new Date("2026-10-15T18:00:00Z"))).toEqual({ amount: 0, maxDays: 0 });
  });
  it("muddat kuni tugagach (Toshkent yarim tuni) 24 soat kutmasdan muddati o'tgan bo'ladi", () => {
    // Muddat: 15-oktabr, Toshkent 15:00. Ertasi kuni Toshkent 13:00 da hali 24 soat to'lmagan, lekin muddat kuni o'tgan
    const entry: LedgerLike = { amount: 300_000, date: d("2026-10-01"), dueDate: new Date("2026-10-15T10:00:00Z"), status: "CONFIRMED" };
    expect(overdue([entry], new Date("2026-10-16T08:00:00Z"))).toEqual({ amount: 300_000, maxDays: 1 });
    // Toshkent bo'yicha hali 15-oktabr (23:30)
    expect(overdue([entry], new Date("2026-10-15T18:30:00Z"))).toEqual({ amount: 0, maxDays: 0 });
  });
  it("topshirishda olingan naqd o'z buyurtmasini yopadi, eski qarz ochiq qoladi", () => {
    const entries: LedgerLike[] = [
      debt(235_200, "2026-09-23", "2026-10-07"),
      pay(117_600, "2026-10-02"),
      { ...debt(294_000, "2026-10-12", "2026-10-12"), orderId: "o2" },
      { ...pay(294_000, "2026-10-12"), orderId: "o2" },
    ];
    expect(overdue(entries, d("2026-10-12"))).toEqual({ amount: 117_600, maxDays: 5 });
    expect(openDebts(entries)).toEqual([{ date: d("2026-09-23"), dueDate: d("2026-10-07"), remaining: 117_600 }]);
  });
});

describe("checkCredit", () => {
  const terms = { creditLimit: 1_000_000, blockAfterDays: 7 };
  const today = d("2026-10-10");

  it("nasiya o'chiq bo'lsa rad etadi", () => {
    expect(checkCredit({ creditLimit: 0, blockAfterDays: 7 }, [], 100, today)).toEqual({ ok: false, reason: "CREDIT_OFF" });
  });
  it("limit yetsa ruxsat beradi", () => {
    expect(checkCredit(terms, [debt(600_000, "2026-10-05", "2026-10-19")], 400_000, today)).toEqual({ ok: true, available: 400_000 });
  });
  it("limit oshsa qancha oshganini qaytaradi", () => {
    expect(checkCredit(terms, [debt(600_000, "2026-10-05", "2026-10-19")], 500_000, today)).toEqual({
      ok: false,
      reason: "LIMIT_EXCEEDED",
      available: 400_000,
      exceedBy: 100_000,
    });
  });
  it("muddati 7 kundan ko'p o'tgan qarz bo'lsa bloklaydi", () => {
    expect(checkCredit(terms, [debt(100_000, "2026-09-01", "2026-09-30")], 10_000, today)).toEqual({
      ok: false,
      reason: "OVERDUE_BLOCK",
      overdueDays: 10,
    });
  });
  it("blockAfterDays null bo'lsa faqat limitni tekshiradi", () => {
    expect(checkCredit({ creditLimit: 1_000_000, blockAfterDays: null }, [debt(100_000, "2026-09-01", "2026-09-30")], 10_000, today).ok).toBe(true);
  });
});

describe("bekor qilingan yozuvlar", () => {
  const today = d("2026-10-20");
  it("bekor qilingan to'lov eski qarzni yopmaydi: qarz asl muddati bilan qaytadi", () => {
    const entries: LedgerLike[] = [
      { id: "q1", ...debt(200_000, "2026-09-01", "2026-09-15") },
      { id: "t1", ...pay(200_000, "2026-09-20") },
      { id: "r1", amount: 200_000, date: d("2026-09-25"), dueDate: null, status: "CONFIRMED", reversesId: "t1" },
    ];
    expect(balance(entries)).toBe(200_000);
    expect(overdue(entries, today)).toEqual({ amount: 200_000, maxDays: 35 });
  });
  it("bekor qilingan qarz muddat hisobiga kirmaydi", () => {
    const entries: LedgerLike[] = [
      { id: "q1", ...debt(100_000, "2026-09-01", "2026-09-10") },
      { id: "r1", amount: -100_000, date: d("2026-09-12"), dueDate: null, status: "CONFIRMED", reversesId: "q1" },
      { id: "q2", ...debt(50_000, "2026-10-01", "2026-10-25") },
    ];
    expect(overdue(entries, today)).toEqual({ amount: 0, maxDays: 0 });
    expect(openDebts(entries)).toEqual([{ date: d("2026-10-01"), dueDate: d("2026-10-25"), remaining: 50_000 }]);
  });
});
