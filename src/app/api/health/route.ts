import { db } from "@/lib/db";
import { reportError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

// Uptime monitoring uchun (masalan, UptimeRobot yoki Better Stack har daqiqada so'raydi): server va baza ishlayaptimi.
// Maxfiy ma'lumot qaytarmaydi; versiya (commit) deploydan keyin to'g'ri kod ishlayotganini ko'rish uchun
export async function GET() {
  const started = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json(
      { ok: true, db: "ok", dbMs: Date.now() - started, version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local" },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    reportError(e, { area: "health" }, "fatal");
    return Response.json({ ok: false, db: "down" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
