import { z } from "zod";
import { db } from "@/lib/db";
import { approveInput, approveLink, rejectLink } from "@/lib/links";
import { notifyShop } from "@/lib/push";
import { handle, HttpError, readJson, requireStaff } from "@/lib/session";

const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), priceGroupId: z.string().min(1), creditLimit: z.coerce.number(), creditDays: z.coerce.number() }),
  z.object({ action: z.literal("reject") }),
]);

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const staff = await requireStaff(req, ["ADMIN"]);
  const { id } = await ctx.params;
  const body = await readJson(req, input);
  const link = await db.shopLink.findUnique({ where: { id }, select: { shopId: true } });
  if (body.action === "approve") {
    const parsed = approveInput.safeParse({ linkId: id, priceGroupId: body.priceGroupId, creditLimit: body.creditLimit, creditDays: body.creditDays });
    if (!parsed.success) throw new HttpError(400, "Nasiya limiti yoki muddati noto'g'ri");
    await approveLink(staff, parsed.data);
    if (link) notifyShop(link.shopId, { title: "Ulanish tasdiqlandi", body: `${staff.distributor.name} katalogi ochildi`, data: { url: "/" } });
  } else {
    await rejectLink(staff, id);
    if (link) notifyShop(link.shopId, { title: "Ulanish so'rovi rad etildi", body: staff.distributor.name, data: { url: "/find" } });
  }
  return Response.json({ ok: true });
});
