import { z } from "zod";
import { answerLedgerByShop } from "@/lib/corrections";
import { handle, readJson, requireShopUser } from "@/lib/session";

const answerInput = z.object({ accept: z.boolean() });

// Do'kon egasi distribyutor qo'shmoqchi bo'lgan qarzni tasdiqlaydi yoki rad etadi
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireShopUser(req);
  const { id } = await ctx.params;
  const { accept } = await readJson(req, answerInput, "Javob noto'g'ri");
  const entry = await answerLedgerByShop(user, id, accept);
  return Response.json({ status: entry.status });
});
