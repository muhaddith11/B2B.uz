import { z } from "zod";
import { db } from "@/lib/db";
import { verifyOtp } from "@/lib/otp";
import { normalizePhone } from "@/lib/phone";
import { handle, HttpError, readJson } from "@/lib/session";
import { DAY_SECONDS, signToken } from "@/lib/token";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "admin",
  OPERATOR: "operator",
  ACCOUNTANT: "hisobchi",
  AGENT: "agent",
  COURIER: "yetkazuvchi",
};

// Kodni tekshiradi va shu raqamga bog'langan hisoblarni qaytaradi: do'kon, distribyutor xodimi, tovar egasi.
// Hisob yo'q bo'lsa, phoneToken bilan ro'yxatdan o'tiladi.
export const POST = handle(async (req: Request) => {
  const body = await readJson(req, z.object({ phone: z.string(), code: z.string().regex(/^\d{6}$/) }), "Telefon yoki kod noto'g'ri");
  const phone = normalizePhone(body.phone);
  if (!phone) throw new HttpError(400, "Telefon yoki kod noto'g'ri");

  await verifyOtp(phone, body.code);

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
      subtitle: `Do'kon · ${u.name}`,
      token: signToken({ kind: "shop", shopUserId: u.id, exp }),
    })),
    ...staff.map((s) => ({
      kind: "staff" as const,
      role: s.role,
      title: s.distributor.name,
      subtitle: `Distribyutor · ${s.name}, ${ROLE_LABEL[s.role]}`,
      token: signToken({ kind: "staff", staffId: s.id, exp }),
    })),
    ...brandUsers.map((u) => ({
      kind: "brand" as const,
      title: u.brand.name,
      subtitle: `Tovar egasi · ${u.name}`,
      token: signToken({ kind: "brand", brandUserId: u.id, exp }),
    })),
  ];
  const phoneToken = signToken({ kind: "phone", phone, exp: Math.floor(Date.now() / 1000) + 30 * 60 });
  return Response.json({ phone, accounts, phoneToken });
});
