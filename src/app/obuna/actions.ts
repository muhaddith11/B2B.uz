"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIp, deliverOtp, verifyOtp } from "@/lib/otp";
import { normalizePhone } from "@/lib/phone";
import { HttpError } from "@/lib/session";
import { exposeCode } from "@/lib/sms";
import { createSubscriptionPayment, payableOrgs, subscriptionPaymentInput } from "@/lib/subscription";
import { signToken } from "@/lib/token";
import { SUBSCRIPTION_COOKIE, SUBSCRIPTION_SESSION_SECONDS, subscriptionPhone } from "./session";

const back = (params: Record<string, string>) => redirect(`/obuna?${new URLSearchParams(params)}`);
const message = (e: unknown, fallback: string) => (e instanceof HttpError ? e.message : fallback);

export async function requestSubscriptionCode(form: FormData) {
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  if (!phone) return back({ error: "Telefon raqami +998 XX XXX XX XX ko'rinishida bo'lsin" });
  if ((await payableOrgs(phone)).length === 0) return back({ error: "Bu raqam bilan distribyutor admini yoki do'kon egasi topilmadi" });
  let code: string;
  try {
    code = await deliverOtp(phone, clientIp(await headers()));
  } catch (e) {
    return back({ error: message(e, "Kod yuborilmadi") });
  }
  back({ phone, ...(exposeCode() ? { dev: code } : {}) });
}

export async function verifySubscriptionCode(form: FormData) {
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  if (!phone) return back({ error: "Telefon raqami noto'g'ri" });
  try {
    await verifyOtp(phone, String(form.get("code") ?? ""));
  } catch (e) {
    return back({ phone, error: message(e, "Kod noto'g'ri") });
  }
  (await cookies()).set(SUBSCRIPTION_COOKIE, signToken({ kind: "phone", phone, exp: Math.floor(Date.now() / 1000) + SUBSCRIPTION_SESSION_SECONDS }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/obuna",
    maxAge: SUBSCRIPTION_SESSION_SECONDS,
  });
  redirect("/obuna");
}

// Tanlangan tashkilot va muddat uchun to'lov yaratib, Payme yoki Click sahifasiga o'tkazadi
export async function paySubscription(form: FormData) {
  const phone = await subscriptionPhone();
  if (!phone) return back({ error: "Kirish muddati tugadi. Qaytadan kiring" });
  const parsed = subscriptionPaymentInput.safeParse({ kind: form.get("kind"), id: form.get("id"), months: form.get("months"), provider: form.get("provider") });
  if (!parsed.success) return back({ error: "Muddat va to'lov usulini tanlang" });
  let url: string;
  try {
    ({ url } = await createSubscriptionPayment(phone, parsed.data));
  } catch (e) {
    return back({ error: message(e, "To'lovni boshlab bo'lmadi. Qayta urinib ko'ring") });
  }
  redirect(url);
}

export async function subscriptionLogout() {
  (await cookies()).delete({ name: SUBSCRIPTION_COOKIE, path: "/obuna" });
  redirect("/obuna");
}
