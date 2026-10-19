import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { agentOrderInput, createOrderForLink } from "@/lib/orders";
import { cursorArgs, pageOf, readPage } from "@/lib/paging";
import { handle, readJson, requireStaff } from "@/lib/session";
import { orderInclude, orderScope, serializeOrder, staffLink } from "@/lib/staff-data";

const STATUSES: OrderStatus[] = ["SENT", "ACCEPTED", "IN_DELIVERY", "DELIVERED", "REJECTED", "CANCELLED"];

export const GET = handle(async (req: Request) => {
  const staff = await requireStaff(req);
  const url = new URL(req.url);
  const params = url.searchParams;
  const raw = params.get("status");
  const status = STATUSES.includes(raw as OrderStatus) ? (raw as OrderStatus) : null;
  const linkId = params.get("linkId");
  const page = readPage(url, 100);
  // Yangi buyurtmalar eng eskisidan (navbat bilan qabul qilinadi), qolganlari eng yangisidan
  const dir = status === "SENT" ? "asc" : "desc";
  const rows = await db.order.findMany({
    where: { ...orderScope(staff), ...(status ? { status } : {}), ...(linkId ? { shopLinkId: linkId } : {}) },
    include: orderInclude,
    orderBy: [{ createdAt: dir }, { id: dir }],
    ...cursorArgs(page),
  });
  const { items, nextCursor } = pageOf(rows, page);
  return Response.json({ orders: items.map(serializeOrder), nextCursor });
});

// Agent (yoki operator) do'kon nomidan buyurtma oladi
export const POST = handle(async (req: Request) => {
  const staff = await requireStaff(req, ["ADMIN", "OPERATOR", "AGENT"]);
  const input = await readJson(req, agentOrderInput, "Buyurtma ma'lumotlari noto'g'ri");
  const link = await staffLink(staff, input.linkId);
  const order = await createOrderForLink(link, { staffId: staff.id }, input);
  return Response.json({ id: order.id, number: order.number, total: order.total });
});
