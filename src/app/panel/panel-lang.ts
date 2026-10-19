import { cookies } from "next/headers";
import type { Lang } from "@/lib/i18n";
import { panelText } from "./texts";

// Panel tili: cookie'da (yuqoridagi O'zbekcha / Русский tugmasi o'zgartiradi). Birinchi kirishda o'zbekcha
export const PANEL_LANG_COOKIE = "panel_lang";

export async function panelLang(): Promise<Lang> {
  return (await cookies()).get(PANEL_LANG_COOKIE)?.value === "ru" ? "ru" : "uz";
}

export async function panelT() {
  const lang = await panelLang();
  return { lang, t: panelText(lang) };
}
