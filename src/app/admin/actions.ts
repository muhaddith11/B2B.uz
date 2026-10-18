"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { clientIp, deliverOtp, verifyOtp } from "@/lib/otp";
import { normalizePhone } from "@/lib/phone";
import { ADMIN_COOKIE, devAuthEnabled, getAdmin, HttpError, platformAdminPhones } from "@/lib/session";
import { formatDate } from "@/lib/money";
import { extendManually, MONTH_OPTIONS, setMonthlyPrice } from "@/lib/subscription";
import { exposeCode } from "@/lib/sms";
import { DAY_SECONDS, signToken } from "@/lib/token";

const back = (params: Record<string, string>) => redirect(`/admin?${new URLSearchParams(params)}`);

async function setSession(phone: string) {
  const store = await cookies();
  store.set(ADMIN_COOKIE, signToken({ kind: "admin", phone, exp: Math.floor(Date.now() / 1000) + DAY_SECONDS }, "admin"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: DAY_SECONDS,
  });
}

export async function requestAdminCode(form: FormData) {
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  if (!phone) return back({ error: "Telefon raqami noto'g'ri" });
  // Adminlar ro'yxatida bo'lmasa SMS yuborilmaydi, lekin javob bir xil: qaysi raqam admin ekanini bilib bo'lmaydi
  if (!platformAdminPhones().includes(phone)) return back({ phone });
  let code: string;
  try {
    code = await deliverOtp(phone, clientIp(await headers()), "admin");
  } catch (e) {
    return back({ error: e instanceof HttpError ? e.message : "Kod yuborilmadi" });
  }
  back({ phone, ...(exposeCode() ? { dev: code } : {}) });
}

export async function verifyAdminCode(form: FormData) {
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  if (!phone) return back({ error: "Telefon raqami noto'g'ri" });
  try {
    await verifyOtp(phone, String(form.get("code") ?? ""), new Date(), "admin");
  } catch (e) {
    return back({ error: e instanceof HttpError ? e.message : "Kod noto'g'ri", phone });
  }
  if (!platformAdminPhones().includes(phone)) return back({ error: "Ruxsat yo'q" });
  await setSession(phone);
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

// Tasdiqlangan distribyutorning nomi va STIRi faqat shu yerda o'zgaradi (ilovadan emas): platforma tekshirib o'zgartiradi
export async function renameDistributor(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id"));
  const name = String(form.get("name") ?? "").trim();
  const inn = String(form.get("inn") ?? "").replace(/\D/g, "");
  if (name.length < 2 || name.length > 150) return back({ error: "Nomi 2 dan 150 belgigacha bo'lsin" });
  if (inn && inn.length !== 9) return back({ error: "STIR 9 xonali bo'lsin" });
  const before = await db.distributor.findUnique({ where: { id }, select: { name: true, inn: true } });
  if (!before) return back({ error: "Distribyutor topilmadi" });
  await db.distributor.update({ where: { id }, data: { name, inn: inn || null } });
  await db.auditLog.create({ data: { actor: `admin:${admin.phone}`, action: "distributor.renamed", entity: "Distributor", entityId: id, before, after: { name, inn: inn || null } } });
  back({ ok: `${name}: saqlandi` });
}

export async function setBrandStatus(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id"));
  const status = form.get("status") === "ACTIVE" ? "ACTIVE" : "PENDING";
  await db.brand.update({ where: { id }, data: { status } });
  await db.auditLog.create({ data: { actor: `admin:${admin.phone}`, action: `brand.${status}`, entity: "Brand", entityId: id } });
  redirect("/admin");
}

// ---- Obuna ----

export async function setSubscriptionPriceAction(form: FormData) {
  const admin = await requireAdmin();
  const price = Number(String(form.get("price") ?? "").replace(/\D/g, ""));
  try {
    await setMonthlyPrice(price, `admin:${admin.phone}`);
  } catch (e) {
    return back({ error: e instanceof HttpError ? e.message : "Narx saqlanmadi" });
  }
  back({ ok: "Narx saqlandi" });
}

// Saytdan tashqari to'lov (masalan, bank o'tkazmasi) uchun obunani qo'lda uzaytirish
export async function extendSubscriptionAction(form: FormData) {
  const admin = await requireAdmin();
  const kind = form.get("kind") === "shop" ? "shop" : "distributor";
  const months = Number(form.get("months"));
  const q = String(form.get("q") ?? "");
  if (!(MONTH_OPTIONS as readonly number[]).includes(months)) return back({ q, error: "Muddatni tanlang" });
  const paidUntil = await extendManually({ kind, id: String(form.get("id")) }, months, `admin:${admin.phone}`);
  back({ q, ok: `Obuna ${formatDate(paidUntil)} gacha uzaytirildi` });
}
