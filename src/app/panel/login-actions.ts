"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { deliverOtp, verifyOtp } from "@/lib/otp";
import { normalizePhone } from "@/lib/phone";
import { HttpError, PANEL_COOKIE } from "@/lib/session";
import { exposeCode } from "@/lib/sms";
import { DAY_SECONDS, signToken } from "@/lib/token";

// Panelga SMS kod bilan kirish: admin, operator va hisobchilar uchun
const PANEL_ROLES = ["ADMIN", "OPERATOR", "ACCOUNTANT"] as const;
const back = (params: Record<string, string>) => redirect(`/panel?${new URLSearchParams(params)}`);

async function panelStaff(phone: string) {
  return db.staff.findFirst({ where: { phone, active: true, role: { in: [...PANEL_ROLES] } }, orderBy: { createdAt: "asc" } });
}

export async function requestPanelCode(form: FormData) {
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  if (!phone) return back({ error: "Telefon raqami +998 XX XXX XX XX ko'rinishida bo'lsin" });
  if (!(await panelStaff(phone))) return back({ error: "Bu raqam bilan admin, operator yoki hisobchi topilmadi" });
  let code: string;
  try {
    code = await deliverOtp(phone);
  } catch (e) {
    return back({ error: e instanceof HttpError ? e.message : "Kod yuborilmadi" });
  }
  back({ phone, ...(exposeCode() ? { dev: code } : {}) });
}

export async function verifyPanelCode(form: FormData) {
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  const staff = phone ? await panelStaff(phone) : null;
  if (!phone || !staff) return back({ error: "Ruxsat yo'q" });
  try {
    await verifyOtp(phone, String(form.get("code") ?? ""));
  } catch (e) {
    return back({ error: e instanceof HttpError ? e.message : "Kod noto'g'ri", phone });
  }
  (await cookies()).set(PANEL_COOKIE, signToken({ kind: "staff", staffId: staff.id, exp: Math.floor(Date.now() / 1000) + 7 * DAY_SECONDS }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * DAY_SECONDS,
  });
  redirect("/panel");
}
