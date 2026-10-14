import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { balance, openDebts, overdue, type LedgerLike } from "./ledger";

export const PENDING_STATUSES = ["SENT", "ACCEPTED", "IN_DELIVERY"] as const;

// Qarz hisobi uchun kerakli ustunlar: ko'p do'konli ro'yxatlarda butun yozuvni yuklamaslik uchun
export const ledgerCalcSelect = { amount: true, date: true, dueDate: true, status: true, orderId: true } satisfies Prisma.LedgerEntrySelect;

// Bitta ulanish bo'yicha: qarz, muddati o'tgan, eng yaqin muddat, bo'sh nasiya
export function summarize(
  ledger: LedgerLike[],
  pendingOrders: { total: number; paymentType: string }[],
  creditLimit: number,
  today = new Date(),
) {
  const debt = balance(ledger);
  const od = overdue(ledger, today);
  const nextDue = openDebts(ledger)
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
    pendingPayments: ledger.filter((e) => e.status === "PENDING").length,
  };
}

// Do'konning har bir distribyutor bo'yicha holati
export async function linkSummaries(shopId: string) {
  const links = await db.shopLink.findMany({
    where: { shopId, status: "ACTIVE" },
    include: {
      distributor: true,
      ledger: { select: ledgerCalcSelect },
      orders: { where: { status: { in: [...PENDING_STATUSES] } }, select: { total: true, paymentType: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return links.map((l) => ({
    linkId: l.id,
    distributor: {
      id: l.distributor.id,
      name: l.distributor.name,
      categories: l.distributor.categories,
      minOrder: l.distributor.minOrder,
      deliveryDays: l.distributor.deliveryDays,
    },
    ...summarize(l.ledger, l.orders, l.creditLimit),
  }));
}
