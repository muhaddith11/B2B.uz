import { z } from "zod";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { lockRegistration } from "@/lib/registration";
import { devAuthEnabled } from "@/lib/session";
import { verifyInitData } from "@/lib/telegram-auth";
import { DAY_SECONDS, signToken, verifyToken } from "@/lib/token";

const registerInput = z.object({
  initData: z.string().optional(), // Telegram Mini App
  phoneToken: z.string().optional(), // mobil ilova: SMS kod bilan tasdiqlangan raqam
  shopName: z.string().trim().min(2).max(100),
  address: z.string().trim().min(5).max(200),
  district: z.string().trim().min(2).max(100),
  ownerName: z.string().trim().min(2).max(100),
  phone: z.string().optional(),
});

// Ro'yxatdan o'tish formasi uchun: distribyutorlar yetkazadigan hududlar
export async function GET() {
  const rows = await db.distributor.findMany({ where: { status: "ACTIVE" }, select: { districts: true } });
  return Response.json({ districts: [...new Set(rows.flatMap((r) => r.districts))].sort((a, b) => a.localeCompare(b)) });
}

// Yangi do'kon o'zi ro'yxatdan o'tadi (agentsiz)
export async function POST(req: Request) {
  const parsed = registerInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Barcha maydonlarni to'ldiring" }, { status: 400 });
  const { initData, phoneToken, shopName, address, district, ownerName } = parsed.data;

  let telegramId: bigint | null = null;
  let verifiedPhone: string | null = null;
  if (phoneToken) {
    const payload = verifyToken(phoneToken);
    if (payload?.kind !== "phone") return Response.json({ error: "Kod muddati o'tdi. Qaytadan kiring" }, { status: 401 });
    verifiedPhone = payload.phone;
  } else if (initData) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const tgUser = botToken ? verifyInitData(initData, botToken) : null;
    if (!tgUser) return Response.json({ error: "Telegram imzosi noto'g'ri" }, { status: 401 });
    telegramId = BigInt(tgUser.id);
  } else if (!devAuthEnabled()) {
    return Response.json({ error: "Ilovani Telegram ichida oching" }, { status: 401 });
  }

  const phone = verifiedPhone ?? normalizePhone(parsed.data.phone ?? "");
  if (!phone) return Response.json({ error: "Telefon raqami +998 XX XXX XX XX ko'rinishida bo'lsin" }, { status: 400 });

  // Ikki marta bosilsa ham bitta do'kon yaratiladi: Telegram hisobi yoki tasdiqlangan raqamda shu nomli do'kon bo'lsa, o'shanga kiriladi.
  // Bir raqamda nomi boshqa ikkinchi do'kon ochish mumkin.
  const user = await db.$transaction(async (tx) => {
    await lockRegistration(tx, phone);
    const existing = telegramId
      ? await tx.shopUser.findUnique({ where: { telegramId } })
      : verifiedPhone
        ? await tx.shopUser.findFirst({ where: { phone: verifiedPhone, role: "OWNER", shop: { name: { equals: shopName, mode: "insensitive" } } } })
        : null;
    return (
      existing ??
      tx.shopUser.create({
        data: {
          name: ownerName,
          phone,
          telegramId,
          role: "OWNER",
          shop: { create: { name: shopName, address, district } },
        },
      })
    );
  });

  const ttl = telegramId || verifiedPhone ? 30 * DAY_SECONDS : DAY_SECONDS;
  const token = signToken({ kind: "shop", shopUserId: user.id, exp: Math.floor(Date.now() / 1000) + ttl });
  return Response.json({ token });
}
