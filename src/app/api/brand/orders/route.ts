import type { BrandOrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { cursorArgs, pageOf, readPage } from "@/lib/paging";
import { handle, requireBrandUser } from "@/lib/session";

const STATUSES: BrandOrderStatus[] = ["SENT", "ACCEPTED", "SHIPPED", "DELIVERED", "REJECTED", "CANCELLED"];

// Distribyutorlarning xarid buyurtmalari
export const GET = handle(async (req: Request) => {
  const user = await requireBrandUser(req);
  const url = new URL(req.url);
  const raw = url.searchParams.get("status");
  const status = STATUSES.includes(raw as BrandOrderStatus) ? (raw as BrandOrderStatus) : null;
  const page = readPage(url, 100);
  const dir = status === "SENT" ? "asc" : "desc";
  const rows = await db.brandOrder.findMany({
    where: { brandId: user.brandId, ...(status ? { status } : {}) },
    include: { distributor: { select: { name: true, logoUrl: true } }, items: { include: { brandProduct: { select: { name: true, packSize: true, unit: true } } } } },
    orderBy: [{ createdAt: dir }, { id: dir }],
    ...cursorArgs(page),
  });
  const { items: orders, nextCursor } = pageOf(rows, page);
  return Response.json({
    nextCursor,
    orders: orders.map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      total: o.total,
      note: o.note,
      rejectReason: o.rejectReason,
      createdAt: o.createdAt,
      distributor: o.distributor.name,
      distributorLogoUrl: o.distributor.logoUrl,
      items: o.items.map((i) => ({ name: i.brandProduct.name, packSize: i.brandProduct.packSize, unit: i.brandProduct.unit, qty: i.qty, price: i.price })),
    })),
  });
});
