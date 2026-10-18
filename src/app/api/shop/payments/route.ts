import { payableLink } from "@/lib/orders";
import { paymentOptions, submitReceipt } from "@/lib/payments";
import { handle, HttpError, requireShopUser } from "@/lib/session";

// To'lash ekrani: distribyutorning karta/hisob raqamlari va onlayn to'lov imkoniyati
export const GET = handle(async (req: Request) => {
  const user = await requireShopUser(req);
  const distributorId = new URL(req.url).searchParams.get("distributorId") ?? "";
  // Bloklangan distribyutorga ham qarz to'lanadi
  const link = await payableLink(user.shopId, distributorId);
  return Response.json({ distributor: { id: link.distributor.id, name: link.distributor.name }, ...(await paymentOptions(distributorId)) });
});

// Chek bilan to'lov (multipart: distributorId, amount, receipt, paymentMethodId?, note?)
export const POST = handle(async (req: Request) => {
  const user = await requireShopUser(req);
  // Tana multipart bo'lmasa formData() xato tashlaydi: server xatosi (500) o'rniga aniq javob
  const form = await req.formData().catch(() => null);
  if (!form) throw new HttpError(400, "Chek rasmini yuklang");
  const entry = await submitReceipt(user, form);
  return Response.json({ id: entry.id, status: entry.status });
});
