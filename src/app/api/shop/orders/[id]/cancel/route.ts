import { cancelOrderByShop } from "@/lib/orders";
import { handle, requireShopUser } from "@/lib/session";

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireShopUser(req);
  const { id } = await ctx.params;
  const order = await cancelOrderByShop(user.shopId, id);
  return Response.json({ status: order.status });
});
