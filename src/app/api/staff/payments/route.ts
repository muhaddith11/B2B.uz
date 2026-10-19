import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { cursorArgs, pageOf, readPage } from "@/lib/paging";
import { recordPayment, recordPaymentInput } from "@/lib/payments";
import { handle, readJson, requireStaff } from "@/lib/session";

// Tasdiq kutayotgan chekli to'lovlar (hammasi, eng eskisidan) va oxirgi to'lovlar (sahifalab).
// Ilgari ikkalasi bitta 100 talik so'rovda edi va tartib holat bo'yicha (CONFIRMED < PENDING): 100 dan ortiq tasdiqlangan
// to'lov bo'lgach, tasdiq kutayotgan cheklar ro'yxatdan butunlay tushib qolardi
export const GET = handle(async (req: Request) => {
  const staff = await requireStaff(req, ["ADMIN", "ACCOUNTANT", "OPERATOR"]);
  const page = readPage(new URL(req.url), 50);
  const base = { shopLink: { distributorId: staff.distributorId }, type: "PAYMENT" as const };
  const include = { shopLink: { include: { shop: true } }, paymentMethod: { select: { type: true, number: true } } } satisfies Prisma.LedgerEntryInclude;
  type Row = Prisma.LedgerEntryGetPayload<{ include: typeof include }>;
  const [pending, recentRows] = await Promise.all([
    // Ish navbati: cheklovsiz (har do'kon bir vaqtda ko'pi bilan MAX_PENDING_RECEIPTS ta chek yubora oladi).
    // Kursor bilan keyingi sahifa so'ralganda qayta yuborilmaydi
    page.cursor ? Promise.resolve<Row[]>([]) : db.ledgerEntry.findMany({ where: { ...base, status: "PENDING" }, include, orderBy: [{ date: "asc" }, { id: "asc" }] }),
    db.ledgerEntry.findMany({ where: { ...base, status: { not: "PENDING" } }, include, orderBy: [{ date: "desc" }, { id: "desc" }], ...cursorArgs(page) }),
  ]);
  const recent = pageOf(recentRows, page);
  const map = (e: Row) => ({
    id: e.id,
    linkId: e.shopLinkId,
    shop: e.shopLink.shop.name,
    amount: -e.amount,
    date: e.date,
    status: e.status,
    channel: e.channel,
    note: e.note,
    receiptUrl: e.receiptUrl,
    method: e.paymentMethod,
    createdBy: e.createdBy,
  });
  return Response.json({ pending: pending.map(map), recent: recent.items.map(map), nextCursor: recent.nextCursor });
});

// Naqd yoki o'tkazma: har qanday xodim (agent, yetkazuvchi ham) yozadi
export const POST = handle(async (req: Request) => {
  const staff = await requireStaff(req);
  const input = await readJson(req, recordPaymentInput, "Summani to'g'ri kiriting");
  const entry = await recordPayment(staff, input);
  return Response.json({ id: entry.id });
});
