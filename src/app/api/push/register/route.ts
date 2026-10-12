import { z } from "zod";
import { registerPushToken } from "@/lib/push";
import { bearerPayload, handle, HttpError, readJson } from "@/lib/session";

// Mobil ilova kirgandan keyin qurilmaning Expo push tokenini yuboradi
export const POST = handle(async (req: Request) => {
  const { token } = await readJson(req, z.object({ token: z.string().regex(/^Expo(nent)?PushToken\[.+\]$/) }), "Push token noto'g'ri");
  const who = bearerPayload(req);
  if (who?.kind === "shop") await registerPushToken(token, "SHOP_USER", who.shopUserId);
  else if (who?.kind === "staff") await registerPushToken(token, "STAFF", who.staffId);
  else if (who?.kind === "brand") await registerPushToken(token, "BRAND_USER", who.brandUserId);
  else throw new HttpError(401, "Kirish kerak");
  return Response.json({ ok: true });
});
