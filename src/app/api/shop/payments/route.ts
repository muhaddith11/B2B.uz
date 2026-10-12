import { activeLink } from "@/lib/orders";
import { paymentOptions, submitReceipt } from "@/lib/payments";
import { handle, requireShopUser } from "@/lib/session";

// To'lash ekrani: distribyutorning karta/hisob raqamlari va onlayn to'lov imkoniyati
export const GET = handle(async (req: Request) => {
  const user = await requireShopUser(req);
  const distributorId = new URL(req.url).searchParams.get("distributorId") ?? "";
  const link = await activeLink(user.shopId, distributorId);
  return Response.json({ distributor: { id: link.distributor.id, name: link.distributor.name }, ...(await paymentOptions(distributorId)) });
});

// Chek bilan to'lov (multipart: distributorId, amount, receipt, paymentMethodId?, note?)
export const POST = handle(async (req: Request) => {
  const user = await requireShopUser(req);
  const entry = await submitReceipt(user, await req.formData());
  return Response.json({ id: entry.id, status: entry.status });
});
