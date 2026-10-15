import type { Metadata } from "next";
import Link from "next/link";
import { confirmDeletion, requestDeletionCode } from "./actions";

type Params = Record<string, string | undefined>;

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
  return { title: (await searchParams).lang === "ru" ? "Удаление аккаунта · Captar" : "Hisobni o'chirish · Captar" };
}
export const dynamic = "force-dynamic";

const TEXT = {
  uz: {
    title: "Captar: hisobni o'chirish",
    other: "Русский",
    done: (n: string) => `Hisobingiz o'chirildi (${n} ta). Bu raqam bilan endi kira olmaysiz. Xohlasangiz, istalgan vaqtda qaytadan ro'yxatdan o'tishingiz mumkin.`,
    intro: "Telefon raqamingizga bog'langan barcha Captar hisoblari (do'kon, distribyutor xodimi, tovar egasi) o'chiriladi.",
    removedLabel: "O'chiriladi:",
    removed: "ismingiz, telefon raqamingiz, bildirishnoma tokenlari. Siz bu hisob bilan boshqa kira olmaysiz.",
    keptLabel: "Saqlanadi:",
    kept: "buyurtma, qarz va to'lov yozuvlari. Ular distribyutorning buxgalteriya hisobi uchun qonun bo'yicha kerak, lekin endi sizning ismingiz va raqamingiz bilan bog'lanmaydi.",
    phone: "Telefon raqamingiz",
    getCode: "Kod olish",
    sent: (p: string) => `${p} raqamiga hisob bog'langan bo'lsa, unga SMS kod yuborildi.`,
    dev: (c: string) => `Sinov rejimi: kod ${c}`,
    code: "SMS kod",
    agree: "Hisobim butunlay o'chirilishiga roziman. Buni qaytarib bo'lmaydi.",
    submit: "Hisobni o'chirish",
    privacy: "Maxfiylik siyosati",
  },
  ru: {
    title: "Captar: удаление аккаунта",
    other: "O'zbekcha",
    done: (n: string) => `Аккаунт удалён (${n}). С этим номером войти больше нельзя. При желании можно зарегистрироваться заново в любое время.`,
    intro: "Будут удалены все аккаунты Captar, привязанные к вашему номеру (магазин, сотрудник дистрибьютора, производитель).",
    removedLabel: "Удаляется:",
    removed: "ваше имя, номер телефона, push-токены. Войти в этот аккаунт больше не получится.",
    keptLabel: "Сохраняется:",
    kept: "записи о заказах, долгах и платежах. По закону они нужны для бухгалтерии дистрибьютора, но больше не связаны с вашим именем и номером.",
    phone: "Ваш номер телефона",
    getCode: "Получить код",
    sent: (p: string) => `Если к номеру ${p} привязан аккаунт, на него отправлен код по SMS.`,
    dev: (c: string) => `Тестовый режим: код ${c}`,
    code: "Код из SMS",
    agree: "Я согласен с полным удалением аккаунта. Это нельзя отменить.",
    submit: "Удалить аккаунт",
    privacy: "Политика конфиденциальности",
  },
};

// Ilovani o'chirib yuborgan foydalanuvchi ham hisobini shu yerdan o'chira oladi (Google Play talabi)
export default async function DeleteAccountPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { phone, error, dev, done, lang: l } = await searchParams;
  const lang = l === "ru" ? "ru" : "uz";
  const x = TEXT[lang];
  return (
    <main lang={lang} className="mx-auto grid max-w-md gap-5 px-4 py-8 text-ink sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-xl font-bold">{x.title}</h1>
        <Link href={lang === "ru" ? "/hisobni-ochirish" : "/hisobni-ochirish?lang=ru"} className="shrink-0 rounded-full border border-line bg-card px-3 py-1 text-sm font-medium hover:border-accent">
          {x.other}
        </Link>
      </div>

      {done ? (
        <p className="rounded-lg bg-ok-soft p-3 text-sm font-medium text-ok">{x.done(done)}</p>
      ) : (
        <>
          <div className="grid gap-2 rounded-xl border border-line bg-card p-5 text-sm leading-6 shadow-card">
            <p>{x.intro}</p>
            <p>
              <b>{x.removedLabel}</b> {x.removed}
            </p>
            <p>
              <b>{x.keptLabel}</b> {x.kept}
            </p>
          </div>

          {error && <p className="rounded-lg bg-danger-soft p-3 text-sm font-medium text-danger">{error}</p>}

          {!phone ? (
            <form action={requestDeletionCode} className="grid gap-3">
              <input type="hidden" name="lang" value={lang} />
              <label className="grid gap-1.5 text-sm font-medium text-hint">
                {x.phone}
                <input name="phone" placeholder="+998 90 123 45 67" inputMode="tel" autoComplete="tel" className="field" />
              </label>
              <button className="btn btn-primary">{x.getCode}</button>
            </form>
          ) : (
            <form action={confirmDeletion} className="grid gap-3">
              <input type="hidden" name="lang" value={lang} />
              <input type="hidden" name="phone" value={phone} />
              <p className="text-sm text-hint">{x.sent(phone)}</p>
              {dev && <p className="text-sm text-accent-ink">{x.dev(dev)}</p>}
              <label className="grid gap-1.5 text-sm font-medium text-hint">
                {x.code}
                <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="field num tracking-[0.3em]" />
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="confirm" className="mt-1 size-4 accent-[var(--c-danger)]" />
                <span>{x.agree}</span>
              </label>
              <button className="btn btn-danger">{x.submit}</button>
            </form>
          )}
        </>
      )}

      <Link href={lang === "ru" ? "/maxfiylik?lang=ru" : "/maxfiylik"} className="text-sm text-accent-ink underline">
        {x.privacy}
      </Link>
    </main>
  );
}
