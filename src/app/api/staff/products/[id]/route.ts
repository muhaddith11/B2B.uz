import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError, readJson, requireStaff } from "@/lib/session";

const patchInput = z.object({
  inStock: z.boolean().optional(),
  active: z.boolean().optional(),
  // Asosiy narx guruhidagi narx; boshqa guruhlar shu foizda o'zgaradi
  price: z.coerce.number().int().positive().max(100_000_000).optional(),
});

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const staff = await requireStaff(req, ["ADMIN", "OPERATOR"]);
  const { id } = await ctx.params;
  const input = await readJson(req, patchInput);
  const product = await db.product.findUnique({ where: { id }, include: { prices: { include: { priceGroup: true } } } });
  if (!product || product.distributorId !== staff.distributorId) throw new HttpError(404, "Tovar topilmadi");

  await db.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data: { inStock: input.inStock, active: input.active } });
    if (input.price !== undefined) {
      const base = product.prices.find((p) => p.priceGroup.isDefault);
      for (const p of product.prices) {
        // Guruhlar orasidagi nisbat saqlanadi (masalan, katta do'konga 3% arzon). Butun so'mga yaxlitlanadi:
        // yuzlikka yaxlitlash arzon tovarda chegirmani yo'qotib, guruh narxini asosiy narxga tenglashtirib qo'yardi
        const next = base && base.price > 0 && !p.priceGroup.isDefault ? Math.max(1, Math.round((p.price * input.price) / base.price)) : input.price;
        await tx.price.update({ where: { id: p.id }, data: { price: next, validFrom: new Date() } });
      }
    }
    await tx.auditLog.create({ data: { actor: `staff:${staff.id}`, action: "product.update", entity: "Product", entityId: id, after: input } });
  });
  return Response.json({ ok: true });
});
