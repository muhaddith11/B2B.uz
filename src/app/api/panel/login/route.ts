import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { devAuthEnabled, PANEL_COOKIE } from "@/lib/session";
import { DAY_SECONDS, signToken } from "@/lib/token";

// Sinov rejimida xodim tanlab kirish. Haqiqiy kirish (Telegram orqali kod) keyingi bosqichda.
export async function POST(req: Request) {
  const form = await req.formData();
  const store = await cookies();

  if (form.get("action") === "logout") {
    store.delete(PANEL_COOKIE);
    return Response.redirect(new URL("/panel", req.url), 303);
  }

  if (!devAuthEnabled()) return new Response("O'chirilgan", { status: 404 });
  const staff = await db.staff.findUnique({ where: { id: String(form.get("staffId") ?? "") } });
  if (!staff) return new Response("Topilmadi", { status: 404 });

  store.set(PANEL_COOKIE, signToken({ kind: "staff", staffId: staff.id, exp: Math.floor(Date.now() / 1000) + 7 * DAY_SECONDS }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * DAY_SECONDS,
  });
  return Response.redirect(new URL("/panel", req.url), 303);
}
