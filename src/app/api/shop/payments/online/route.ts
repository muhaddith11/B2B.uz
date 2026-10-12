import { createOnlinePayment, onlinePaymentInput } from "@/lib/payments";
import { handle, readJson, requireShopUser } from "@/lib/session";

// Payme yoki Click to'lov sahifasi havolasi
export const POST = handle(async (req: Request) => {
  const user = await requireShopUser(req);
  const input = await readJson(req, onlinePaymentInput, "Summani to'g'ri kiriting");
  return Response.json(await createOnlinePayment(user, input));
});
