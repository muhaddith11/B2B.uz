import { db } from "@/lib/db";
import { verifyInitData } from "@/lib/telegram-auth";
import { DAY_SECONDS, signToken } from "@/lib/token";

// Mini App ochilganda Telegram initData'ni token'ga almashtiradi
export async function POST(req: Request) {
  const { initData } = (await req.json().catch(() => ({}))) as { initData?: string };
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!initData || !botToken) return Response.json({ error: "initData yo'q" }, { status: 400 });

  const tgUser = verifyInitData(initData, botToken);
  if (!tgUser) return Response.json({ error: "Telegram imzosi noto'g'ri" }, { status: 401 });

  const user = await db.shopUser.findUnique({ where: { telegramId: BigInt(tgUser.id) } });
  if (!user) {
    // Ro'yxatdan o'tish oqimi keyingi bosqichda: hozircha do'kon agent orqali qo'shiladi
    return Response.json({ needsRegistration: true, firstName: tgUser.first_name });
  }
  const token = signToken({ kind: "shop", shopUserId: user.id, exp: Math.floor(Date.now() / 1000) + 30 * DAY_SECONDS });
  return Response.json({ token });
}
