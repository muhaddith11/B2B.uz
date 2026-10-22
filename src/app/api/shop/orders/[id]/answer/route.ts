import { z } from "zod";
import { answerOrderByShop } from "@/lib/orders";
import { handle, readJson, requireShopUser } from "@/lib/session";

const answerInput = z.object({ accept: z.boolean() });

// Do'kon egasi distribyutor xodimi kiritgan buyurtmani tasdiqlaydi yoki rad etadi
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireShopUser(req);
  const { id } = await ctx.params;
  const { accept } = await readJson(req, answerInput, "Javob noto'g'ri");
  const order = await answerOrderByShop(user, id, accept);
  return Response.json({ status: order.status });
});
