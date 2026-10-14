import { RU } from "./i18n-ru";
import { formatAmount } from "./money";

// Mobil ilova tili: o'zbek (asosiy) yoki rus. Ilova har so'rovda x-lang sarlavhasini yuboradi;
// xato matni va bildirishnoma shu tilda qaytadi. Kalit o'zbekcha matnning o'zi, tarjimasi i18n-ru.ts da.

export type Lang = "uz" | "ru";
export type TextKey = keyof typeof RU;
type Param = string | number | Localized;
export type Localized = { key: TextKey; params?: Record<string, Param> };
// Oddiy satr ham bo'lishi mumkin: lug'atda bo'lsa tarjima qilinadi, bo'lmasa o'zgarmaydi (masalan, nom yoki sabab)
export type Text = string | Localized;

export function L(key: TextKey, params?: Record<string, Param>): Localized {
  return { key, params };
}

// Summa: "1 234 so'm" / "1 234 сум"
export function som(n: number): Localized {
  return L("{n} so'm", { n: formatAmount(n) });
}

export function render(text: Text, lang: Lang): string {
  if (typeof text === "string") return lang === "ru" ? ((RU as Record<string, string>)[text] ?? text) : text;
  const template: string = lang === "ru" ? RU[text.key] : text.key;
  const params = text.params;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) => {
    const v = params[name];
    if (v === undefined) return m;
    return typeof v === "object" ? render(v, lang) : String(v);
  });
}

export function langOf(req: unknown): Lang {
  return req instanceof Request && req.headers.get("x-lang") === "ru" ? "ru" : "uz";
}

export function isLang(v: unknown): v is Lang {
  return v === "uz" || v === "ru";
}
