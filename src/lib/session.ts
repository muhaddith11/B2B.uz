import { cookies } from "next/headers";
import type { StaffRole } from "@prisma/client";
import { db } from "./db";
import { langOf, render, type Lang, type Text } from "./i18n";
import { normalizePhone } from "./phone";
import { verifyToken } from "./token";

export const PANEL_COOKIE = "panel_session";
export const ADMIN_COOKIE = "admin_session";

// Xato matni o'zbekcha (message) va so'rov tilida (render: text): ilova ruscha bo'lsa, javob ham ruscha
export class HttpError extends Error {
  constructor(
    public status: number,
    public text: Text,
  ) {
    super(render(text, "uz"));
  }
}

function bearer(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  return verifyToken(header.replace(/^Bearer\s+/i, ""));
}

// Mobil ilova so'rovlari: Authorization: Bearer <token>
export async function requireShopUser(req: Request) {
  const payload = bearer(req);
  if (!payload || payload.kind !== "shop") throw new HttpError(401, "Kirish kerak");
  const user = await db.shopUser.findUnique({ where: { id: payload.shopUserId }, include: { shop: true } });
  if (!user) throw new HttpError(401, "Foydalanuvchi topilmadi");
  return user;
}

// Mobil ilova: distribyutor xodimi. roles berilsa, faqat shu rollarga ruxsat.
export async function requireStaff(req: Request, roles?: StaffRole[]) {
  const payload = bearer(req);
  if (!payload || payload.kind !== "staff") throw new HttpError(401, "Kirish kerak");
  const staff = await db.staff.findFirst({ where: { id: payload.staffId, active: true }, include: { distributor: true } });
  if (!staff) throw new HttpError(401, "Xodim topilmadi yoki o'chirilgan");
  if (roles && !roles.includes(staff.role)) throw new HttpError(403, "Bu amal sizning rolingiz uchun emas");
  return staff;
}

// Mobil ilova: tovar egasi
export async function requireBrandUser(req: Request) {
  const payload = bearer(req);
  if (!payload || payload.kind !== "brand") throw new HttpError(401, "Kirish kerak");
  const user = await db.brandUser.findUnique({ where: { id: payload.brandUserId }, include: { brand: true } });
  if (!user) throw new HttpError(401, "Foydalanuvchi topilmadi");
  return user;
}

// So'rov kimdan kelgani (push token ro'yxatga olish va fayllarga ruxsat uchun)
export function bearerPayload(req: Request) {
  return bearer(req);
}

// Panel sahifalari: cookie
export async function getStaff() {
  const store = await cookies();
  const payload = verifyToken(store.get(PANEL_COOKIE)?.value);
  if (!payload || payload.kind !== "staff") return null;
  return db.staff.findFirst({
    where: { id: payload.staffId, active: true },
    include: { distributor: true },
  });
}

// Platforma adminlari: PLATFORM_ADMIN_PHONES (vergul bilan) ro'yxatidagi raqamlar
export function platformAdminPhones(): string[] {
  return (process.env.PLATFORM_ADMIN_PHONES ?? "")
    .split(",")
    .map((p) => normalizePhone(p))
    .filter((p): p is string => p !== null);
}

export async function getAdmin() {
  const store = await cookies();
  const payload = verifyToken(store.get(ADMIN_COOKIE)?.value);
  if (!payload || payload.kind !== "admin") return null;
  // Sinov rejimidagi kirish ("dev") yoki ro'yxatda hozir ham bor raqam
  if (payload.phone === "dev" ? !devAuthEnabled() : !platformAdminPhones().includes(payload.phone)) return null;
  return { phone: payload.phone };
}

export function devAuthEnabled(): boolean {
  return process.env.DEV_AUTH === "1" && process.env.NODE_ENV !== "production";
}

export function errorResponse(e: unknown, lang: Lang = "uz"): Response {
  if (e instanceof HttpError) return Response.json({ error: render(e.text, lang) }, { status: e.status });
  console.error(e);
  return Response.json({ error: render("Serverda xato", lang) }, { status: 500 });
}

// Route handler'larni bir xil xato bilan o'rash (xato matni so'rov tilida)
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      return errorResponse(e, langOf(args[0]));
    }
  };
}

// So'rov tanasini zod sxemasi bilan o'qish
export async function readJson<T>(req: Request, schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } }, message: Text = "Ma'lumotlar noto'g'ri"): Promise<T> {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new HttpError(400, message);
  return parsed.data;
}
