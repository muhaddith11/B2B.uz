import type { Metadata } from "next";
import Link from "next/link";

type Props = { searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const ru = (await searchParams).lang === "ru";
  return {
    title: "Captar",
    description: ru
      ? "Заказы у дистрибьюторов, оплата и учёт долгов в одном приложении"
      : "Distribyutorlardan buyurtma, to'lov va qarz daftari bitta ilovada",
  };
}

// Faqat haqiqiy imkoniyatlar: raqam, mijoz sharhi yoki logotip yo'q (ilova hali ishga tushmagan)
const TEXT = {
  uz: {
    other: "Русский",
    title: "Distribyutorlardan buyurtma, to'lov va qarz daftari bitta ilovada",
    lead: "Do'kon, distribyutor va tovar egasi uchun bitta ilova. Kirish telefon raqami va SMS kod bilan.",
    soon: "Ilova tez orada App Store va Google Play'da",
    roles: [
      {
        title: "Do'kon egasi",
        points: [
          "Bir nechta distribyutordan bitta savatda buyurtma",
          "Qarzni ilovaning o'zida ko'rish va to'lash: Payme, Click yoki chek bilan",
          "Hududingizdagi yangi distribyutorni topish",
        ],
      },
      {
        title: "Distribyutor",
        points: [
          "Buyurtmani qabul qilish, yetkazuvchiga berish, qisman topshirish",
          "Nasiya limiti va muddati har do'kon uchun alohida",
          "Agent do'kon nomidan buyurtma oladi, naqd pul yoziladi",
        ],
      },
      {
        title: "Tovar egasi",
        points: ["Tovarni distribyutorlarga narx bilan taklif qilish", "Hudud va chegirma bo'yicha kelishuv tuzish", "Qaysi distribyutor orqali qancha sotilganini ko'rish"],
      },
    ],
    panel: "Distribyutor paneli",
    panelText: "Kompyuterdan: Excel prays-list yuklash, buyurtmalar va ulanish so'rovlari.",
    subscription: "Obuna",
    subscriptionText: "Distribyutor va do'kon uchun 12 oy tekin, keyin oylik to'lov.",
    privacy: "Maxfiylik siyosati",
    deletion: "Hisobni o'chirish",
  },
  ru: {
    other: "O'zbekcha",
    title: "Заказы у дистрибьюторов, оплата и учёт долгов в одном приложении",
    lead: "Одно приложение для магазина, дистрибьютора и производителя. Вход по номеру телефона и коду из SMS.",
    soon: "Приложение скоро появится в App Store и Google Play",
    roles: [
      {
        title: "Владелец магазина",
        points: [
          "Заказ у нескольких дистрибьюторов в одной корзине",
          "Долг виден и оплачивается прямо в приложении: Payme, Click или по чеку",
          "Поиск новых дистрибьюторов в вашем районе",
        ],
      },
      {
        title: "Дистрибьютор",
        points: [
          "Приём заказа, передача курьеру, частичная доставка",
          "Лимит и срок отсрочки отдельно для каждого магазина",
          "Агент оформляет заказ от имени магазина и записывает наличные",
        ],
      },
      {
        title: "Производитель",
        points: ["Предложение товара дистрибьюторам с ценой", "Соглашения по району и скидке", "Продажи по каждому дистрибьютору"],
      },
    ],
    panel: "Панель дистрибьютора",
    panelText: "С компьютера: загрузка прайс-листа Excel, заказы и запросы на подключение.",
    subscription: "Подписка",
    subscriptionText: "Для дистрибьютора и магазина 12 месяцев бесплатно, затем ежемесячная оплата.",
    privacy: "Политика конфиденциальности",
    deletion: "Удаление аккаунта",
  },
};

export default async function Home({ searchParams }: Props) {
  const lang = (await searchParams).lang === "ru" ? "ru" : "uz";
  const x = TEXT[lang];
  const q = lang === "ru" ? "?lang=ru" : "";
  return (
    <main lang={lang} className="mx-auto grid max-w-4xl gap-10 px-4 py-8 text-ink sm:px-6 sm:py-12">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Vaqtinchalik logo: ko'k fonda oq "C" (ilova belgisi bilan bir xil) */}
          <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-xl font-bold text-white" aria-hidden>
            C
          </span>
          <span className="text-xl font-bold">Captar</span>
        </div>
        <Link href={lang === "ru" ? "/" : "/?lang=ru"} className="rounded-full border border-line bg-card px-3 py-1 text-sm font-medium hover:border-accent">
          {x.other}
        </Link>
      </header>

      <section className="grid max-w-2xl gap-4">
        <h1 className="text-3xl font-bold leading-tight text-balance sm:text-4xl">{x.title}</h1>
        <p className="text-lg text-hint">{x.lead}</p>
        <p className="w-fit rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent-ink">{x.soon}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {x.roles.map((r) => (
          <div key={r.title} className="grid content-start gap-3 rounded-xl border border-line bg-card p-5 shadow-card">
            <h2 className="text-lg font-semibold">{r.title}</h2>
            <ul className="grid gap-2 text-sm leading-6 text-hint">
              {r.points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/panel" className="grid gap-1 rounded-xl border border-line bg-card p-5 shadow-card hover:border-accent">
          <span className="font-semibold text-accent-ink">{x.panel} →</span>
          <span className="text-sm text-hint">{x.panelText}</span>
        </Link>
        <Link href="/obuna" className="grid gap-1 rounded-xl border border-line bg-card p-5 shadow-card hover:border-accent">
          <span className="font-semibold text-accent-ink">{x.subscription} →</span>
          <span className="text-sm text-hint">{x.subscriptionText}</span>
        </Link>
      </section>

      <footer className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-6 text-sm text-hint">
        <Link href={`/maxfiylik${q}`} className="hover:text-ink">
          {x.privacy}
        </Link>
        <Link href={`/hisobni-ochirish${q}`} className="hover:text-ink">
          {x.deletion}
        </Link>
      </footer>
    </main>
  );
}
