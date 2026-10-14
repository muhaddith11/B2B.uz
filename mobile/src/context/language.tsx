import { createContext, Fragment, useCallback, useContext, useEffect, useState } from 'react';

import { deviceLang, setCurrentLang, type Lang } from '@/lib/i18n';
import { kv } from '@/lib/storage';

type Ctx = { lang: Lang; setLang: (lang: Lang) => void };

const LanguageContext = createContext<Ctx | null>(null);
const LANG_KEY = 'lang';

// Tanlangan til xotirada saqlanadi; birinchi ochilishda telefon tili olinadi.
// Til xotiradan o'qilguncha hech narsa chizilmaydi (splash ko'rinib turadi), aks holda ekran bir lahza boshqa tilda chiqadi.
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang | null>(null);

  useEffect(() => {
    kv.get(LANG_KEY).then((saved) => {
      const l: Lang = saved === 'ru' || saved === 'uz' ? saved : deviceLang();
      setCurrentLang(l);
      setLangState(l);
    });
  }, []);

  const setLang = useCallback((l: Lang) => {
    setCurrentLang(l);
    kv.set(LANG_KEY, l);
    setLangState(l);
  }, []);

  if (!lang) return null;
  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage LanguageProvider ichida ishlatiladi');
  return ctx;
}

// Til almashganda ichidagi hamma narsa qaytadan chiziladi: barcha matnlar yangi tilda chiqadi
export function LanguageKeyed({ children }: { children: React.ReactNode }) {
  const { lang } = useLanguage();
  return <Fragment key={lang}>{children}</Fragment>;
}
