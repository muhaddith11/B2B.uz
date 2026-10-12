import { db } from "@/lib/db";
import { recordPayment, recordPaymentInput } from "@/lib/payments";
import { handle, readJson, requireStaff } from "@/lib/session";

// Tasdiq kutayotgan chekli to'lovlar va oxirgi to'lovlar
export const GET = handle(async (req: Request) => {
  const staff = await requireStaff(req, ["ADMIN", "ACCOUNTANT", "OPERATOR"]);
  const rows = await db.ledgerEntry.findMany({
    where: { shopLink: { distributorId: staff.distributorId }, type: "PAYMENT" },
    include: { shopLink: { include: { shop: true } }, paymentMethod: { select: { type: true, number: true } } },
    orderBy: [{ status: "asc" }, { date: "desc" }],
    take: 100,
  });
  const map = (e: (typeof rows)[number]) => ({
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
  return Response.json({ pending: rows.filter((e) => e.status === "PENDING").map(map), recent: rows.filter((e) => e.status !== "PENDING").slice(0, 50).map(map) });
});

// Naqd yoki o'tkazma: har qanday xodim (agent, yetkazuvchi ham) yozadi
export const POST = handle(async (req: Request) => {
  const staff = await requireStaff(req);
  const input = await readJson(req, recordPaymentInput, "Summani to'g'ri kiriting");
  const entry = await recordPayment(staff, input);
  return Response.json({ id: entry.id });
});
