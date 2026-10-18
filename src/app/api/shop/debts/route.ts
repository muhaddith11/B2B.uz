import { db } from "@/lib/db";
import { cursorArgs, pageOf, readPage } from "@/lib/paging";
import { handle, requireShopUser } from "@/lib/session";
import { linkSummaries } from "@/lib/shop-summary";

// Qarzlarim ekrani: har bir distribyutor bo'yicha qoldiq va yozuvlar tarixi (rad etilgan cheklar ham, sababi bilan)
export const GET = handle(async (req: Request) => {
  const user = await requireShopUser(req);
  // Bloklangan distribyutor ham: qarz ko'rinib turadi va to'lanadi
  const summaries = await linkSummaries(user.shopId, ["ACTIVE", "BLOCKED"]);
  const page = readPage(new URL(req.url), 200);
  const rows = await db.ledgerEntry.findMany({
    where: { shopLink: { shopId: user.shopId } },
    include: { order: { select: { number: true } }, reversedBy: { select: { id: true } } },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    ...cursorArgs(page),
  });
  const { items: entries, nextCursor } = pageOf(rows, page);
  return Response.json({
    links: summaries,
    nextCursor,
    entries: entries.map((e) => ({
      id: e.id,
      linkId: e.shopLinkId,
      type: e.type,
      amount: e.amount,
      date: e.date,
      dueDate: e.dueDate,
      status: e.status,
      channel: e.channel,
      note: e.note,
      orderNumber: e.order?.number ?? null,
      reversed: e.reversedBy !== null,
    })),
  });
});
