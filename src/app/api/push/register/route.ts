import { z } from "zod";
import { langOf } from "@/lib/i18n";
import { registerPushToken } from "@/lib/push";
import { handle, readJson, requireAccount } from "@/lib/session";

// Mobil ilova kirgandan keyin qurilmaning Expo push tokenini yuboradi
export const POST = handle(async (req: Request) => {
  const { token, lang } = await readJson(
    req,
    z.object({ token: z.string().regex(/^Expo(nent)?PushToken\[.+\]$/), lang: z.enum(["uz", "ru"]).optional() }),
    "Push token noto'g'ri",
  );
  // Hisob mavjud, faol va sessiyasi yopilmagan bo'lishi kerak
  const account = await requireAccount(req);
  // Bildirishnoma tili: ilovada tanlangan (eski ilova versiyasi yubormasa, so'rov sarlavhasidan)
  await registerPushToken(token, account, lang ?? langOf(req));
  return Response.json({ ok: true });
});
