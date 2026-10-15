import { z } from "zod";
import { answerInvite } from "@/lib/links";
import { handle, HttpError, readJson, requireShopUser } from "@/lib/session";

// Distribyutorning ulanish taklifiga javob: faqat do'kon egasi. Qabul qilinsa katalog ochiladi, rad etilsa taklif o'chadi
export const POST = handle(async (req: Request, ctx: { params: Promise<{ linkId: string }> }) => {
  const user = await requireShopUser(req);
  if (user.role !== "OWNER") throw new HttpError(403, "Taklifga do'kon egasi javob beradi");
  const { action } = await readJson(req, z.object({ action: z.enum(["accept", "reject"]) }));
  const { linkId } = await ctx.params;
  await answerInvite(user.shopId, linkId, action, `shop:${user.id}`);
  return Response.json({ ok: true });
});
