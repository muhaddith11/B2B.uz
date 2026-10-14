"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { accountsForPhone, deleteAccountsForPhone } from "@/lib/account";
import { clientIp, deliverOtp, verifyOtp } from "@/lib/otp";
import { normalizePhone } from "@/lib/phone";
import { HttpError } from "@/lib/session";
import { exposeCode } from "@/lib/sms";

const back = (params: Record<string, string>) => redirect(`/hisobni-ochirish?${new URLSearchParams(params)}`);

export async function requestDeletionCode(form: FormData) {
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  if (!phone) return back({ error: "Telefon raqami +998 XX XXX XX XX ko'rinishida bo'lsin" });
  if ((await accountsForPhone(phone)).length === 0) return back({ error: "Bu raqam bilan hisob topilmadi" });
  let code: string;
  try {
    code = await deliverOtp(phone, clientIp(await headers()));
  } catch (e) {
    return back({ error: e instanceof HttpError ? e.message : "Kod yuborilmadi" });
  }
  back({ phone, ...(exposeCode() ? { dev: code } : {}) });
}

export async function confirmDeletion(form: FormData) {
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  if (!phone) return back({ error: "Telefon raqami noto'g'ri" });
  if (form.get("confirm") !== "on") return back({ phone, error: "O'chirishni tasdiqlash uchun belgini qo'ying" });
  try {
    await verifyOtp(phone, String(form.get("code") ?? ""));
  } catch (e) {
    return back({ phone, error: e instanceof HttpError ? e.message : "Kod noto'g'ri" });
  }
  const count = await deleteAccountsForPhone(phone);
  back({ done: String(count) });
}
