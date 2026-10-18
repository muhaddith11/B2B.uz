"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { clientIp, deliverOtp, verifyOtp } from "@/lib/otp";
import { normalizePhone } from "@/lib/phone";
import { render } from "@/lib/i18n";
import { HttpError, PANEL_COOKIE, PANEL_ROLES } from "@/lib/session";
import { exposeCode } from "@/lib/sms";
import { DAY_SECONDS, signToken } from "@/lib/token";
import { panelT } from "./panel-lang";

// Panelga SMS kod bilan kirish: admin, operator va hisobchilar uchun (PANEL_ROLES).
// Raqam tizimda bormi yoki yo'qmi, kod tasdiqlanmaguncha bildirilmaydi: begona odam raqamlarni sinab, kim xodim ekanini bilib ololmaydi
const back = (params: Record<string, string>) => redirect(`/panel?${new URLSearchParams(params)}`);

async function panelStaff(phone: string) {
  return db.staff.findFirst({ where: { phone, active: true, role: { in: [...PANEL_ROLES] } }, orderBy: { createdAt: "asc" } });
}

export async function requestPanelCode(form: FormData) {
  const { lang, t } = await panelT();
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  if (!phone) return back({ error: t("Telefon raqami +998 XX XXX XX XX ko'rinishida bo'lsin") });
  // Xodim bo'lmasa SMS yuborilmaydi, lekin javob bir xil: kod kiritish sahifasi
  if (!(await panelStaff(phone))) return back({ phone });
  let code: string;
  try {
    code = await deliverOtp(phone, clientIp(await headers()));
  } catch (e) {
    return back({ error: e instanceof HttpError ? render(e.text, lang) : t("Kod yuborilmadi") });
  }
  back({ phone, ...(exposeCode() ? { dev: code } : {}) });
}

export async function verifyPanelCode(form: FormData) {
  const { lang, t } = await panelT();
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  if (!phone) return back({ error: t("Telefon raqami +998 XX XXX XX XX ko'rinishida bo'lsin") });
  try {
    await verifyOtp(phone, String(form.get("code") ?? ""));
  } catch (e) {
    return back({ error: e instanceof HttpError ? render(e.text, lang) : t("Kod noto'g'ri"), phone });
  }
  // Raqam egasi kod bilan tasdiqlandi: endi ruxsat yo'qligini aytish mumkin
  const staff = await panelStaff(phone);
  if (!staff) return back({ error: t("Bu raqam bilan admin, operator yoki hisobchi topilmadi") });
  (await cookies()).set(PANEL_COOKIE, signToken({ kind: "staff", staffId: staff.id, exp: Math.floor(Date.now() / 1000) + 7 * DAY_SECONDS }, "panel"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * DAY_SECONDS,
  });
  redirect("/panel");
}
