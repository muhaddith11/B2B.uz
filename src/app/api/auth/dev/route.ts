import { db } from "@/lib/db";
import { devAuthEnabled } from "@/lib/session";
import { DAY_SECONDS, signToken } from "@/lib/token";

// Faqat lokal sinov uchun: Telegram'siz brauzerda demo do'kon nomidan kirish
export async function GET() {
  if (!devAuthEnabled()) return Response.json({ error: "O'chirilgan" }, { status: 404 });
  const users = await db.shopUser.findMany({ include: { shop: true }, orderBy: { createdAt: "asc" } });
  return Response.json({ users: users.map((u) => ({ id: u.id, name: u.name, shop: u.shop.name })) });
}

export async function POST(req: Request) {
  if (!devAuthEnabled()) return Response.json({ error: "O'chirilgan" }, { status: 404 });
  const { shopUserId } = (await req.json().catch(() => ({}))) as { shopUserId?: string };
  const user = shopUserId ? await db.shopUser.findUnique({ where: { id: shopUserId } }) : null;
  if (!user) return Response.json({ error: "Topilmadi" }, { status: 404 });
  const token = signToken({ kind: "shop", shopUserId: user.id, exp: Math.floor(Date.now() / 1000) + DAY_SECONDS });
  return Response.json({ token });
}
