import { z } from "zod";
import { changeOrderStatus } from "@/lib/orders";
import { handle, HttpError, readJson, requireStaff } from "@/lib/session";
import { serializeOrder, staffOrder } from "@/lib/staff-data";

export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const staff = await requireStaff(req);
  const { id } = await ctx.params;
  return Response.json({ order: serializeOrder(await staffOrder(staff, id)) });
});

const statusInput = z.object({
  to: z.enum(["ACCEPTED", "REJECTED", "IN_DELIVERY", "DELIVERED", "CANCELLED"]),
  rejectReason: z.string().trim().max(300).optional(),
  courierId: z.string().optional().nullable(),
  delivered: z.array(z.object({ itemId: z.string(), deliveredQty: z.number().int().min(0) })).max(200).optional(),
});

// Holatni o'zgartirish. Yetkazuvchi faqat "topshirildi" qila oladi (o'ziga biriktirilgan yoki biriktirilmagan buyurtmani).
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const staff = await requireStaff(req, ["ADMIN", "OPERATOR", "COURIER"]);
  const { id } = await ctx.params;
  const input = await readJson(req, statusInput);
  const order = await staffOrder(staff, id);
  if (staff.role === "COURIER") {
    if (input.to !== "DELIVERED") throw new HttpError(403, "Yetkazuvchi faqat topshirilganini belgilaydi");
    if (order.courierId && order.courierId !== staff.id) throw new HttpError(403, "Bu buyurtma boshqa yetkazuvchiga biriktirilgan");
  }
  const updated = await changeOrderStatus(staff, order.id, input.to, {
    rejectReason: input.rejectReason || (input.to === "REJECTED" ? "Sabab ko'rsatilmagan" : undefined),
    courierId: input.courierId ?? null,
    delivered: input.delivered,
  });
  return Response.json({ status: updated.status, deliveredTotal: updated.deliveredTotal });
});
