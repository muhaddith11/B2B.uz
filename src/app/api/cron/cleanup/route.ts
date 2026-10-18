import { timingSafeEqual } from "node:crypto";
import { cleanup } from "@/lib/cleanup";
import { logEvent, reportError } from "@/lib/monitoring";

// Vercel Cron kuniga bir marta chaqiradi (vercel.json). CRON_SECRET o'rnatilgan bo'lsa, Vercel uni
// "Authorization: Bearer <CRON_SECRET>" sarlavhasida yuboradi; boshqa hech kim bu ishni ishga tushira olmaydi
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const a = Buffer.from(req.headers.get("authorization") ?? "");
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: "Ruxsat yo'q" }, { status: 401 });
  try {
    const result = await cleanup();
    logEvent("kunlik tozalash", { area: "cron", ...result });
    return Response.json(result);
  } catch (e) {
    reportError(e, { area: "cron" });
    return Response.json({ error: "Tozalash bajarilmadi" }, { status: 500 });
  }
}
