"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { accountsForPhone, deleteAccountsForPhone } from "@/lib/account";
import { render, type Lang } from "@/lib/i18n";
import { clientIp, deliverOtp, verifyOtp } from "@/lib/otp";
import { normalizePhone } from "@/lib/phone";
import { HttpError } from "@/lib/session";
import { exposeCode } from "@/lib/sms";

// Sahifa tili formadagi yashirin "lang" maydonidan; xato matni ham shu tilda qaytadi
const langOf = (form: FormData): Lang => (form.get("lang") === "ru" ? "ru" : "uz");

function back(lang: Lang, params: Record<string, string>) {
  return redirect(`/hisobni-ochirish?${new URLSearchParams({ ...params, ...(lang === "ru" ? { lang } : {}) })}`);
}

const errorText = (e: unknown, fallback: string, lang: Lang) => render(e instanceof HttpError ? e.text : fallback, lang);

export async function requestDeletionCode(form: FormData) {
  const lang = langOf(form);
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  if (!phone) return back(lang, { error: render("Telefon raqami +998 XX XXX XX XX ko'rinishida bo'lsin", lang) });
  // Hisob bo'lmasa SMS yuborilmaydi, lekin javob bir xil: raqam tizimda bormi, bilib bo'lmaydi
  if ((await accountsForPhone(phone)).length === 0) return back(lang, { phone });
  let code: string;
  try {
    code = await deliverOtp(phone, clientIp(await headers()));
  } catch (e) {
    return back(lang, { error: errorText(e, "Kod yuborilmadi", lang) });
  }
  back(lang, { phone, ...(exposeCode() ? { dev: code } : {}) });
}

export async function confirmDeletion(form: FormData) {
  const lang = langOf(form);
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  if (!phone) return back(lang, { error: render("Telefon raqami noto'g'ri", lang) });
  if (form.get("confirm") !== "on") return back(lang, { phone, error: render("O'chirishni tasdiqlash uchun belgini qo'ying", lang) });
  try {
    await verifyOtp(phone, String(form.get("code") ?? ""));
  } catch (e) {
    return back(lang, { phone, error: errorText(e, "Kod noto'g'ri", lang) });
  }
  const count = await deleteAccountsForPhone(phone);
  back(lang, { done: String(count) });
}
