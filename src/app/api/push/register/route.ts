import { z } from "zod";
import { langOf } from "@/lib/i18n";
import { registerPushToken } from "@/lib/push";
import { bearerPayload, handle, HttpError, readJson } from "@/lib/session";

// Mobil ilova kirgandan keyin qurilmaning Expo push tokenini yuboradi
export const POST = handle(async (req: Request) => {
  const { token, lang } = await readJson(
    req,
    z.object({ token: z.string().regex(/^Expo(nent)?PushToken\[.+\]$/), lang: z.enum(["uz", "ru"]).optional() }),
    "Push token noto'g'ri",
  );
  // Bildirishnoma tili: ilovada tanlangan (eski ilova versiyasi yubormasa, so'rov sarlavhasidan)
  const l = lang ?? langOf(req);
  const who = bearerPayload(req);
  if (who?.kind === "shop") await registerPushToken(token, "SHOP_USER", who.shopUserId, l);
  else if (who?.kind === "staff") await registerPushToken(token, "STAFF", who.staffId, l);
  else if (who?.kind === "brand") await registerPushToken(token, "BRAND_USER", who.brandUserId, l);
  else throw new HttpError(401, "Kirish kerak");
  return Response.json({ ok: true });
});
