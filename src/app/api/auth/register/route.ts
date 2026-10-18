import { z } from "zod";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { lockRegistration } from "@/lib/registration";
import { devAuthEnabled, handle, HttpError, readJson } from "@/lib/session";
import { trialPeriod } from "@/lib/subscription";
import { DAY_SECONDS, signToken, verifyToken } from "@/lib/token";

const registerInput = z.object({
  phoneToken: z.string().optional(), // mobil ilova: SMS kod bilan tasdiqlangan raqam
  shopName: z.string().trim().min(2).max(100),
  address: z.string().trim().min(5).max(200),
  district: z.string().trim().min(2).max(100),
  ownerName: z.string().trim().min(2).max(100),
  phone: z.string().optional(),
});

// Ro'yxatdan o'tish formasi uchun: distribyutorlar yetkazadigan hududlar (demo distribyutornikisiz)
export async function GET() {
  const rows = await db.distributor.findMany({ where: { status: "ACTIVE", demo: false }, select: { districts: true } });
  return Response.json({ districts: [...new Set(rows.flatMap((r) => r.districts))].sort((a, b) => a.localeCompare(b)) });
}

// Yangi do'kon o'zi ro'yxatdan o'tadi (agentsiz)
export const POST = handle(async (req: Request) => {
  const input = await readJson(req, registerInput, "Barcha maydonlarni to'ldiring");
  const { phoneToken, shopName, address, district, ownerName } = input;

  // Raqam SMS kod bilan tasdiqlangan bo'lishi shart; faqat lokal sinovda raqam to'g'ridan-to'g'ri yuboriladi
  let verifiedPhone: string | null = null;
  if (phoneToken) {
    const payload = verifyToken(phoneToken);
    if (payload?.kind !== "phone") throw new HttpError(401, "Kod muddati o'tdi. Qaytadan kiring");
    verifiedPhone = payload.phone;
  } else if (!devAuthEnabled()) {
    throw new HttpError(401, "Kirish kerak");
  }

  const phone = verifiedPhone ?? normalizePhone(input.phone ?? "");
  if (!phone) throw new HttpError(400, "Telefon raqami +998 XX XXX XX XX ko'rinishida bo'lsin");

  // Ikki marta bosilsa ham bitta do'kon yaratiladi: tasdiqlangan raqamda shu nomli do'kon bo'lsa, o'shanga kiriladi.
  // Bir raqamda nomi boshqa ikkinchi do'kon ochish mumkin.
  const user = await db.$transaction(async (tx) => {
    await lockRegistration(tx, phone);
    const existing = verifiedPhone
      ? await tx.shopUser.findFirst({ where: { phone: verifiedPhone, role: "OWNER", shop: { name: { equals: shopName, mode: "insensitive" } } } })
      : null;
    return (
      existing ??
      tx.shopUser.create({
        data: {
          name: ownerName,
          phone,
          role: "OWNER",
          // Raqam SMS kod bilan tasdiqlangan: do'kon egasining o'zi ro'yxatdan o'tmoqda
          shop: { create: { name: shopName, address, district, confirmedAt: new Date(), ...trialPeriod() } },
        },
      })
    );
  });

  const ttl = verifiedPhone ? 30 * DAY_SECONDS : DAY_SECONDS;
  const token = signToken({ kind: "shop", shopUserId: user.id, exp: Math.floor(Date.now() / 1000) + ttl });
  return Response.json({ token });
});
