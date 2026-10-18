import { z } from "zod";
import { reportError } from "@/lib/monitoring";
import { bearerPayload, handle, readJson } from "@/lib/session";

// Mobil ilovadagi kutilmagan xatolar (ekran yiqildi, JS xatosi): server monitoringiga (Sentry, log).
// Ilovaga alohida SDK kerak emas. Tana va maydonlar cheklangan: bu manzil orqali logni to'ldirib bo'lmaydi
const input = z.object({
  message: z.string().max(500),
  stack: z.string().max(4000).optional(),
  screen: z.string().max(200).optional(),
  fatal: z.boolean().optional(),
  platform: z.enum(["ios", "android", "web"]).optional(),
  appVersion: z.string().max(40).optional(),
});

// Bir nusxada (funksiya instansiyasida) bitta manzildan daqiqada ko'pi bilan shuncha hisobot
const PER_MINUTE = 20;
const seen = new Map<string, { minute: number; n: number }>();

function allow(key: string, now = Date.now()): boolean {
  const minute = Math.floor(now / 60_000);
  const s = seen.get(key);
  if (!s || s.minute !== minute) {
    seen.set(key, { minute, n: 1 });
    if (seen.size > 5000) seen.clear();
    return true;
  }
  return ++s.n <= PER_MINUTE;
}

export const POST = handle(async (req: Request) => {
  const body = await readJson(req, input);
  const who = bearerPayload(req);
  const account = who && who.kind !== "admin" && who.kind !== "phone" ? `${who.kind}:${"staffId" in who ? who.staffId : "shopUserId" in who ? who.shopUserId : who.brandUserId}` : "anonim";
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "?";
  if (!allow(`${account}|${ip}`)) return new Response(null, { status: 429 });
  const error = Object.assign(new Error(body.message), { name: "MobileError", stack: body.stack ? `MobileError: ${body.message}\n${body.stack}` : undefined });
  reportError(error, { area: "mobile", screen: body.screen, platform: body.platform, appVersion: body.appVersion, account }, body.fatal ? "fatal" : "error");
  return new Response(null, { status: 204 });
});
