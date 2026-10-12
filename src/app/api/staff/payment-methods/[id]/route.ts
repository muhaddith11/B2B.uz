import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError, readJson, requireStaff } from "@/lib/session";

// O'chirish o'rniga nofaol qilinadi: eski to'lovlar shu usulga bog'langan bo'lishi mumkin
export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const staff = await requireStaff(req, ["ADMIN"]);
  const { id } = await ctx.params;
  const input = await readJson(req, z.object({ active: z.boolean().optional(), isPrimary: z.boolean().optional() }));
  const m = await db.paymentMethod.findUnique({ where: { id } });
  if (!m || m.distributorId !== staff.distributorId) throw new HttpError(404, "To'lov usuli topilmadi");
  await db.$transaction(async (tx) => {
    if (input.isPrimary) await tx.paymentMethod.updateMany({ where: { distributorId: staff.distributorId }, data: { isPrimary: false } });
    await tx.paymentMethod.update({ where: { id }, data: input });
  });
  return Response.json({ ok: true });
});
