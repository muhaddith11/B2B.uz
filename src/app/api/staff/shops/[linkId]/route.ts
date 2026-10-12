import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError, readJson, requireStaff } from "@/lib/session";
import { PENDING_STATUSES, summarize } from "@/lib/shop-summary";
import { orderInclude, serializeOrder } from "@/lib/staff-data";

// Do'kon kartasi: qarz, nasiya shartlari, qarz daftari va oxirgi buyurtmalar
export const GET = handle(async (req: Request, ctx: { params: Promise<{ linkId: string }> }) => {
  const staff = await requireStaff(req);
  const { linkId } = await ctx.params;
  const link = await db.shopLink.findUnique({
    where: { id: linkId },
    include: {
      shop: { include: { users: { orderBy: { createdAt: "asc" } } } },
      priceGroup: { select: { id: true, name: true } },
      agent: { select: { id: true, name: true } },
      ledger: { include: { order: { select: { number: true } } }, orderBy: { date: "desc" } },
    },
  });
  if (!link || link.distributorId !== staff.distributorId) throw new HttpError(404, "Do'kon topilmadi");
  const [pending, orders] = await Promise.all([
    db.order.findMany({ where: { shopLinkId: link.id, status: { in: [...PENDING_STATUSES] } }, select: { total: true, paymentType: true } }),
    db.order.findMany({ where: { shopLinkId: link.id }, include: orderInclude, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  return Response.json({
    linkId: link.id,
    status: link.status,
    shop: { id: link.shop.id, name: link.shop.name, address: link.shop.address, district: link.shop.district, inn: link.shop.inn },
    users: link.shop.users.map((u) => ({ name: u.name, phone: u.phone, role: u.role })),
    terms: { priceGroup: link.priceGroup, creditLimit: link.creditLimit, creditDays: link.creditDays, blockAfterDays: link.blockAfterDays, agent: link.agent },
    summary: summarize(link.ledger, pending, link.creditLimit),
    ledger: link.ledger.slice(0, 100).map((e) => ({
      id: e.id,
      type: e.type,
      amount: e.amount,
      date: e.date,
      dueDate: e.dueDate,
      status: e.status,
      channel: e.channel,
      note: e.note,
      receiptUrl: e.receiptUrl,
      orderNumber: e.order?.number ?? null,
    })),
    orders: orders.map(serializeOrder),
  });
});

const termsInput = z.object({
  priceGroupId: z.string().nullable().optional(),
  creditLimit: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  creditDays: z.coerce.number().int().min(1).max(180).optional(),
  blockAfterDays: z.coerce.number().int().min(0).max(365).nullable().optional(),
  agentId: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "BLOCKED"]).optional(),
});

// Admin nasiya shartlari, narx guruhi va agentni o'zgartiradi
export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ linkId: string }> }) => {
  const staff = await requireStaff(req, ["ADMIN"]);
  const { linkId } = await ctx.params;
  const input = await readJson(req, termsInput);
  const link = await db.shopLink.findUnique({ where: { id: linkId } });
  if (!link || link.distributorId !== staff.distributorId) throw new HttpError(404, "Do'kon topilmadi");
  if (link.status === "REQUESTED") throw new HttpError(400, "Avval ulanish so'rovini tasdiqlang");
  if (input.priceGroupId && !(await db.priceGroup.findFirst({ where: { id: input.priceGroupId, distributorId: staff.distributorId } }))) {
    throw new HttpError(400, "Narx guruhi topilmadi");
  }
  if (input.agentId && !(await db.staff.findFirst({ where: { id: input.agentId, distributorId: staff.distributorId, role: "AGENT" } }))) {
    throw new HttpError(400, "Agent topilmadi");
  }
  const updated = await db.shopLink.update({ where: { id: link.id }, data: input });
  await db.auditLog.create({
    data: {
      actor: `staff:${staff.id}`,
      action: "link.terms",
      entity: "ShopLink",
      entityId: link.id,
      before: { priceGroupId: link.priceGroupId, creditLimit: link.creditLimit, creditDays: link.creditDays, blockAfterDays: link.blockAfterDays, agentId: link.agentId, status: link.status },
      after: input,
    },
  });
  return Response.json({ ok: true, status: updated.status });
});
