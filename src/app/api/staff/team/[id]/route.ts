import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError, readJson, requireStaff } from "@/lib/session";

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const staff = await requireStaff(req, ["ADMIN"]);
  const { id } = await ctx.params;
  const input = await readJson(req, z.object({ active: z.boolean().optional(), role: z.enum(["ADMIN", "OPERATOR", "ACCOUNTANT", "AGENT", "COURIER"]).optional() }));
  const target = await db.staff.findUnique({ where: { id } });
  if (!target || target.distributorId !== staff.distributorId) throw new HttpError(404, "Xodim topilmadi");
  if (target.id === staff.id) throw new HttpError(400, "O'zingizni o'zgartira olmaysiz");
  await db.staff.update({ where: { id }, data: input });
  await db.auditLog.create({ data: { actor: `staff:${staff.id}`, action: "staff.updated", entity: "Staff", entityId: id, before: { active: target.active, role: target.role }, after: input } });
  return Response.json({ ok: true });
});
