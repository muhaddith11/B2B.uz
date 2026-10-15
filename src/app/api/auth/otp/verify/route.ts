import { z } from "zod";
import { db } from "@/lib/db";
import { L, langOf, render } from "@/lib/i18n";
import { verifyOtp } from "@/lib/otp";
import { normalizePhone } from "@/lib/phone";
import { handle, HttpError, readJson } from "@/lib/session";
import { DAY_SECONDS, signToken } from "@/lib/token";

const ROLE_LABEL = {
  ADMIN: "admin",
  OPERATOR: "operator",
  ACCOUNTANT: "hisobchi",
  AGENT: "agent",
  COURIER: "yetkazuvchi",
} as const;

// Kodni tekshiradi va shu raqamga bog'langan hisoblarni qaytaradi: do'kon, distribyutor xodimi, tovar egasi.
// Hisob yo'q bo'lsa, phoneToken bilan ro'yxatdan o'tiladi.
export const POST = handle(async (req: Request) => {
  const body = await readJson(req, z.object({ phone: z.string(), code: z.string().regex(/^\d{6}$/) }), "Telefon yoki kod noto'g'ri");
  const phone = normalizePhone(body.phone);
  if (!phone) throw new HttpError(400, "Telefon yoki kod noto'g'ri");

  await verifyOtp(phone, body.code);
  const lang = langOf(req);

  const exp = Math.floor(Date.now() / 1000) + 30 * DAY_SECONDS;
  const [shopUsers, staff, brandUsers] = await Promise.all([
    db.shopUser.findMany({ where: { phone }, include: { shop: true }, orderBy: { createdAt: "asc" } }),
    db.staff.findMany({ where: { phone, active: true }, include: { distributor: true }, orderBy: { createdAt: "asc" } }),
    db.brandUser.findMany({ where: { phone }, include: { brand: true }, orderBy: { createdAt: "asc" } }),
  ]);

  const accounts = [
    ...shopUsers.map((u) => ({
      kind: "shop" as const,
      title: u.shop.name,
      imageUrl: u.shop.imageUrl,
      subtitle: render(L("Do'kon · {name}", { name: u.name }), lang),
      token: signToken({ kind: "shop", shopUserId: u.id, exp }),
    })),
    ...staff.map((s) => ({
      kind: "staff" as const,
      role: s.role,
      title: s.distributor.name,
      imageUrl: s.distributor.logoUrl,
      subtitle: render(L("Distribyutor · {name}, {role}", { name: s.name, role: L(ROLE_LABEL[s.role]) }), lang),
      token: signToken({ kind: "staff", staffId: s.id, exp }),
    })),
    ...brandUsers.map((u) => ({
      kind: "brand" as const,
      title: u.brand.name,
      imageUrl: u.brand.logoUrl,
      subtitle: render(L("Tovar egasi · {name}", { name: u.name }), lang),
      token: signToken({ kind: "brand", brandUserId: u.id, exp }),
    })),
  ];
  const phoneToken = signToken({ kind: "phone", phone, exp: Math.floor(Date.now() / 1000) + 30 * 60 });
  return Response.json({ phone, accounts, phoneToken });
});
