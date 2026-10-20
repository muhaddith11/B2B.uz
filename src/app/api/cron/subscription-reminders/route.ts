import { createHash, timingSafeEqual } from "node:crypto";
import { sendSubscriptionReminders } from "@/lib/reminders";
import { handle, HttpError } from "@/lib/session";

export const dynamic = "force-dynamic";
// SMS'lar ketma-ket yuboriladi: tashkilotlar ko'p bo'lsa vaqt oladi
export const maxDuration = 60;

// Vercel Cron har kuni chaqiradi (vercel.json). Vercel so'rovga "Authorization: Bearer CRON_SECRET" qo'shadi;
// CRON_SECRET bo'lmasa yoki mos kelmasa, hech narsa yuborilmaydi
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const digest = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(digest(req.headers.get("authorization") ?? ""), digest(`Bearer ${secret}`));
}

export const GET = handle(async (req: Request) => {
  if (!authorized(req)) throw new HttpError(401, "Ruxsat yo'q");
  return Response.json(await sendSubscriptionReminders());
});
