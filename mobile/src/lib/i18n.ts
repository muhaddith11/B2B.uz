import { getLocales } from 'expo-localization';

import { RU, type Key } from './i18n-ru';

// Ilova tili: o'zbek (lotin) yoki rus. Kalit o'zbekcha matnning o'zi, tarjimasi i18n-ru.ts da
// (lug'atda yo'q kalit TypeScript xatosi beradi). Til almashganda butun navigator qayta chiziladi (_layout.tsx),
// shuning uchun t() ni oddiy funksiya sifatida, istalgan joyda chaqirish mumkin.

export type Lang = 'uz' | 'ru';
export type { Key };
type Params = Record<string, string | number>;

let current: Lang = 'uz';

export function getLang(): Lang {
  return current;
}

export function setCurrentLang(lang: Lang) {
  current = lang;
}

// Birinchi ochilishda: telefon tili rus bo'lsa rus, aks holda o'zbek
export function deviceLang(): Lang {
  try {
    return getLocales()[0]?.languageCode === 'ru' ? 'ru' : 'uz';
  } catch {
    return 'uz';
  }
}

// Rus tilida son bilan kelgan so'zning shakli: 1 магазин, 2 магазина, 5 магазинов
function ruForm(n: number): 0 | 1 | 2 {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return 2;
  if (b === 1) return 0;
  if (b > 1 && b < 5) return 1;
  return 2;
}

// Bir xil o'zbekcha so'z ruschada har xil bo'lsa, kalitga ma'no qo'shiladi: "kelishuv|Tugagan" (o'zbekchada "Tugagan")
export function t(key: Key, params?: Params): string {
  const value = current === 'ru' ? RU[key] : key.slice(key.indexOf('|') + 1);
  const template = typeof value === 'string' ? value : value[ruForm(Number(params?.n ?? 0))];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (params[name] === undefined ? m : String(params[name])));
}

// Ma'lumot ichidagi tizim so'zlari (yetkazish kunlari, avtomatik izohlar): lug'atda bo'lsa tarjima, bo'lmasa o'zi
export function tx(text: string): string {
  if (current !== 'ru') return text;
  const value = (RU as Record<string, string | readonly string[]>)[text];
  return typeof value === 'string' ? value : text;
}

// To'lov izohi: server avtomatik yozgan qismlar tarjima qilinadi ("Rad etildi: sabab"), odam yozgani o'zgarmaydi
export function txNote(note: string): string {
  if (current !== 'ru') return note;
  return tx(note).replace(/Rad etildi: /g, `${RU['Rad etildi:']} `).replace(/Bekor qilindi: /g, `${RU['Bekor qilindi:']} `);
}
