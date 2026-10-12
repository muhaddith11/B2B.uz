"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { deliverOtp, verifyOtp } from "@/lib/otp";
import { normalizePhone } from "@/lib/phone";
import { ADMIN_COOKIE, devAuthEnabled, getAdmin, HttpError, platformAdminPhones } from "@/lib/session";
import { exposeCode } from "@/lib/sms";
import { DAY_SECONDS, signToken } from "@/lib/token";

const back = (params: Record<string, string>) => redirect(`/admin?${new URLSearchParams(params)}`);

async function setSession(phone: string) {
  const store = await cookies();
  store.set(ADMIN_COOKIE, signToken({ kind: "admin", phone, exp: Math.floor(Date.now() / 1000) + DAY_SECONDS }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: DAY_SECONDS,
  });
}

export async function requestAdminCode(form: FormData) {
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  if (!phone || !platformAdminPhones().includes(phone)) back({ error: "Bu raqam platforma adminlari ro'yxatida yo'q" });
  let code: string;
  try {
    code = await deliverOtp(phone!, (c) => `Savdo platformasi admin kodi: ${c}`);
  } catch (e) {
    return back({ error: e instanceof HttpError ? e.message : "Kod yuborilmadi" });
  }
  back({ phone: phone!, ...(exposeCode() ? { dev: code } : {}) });
}

export async function verifyAdminCode(form: FormData) {
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  if (!phone || !platformAdminPhones().includes(phone)) back({ error: "Ruxsat yo'q" });
  try {
    await verifyOtp(phone!, String(form.get("code") ?? ""));
  } catch (e) {
    return back({ error: e instanceof HttpError ? e.message : "Kod noto'g'ri", phone: phone! });
  }
  await setSession(phone!);
  redirect("/admin");
}

export async function devAdminLogin() {
  if (!devAuthEnabled()) back({ error: "Sinov rejimi o'chirilgan" });
  await setSession("dev");
  redirect("/admin");
}

export async function adminLogout() {
  (await cookies()).delete({ name: ADMIN_COOKIE, path: "/admin" });
  redirect("/admin");
}

async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin");
  return admin;
}

export async function setDistributorStatus(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id"));
  const status = form.get("status") === "ACTIVE" ? "ACTIVE" : "PENDING";
  await db.distributor.update({ where: { id }, data: { status } });
  await db.auditLog.create({ data: { actor: `admin:${admin.phone}`, action: `distributor.${status}`, entity: "Distributor", entityId: id } });
  redirect("/admin");
}

export async function setBrandStatus(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id"));
  const status = form.get("status") === "ACTIVE" ? "ACTIVE" : "PENDING";
  await db.brand.update({ where: { id }, data: { status } });
  await db.auditLog.create({ data: { actor: `admin:${admin.phone}`, action: `brand.${status}`, entity: "Brand", entityId: id } });
  redirect("/admin");
}
