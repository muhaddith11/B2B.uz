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
  await db.$transaction(async (tx) => {
    // Distribyutorning jamoa o'zgarishlari navbat bilan: ikki admin bir-birini bir vaqtda roldan tushirsa ham kamida bitta faol admin qoladi
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`team:${staff.distributorId}`}))`;
    await tx.staff.update({ where: { id }, data: input });
    const admins = await tx.staff.count({ where: { distributorId: staff.distributorId, role: "ADMIN", active: true } });
    if (admins === 0) throw new HttpError(400, "Kamida bitta faol admin qolishi kerak");
    await tx.auditLog.create({ data: { actor: `staff:${staff.id}`, action: "staff.updated", entity: "Staff", entityId: id, before: { active: target.active, role: target.role }, after: input } });
  });
  return Response.json({ ok: true });
});
