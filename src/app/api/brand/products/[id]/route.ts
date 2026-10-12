import { brandProductInput } from "@/lib/brands";
import { db } from "@/lib/db";
import { handle, HttpError, readJson, requireBrandUser } from "@/lib/session";

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireBrandUser(req);
  const { id } = await ctx.params;
  const input = await readJson(req, brandProductInput.partial());
  const p = await db.brandProduct.findUnique({ where: { id } });
  if (!p || p.brandId !== user.brandId) throw new HttpError(404, "Tovar topilmadi");
  await db.brandProduct.update({ where: { id }, data: input });
  return Response.json({ ok: true });
});
