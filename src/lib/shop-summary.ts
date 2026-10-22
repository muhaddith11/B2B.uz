import type { LinkStatus, Prisma } from "@prisma/client";
import { db } from "./db";
import { balance, openDebts, overdue, type LedgerLike } from "./ledger";
import { OPEN_STATUSES } from "./orders";

// Hali topshirilmagan buyurtmalar (do'kon tasdig'ini kutayotgani ham)
export const PENDING_STATUSES = OPEN_STATUSES;

// Qarz hisobi uchun kerakli ustunlar: ko'p do'konli ro'yxatlarda butun yozuvni yuklamaslik uchun
export const ledgerCalcSelect = { id: true, amount: true, date: true, dueDate: true, status: true, orderId: true, reversesId: true } satisfies Prisma.LedgerEntrySelect;

// Bitta ulanishning qarz hisobi uchun yetarli ma'lumot: qoldiq, distribyutor tasdig'ini kutayotgan cheklar soni,
// do'kon tasdig'ini kutayotgan (distribyutor qo'shgan) qarzlar soni va muddat hisobi uchun tasdiqlangan yozuvlar
// (qarzi yo'q ulanishda bo'sh: ochiq qarz bo'lmaydi). Kutayotgan to'lov manfiy, kutayotgan qarz musbat
export type LedgerFacts = { balance: number; pendingPayments: number; pendingDebts: number; entries: LedgerLike[] };

// Bitta ulanishning barcha yozuvlaridan (do'kon kartasi kabi butun daftar yuklangan joyda)
export function factsFrom(entries: LedgerLike[]): LedgerFacts {
  const pending = entries.filter((e) => e.status === "PENDING");
  return { balance: balance(entries), pendingPayments: pending.filter((e) => e.amount < 0).length, pendingDebts: pending.filter((e) => e.amount > 0).length, entries };
}

// Ko'p ulanish uchun: qoldiq va cheklar soni bazada hisoblanadi, yozuvlar faqat qarzi bor ulanishlar uchun yuklanadi.
// Qarzi yo'q (qoldiq 0 yoki ortiqcha to'langan) ulanishda ochiq qarz yo'q, muddat hisobi uchun yozuv kerak emas
export async function ledgerFacts(linkIds: string[]): Promise<Map<string, LedgerFacts>> {
  const facts = new Map<string, LedgerFacts>(linkIds.map((id) => [id, { balance: 0, pendingPayments: 0, pendingDebts: 0, entries: [] }]));
  if (linkIds.length === 0) return facts;
  const [sums, pendingPay, pendingDebt] = await Promise.all([
    db.ledgerEntry.groupBy({ by: ["shopLinkId"], where: { shopLinkId: { in: linkIds }, status: "CONFIRMED" }, _sum: { amount: true } }),
    db.ledgerEntry.groupBy({ by: ["shopLinkId"], where: { shopLinkId: { in: linkIds }, status: "PENDING", amount: { lt: 0 } }, _count: { _all: true } }),
    db.ledgerEntry.groupBy({ by: ["shopLinkId"], where: { shopLinkId: { in: linkIds }, status: "PENDING", amount: { gt: 0 } }, _count: { _all: true } }),
  ]);
  for (const s of sums) facts.get(s.shopLinkId)!.balance = s._sum.amount ?? 0;
  for (const p of pendingPay) facts.get(p.shopLinkId)!.pendingPayments = p._count._all;
  for (const p of pendingDebt) facts.get(p.shopLinkId)!.pendingDebts = p._count._all;
  const debtors = sums.filter((s) => (s._sum.amount ?? 0) > 0).map((s) => s.shopLinkId);
  if (debtors.length) {
    const rows = await db.ledgerEntry.findMany({ where: { shopLinkId: { in: debtors }, status: "CONFIRMED" }, select: { ...ledgerCalcSelect, shopLinkId: true } });
    for (const r of rows) facts.get(r.shopLinkId)!.entries.push(r);
  }
  return facts;
}

// Bitta ulanish bo'yicha: qarz, muddati o'tgan, eng yaqin muddat, bo'sh nasiya
export function summarize(
  ledger: LedgerFacts,
  pendingOrders: { total: number; paymentType: string }[],
  creditLimit: number,
  today = new Date(),
) {
  const debt = ledger.balance;
  const od = overdue(ledger.entries, today);
  const nextDue = openDebts(ledger.entries)
    .map((d) => d.dueDate)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const pendingCredit = pendingOrders.filter((o) => o.paymentType === "CREDIT").reduce((s, o) => s + o.total, 0);
  return {
    debt,
    overdueAmount: od.amount,
    overdueDays: od.maxDays,
    nextDue: nextDue?.toISOString() ?? null,
    creditLimit,
    creditAvailable: creditLimit > 0 ? Math.max(0, creditLimit - debt - pendingCredit) : 0,
    activeOrders: pendingOrders.length,
    pendingPayments: ledger.pendingPayments,
    pendingDebts: ledger.pendingDebts,
  };
}

// Do'konning har bir distribyutor bo'yicha holati. Qarzlar ekrani bloklangan ulanishni ham ko'rsatadi:
// distribyutor yangi buyurtmani yopgan bo'lsa ham, qarz ko'rinib turishi va to'lanishi kerak
export async function linkSummaries(shopId: string, statuses: LinkStatus[] = ["ACTIVE"]) {
  const links = await db.shopLink.findMany({
    where: { shopId, status: { in: statuses } },
    include: {
      distributor: true,
      orders: { where: { status: { in: [...PENDING_STATUSES] } }, select: { total: true, paymentType: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const facts = await ledgerFacts(links.map((l) => l.id));

  return links.map((l) => ({
    linkId: l.id,
    status: l.status,
    distributor: {
      id: l.distributor.id,
      name: l.distributor.name,
      logoUrl: l.distributor.logoUrl,
      categories: l.distributor.categories,
      minOrder: l.distributor.minOrder,
      deliveryDays: l.distributor.deliveryDays,
    },
    ...summarize(facts.get(l.id)!, l.orders, l.creditLimit),
  }));
}
