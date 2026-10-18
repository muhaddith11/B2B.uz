import { db } from "@/lib/db";
import { overdue } from "@/lib/ledger";
import { handle, requireStaff } from "@/lib/session";
import { ledgerFacts } from "@/lib/shop-summary";
import { linkScope, orderScope } from "@/lib/staff-data";
import { startOfTashkentDay } from "@/lib/time";

// Bugun: rolga qarab kerakli raqamlar
export const GET = handle(async (req: Request) => {
  const staff = await requireStaff(req);
  const distributorId = staff.distributorId;
  const startOfDay = startOfTashkentDay();
  const scope = orderScope(staff);

  const [newOrders, accepted, inDelivery, deliveredToday, links, paidToday, pendingPayments, requests, proposals, brandOrders] = await Promise.all([
    db.order.aggregate({ where: { ...scope, status: "SENT" }, _count: true, _sum: { total: true } }),
    db.order.count({ where: { ...scope, status: "ACCEPTED" } }),
    db.order.count({ where: { ...scope, status: "IN_DELIVERY" } }),
    // Topshirilgan vaqt bo'yicha: updatedAt keyingi har qanday o'zgarishda (masalan, sotuvchi hisobi o'chirilganda) yangilanadi
    db.order.aggregate({ where: { ...scope, status: "DELIVERED", deliveredAt: { gte: startOfDay } }, _count: true, _sum: { deliveredTotal: true } }),
    db.shopLink.findMany({
      where: { ...linkScope(staff), status: "ACTIVE" },
      select: { id: true },
    }),
    db.ledgerEntry.aggregate({
      where: { shopLink: { distributorId }, type: "PAYMENT", status: "CONFIRMED", date: { gte: startOfDay }, ...(staff.role === "AGENT" || staff.role === "COURIER" ? { createdBy: `staff:${staff.id}` } : {}) },
      _sum: { amount: true },
    }),
    db.ledgerEntry.count({ where: { shopLink: { distributorId }, status: "PENDING" } }),
    db.shopLink.count({ where: { distributorId, status: "REQUESTED" } }),
    db.agreement.count({ where: { distributorId, status: "PROPOSED", initiatedBy: "BRAND" } }),
    db.brandOrder.count({ where: { distributorId, status: "SHIPPED" } }),
  ]);

  const today = new Date();
  // Faqat qarzi bor do'konlarning yozuvlari yuklanadi: har ochilishda butun daftar o'qilmaydi
  const facts = await ledgerFacts(links.map((l) => l.id));
  const od = links.map((l) => overdue(facts.get(l.id)!.entries, today)).filter((x) => x.amount > 0);

  return Response.json({
    distributorStatus: staff.distributor.status,
    newOrders: { count: newOrders._count, sum: newOrders._sum.total ?? 0 },
    acceptedOrders: accepted,
    inDelivery,
    deliveredToday: { count: deliveredToday._count, sum: deliveredToday._sum.deliveredTotal ?? 0 },
    shops: links.length,
    overdue: { shops: od.length, sum: od.reduce((s, x) => s + x.amount, 0) },
    paidToday: -(paidToday._sum.amount ?? 0),
    pendingPayments,
    requests,
    brandProposals: proposals,
    brandOrdersToReceive: brandOrders,
  });
});
