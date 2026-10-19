import type { Metadata } from "next";
import Link from "next/link";

// Ilova tili rus bo'lsa, ilova shu sahifani ?lang=ru bilan ochadi
type Lang = "uz" | "ru";
type Props = { searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const lang = (await searchParams).lang === "ru" ? "ru" : "uz";
  return { title: lang === "ru" ? "Политика конфиденциальности · Captar" : "Maxfiylik siyosati · Captar" };
}

const TEXT = {
  uz: {
    title: "Captar: maxfiylik siyosati",
    updated: "Oxirgi yangilanish: 2026-yil 19-oktabr",
    other: "Русский",
    general: "Umumiy",
    generalText:
      "Captar: do'konlar, distribyutorlar va tovar egalari o'rtasida buyurtma, nasiya va to'lovlar uchun mobil ilova va veb-panel. Bu sahifada qanday ma'lumot yig'ilishi, nima uchun ishlatilishi va uni qanday o'chirish mumkinligi yozilgan.",
    collected: "Qanday ma'lumot yig'iladi",
    collectedList: [
      "Telefon raqamingiz: SMS kod bilan kirish uchun.",
      "Ismingiz, do'kon yoki kompaniya nomi, manzil va tuman, ixtiyoriy ravishda STIR: hisobingiz va hamkorlaringiz sizni tanishi uchun.",
      "Buyurtmalar, nasiya (qarz) va to'lovlar, siz yuklagan to'lov cheki rasmlari, do'kon va distribyutor o'rtasidagi xabarlar.",
      "Distribyutor va tovar egasi yuklagan tovar rasmlari: katalogda do'konlarga ko'rinadi.",
      "Bildirishnoma (push) tokeni va ilovada tanlangan til: buyurtma va to'lov haqida xabarni shu tilda yuborish uchun.",
      "Ilova kutilmaganda yiqilganda xato haqida texnik ma'lumot (xato matni, ekran, ilova versiyasi, iOS yoki Android): xatoni topib tuzatish uchun. Unga telefon raqamingiz yozilmaydi.",
      "Kamera va galereya faqat siz chek yoki tovar rasmini yuklaganingizda ishlatiladi. Ilova joylashuvingizni avtomatik yig'maydi.",
    ],
    noAds: "Ilovada reklama yo'q, ma'lumotlaringiz reklama yoki kuzatish (tracking) uchun ishlatilmaydi va sotilmaydi.",
    purpose: "Ma'lumot nima uchun ishlatiladi",
    purposeList: [
      "Hisobingizga kirish va uni himoya qilish.",
      "Buyurtma berish, yetkazish, nasiya va to'lovlarni hisoblash.",
      "Do'konga distribyutor, distribyutorga tovar egasi topib berish.",
      "Buyurtma, to'lov va so'rovlar haqida bildirishnoma yuborish.",
    ],
    shared: "Ma'lumot kim bilan ulashiladi",
    sharedList: [
      "Siz ulangan distribyutor: do'koningiz ma'lumoti, buyurtmalar, qarz va to'lovlar. Tovar egasi va distribyutor esa o'zaro kelishuv doirasidagi ma'lumotni ko'radi.",
      "Xizmat ko'rsatuvchilar, faqat xizmat uchun kerakli qismi: Vercel (server) va Neon (ma'lumotlar bazasi), ikkalasi Germaniyada (Frankfurt) joylashgan; TextUP (SMS kod); Payme va Click (onlayn to'lov, karta ma'lumotlari ular tomonida qoladi, bizga kelmaydi); Expo, Apple va Google (bildirishnomalar); Sentry (ilova va server xatolari haqida texnik ma'lumot).",
      "Qonunda belgilangan hollarda vakolatli davlat organlariga.",
    ],
    storage: "Saqlash muddati va xavfsizlik",
    storageText: [
      "Ma'lumotlar hisobingiz faol bo'lgan davrda saqlanadi. SMS kodlar ochiq holda saqlanmaydi va bir necha daqiqada eskiradi. Server bilan aloqa HTTPS orqali shifrlangan.",
      "Hisob o'chirilganda ismingiz, telefon raqamingiz va bildirishnoma tokenlari o'chiriladi. Buyurtma, qarz va to'lov yozuvlari distribyutorning buxgalteriya hisobi uchun saqlanadi, lekin endi sizning ismingiz va raqamingiz bilan bog'lanmaydi.",
    ],
    deletion: "Hisobni o'chirish",
    deletionText: "Ilovada: do'kon va tovar egasi uchun bosh sahifa pastida, distribyutor xodimi uchun «Ko'proq» bo'limida «Hisobni o'chirish». Ilova o'rnatilmagan bo'lsa:",
    deletionLink: "hisobni o'chirish sahifasi",
    age: "Yosh chegarasi",
    ageText: "Captar biznes uchun mo'ljallangan va 18 yoshdan kichiklarga mo'ljallanmagan.",
    contact: "Murojaat",
    contactText: "Savollar va so'rovlar uchun:",
    footer: "Siyosat o'zgarsa, shu sahifa yangilanadi va yuqoridagi sana o'zgaradi.",
  },
  ru: {
    title: "Captar: политика конфиденциальности",
    updated: "Последнее обновление: 19 октября 2026 г.",
    other: "O'zbekcha",
    general: "Общие положения",
    generalText:
      "Captar — мобильное приложение и веб-панель для заказов, отсрочки платежа и оплат между магазинами, дистрибьюторами и производителями. Здесь описано, какие данные собираются, зачем они используются и как их удалить.",
    collected: "Какие данные собираются",
    collectedList: [
      "Номер телефона: для входа по коду из SMS.",
      "Имя, название магазина или компании, адрес и район, по желанию ИНН: для вашего аккаунта и чтобы партнёры могли вас узнать.",
      "Заказы, отсрочка (долг) и платежи, загруженные вами фото чеков, сообщения между магазином и дистрибьютором.",
      "Фото товаров, загруженные дистрибьютором и производителем: видны магазинам в каталоге.",
      "Push-токен и выбранный в приложении язык: чтобы присылать уведомления о заказах и платежах на этом языке.",
      "Технические сведения о сбое, если приложение неожиданно закрылось (текст ошибки, экран, версия приложения, iOS или Android): чтобы найти и исправить ошибку. Номер телефона в них не записывается.",
      "Камера и галерея используются только когда вы загружаете фото чека или товара. Приложение не собирает ваше местоположение.",
    ],
    noAds: "В приложении нет рекламы, ваши данные не используются для рекламы или отслеживания (tracking) и не продаются.",
    purpose: "Зачем используются данные",
    purposeList: [
      "Вход в аккаунт и его защита.",
      "Оформление заказов, доставка, расчёт отсрочки и платежей.",
      "Подбор дистрибьютора для магазина и производителя для дистрибьютора.",
      "Уведомления о заказах, платежах и запросах.",
    ],
    shared: "С кем передаются данные",
    sharedList: [
      "Дистрибьютор, к которому вы подключены: данные магазина, заказы, долг и платежи. Производитель и дистрибьютор видят данные в рамках своего соглашения.",
      "Поставщики услуг, только в нужном для услуги объёме: Vercel (сервер) и Neon (база данных), оба в Германии (Франкфурт); TextUP (SMS-коды); Payme и Click (онлайн-оплата, данные карты остаются у них и к нам не попадают); Expo, Apple и Google (уведомления); Sentry (технические сведения об ошибках приложения и сервера).",
      "Уполномоченным государственным органам в случаях, предусмотренных законом.",
    ],
    storage: "Срок хранения и безопасность",
    storageText: [
      "Данные хранятся, пока ваш аккаунт активен. SMS-коды не хранятся в открытом виде и устаревают через несколько минут. Связь с сервером шифруется по HTTPS.",
      "При удалении аккаунта удаляются ваше имя, номер телефона и push-токены. Записи о заказах, долгах и платежах сохраняются для бухгалтерии дистрибьютора, но больше не связаны с вашим именем и номером.",
    ],
    deletion: "Удаление аккаунта",
    deletionText: "В приложении: для магазина и производителя внизу главной страницы, для сотрудника дистрибьютора в разделе «Ещё» — «Удалить аккаунт». Если приложение не установлено:",
    deletionLink: "страница удаления аккаунта",
    age: "Возрастное ограничение",
    ageText: "Captar предназначен для бизнеса и не предназначен для лиц младше 18 лет.",
    contact: "Обратная связь",
    contactText: "Вопросы и запросы:",
    footer: "При изменении политики эта страница обновляется, и дата выше меняется.",
  },
} satisfies Record<Lang, Record<string, string | string[]>>;

// App Store va Google Play'ga shu sahifa manzili beriladi. Murojaat uchun: SUPPORT_EMAIL, SUPPORT_PHONE
export default async function PrivacyPage({ searchParams }: Props) {
  const lang: Lang = (await searchParams).lang === "ru" ? "ru" : "uz";
  const x = TEXT[lang];
  const email = process.env.SUPPORT_EMAIL;
  const phone = process.env.SUPPORT_PHONE;
  return (
    <main lang={lang} className="mx-auto grid max-w-2xl gap-6 px-4 py-8 text-ink sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{x.title}</h1>
          <p className="mt-1 text-sm text-hint">{x.updated}</p>
        </div>
        <Link href={lang === "ru" ? "/maxfiylik" : "/maxfiylik?lang=ru"} className="rounded-full border border-line bg-card px-3 py-1 text-sm font-medium hover:border-accent">
          {x.other}
        </Link>
      </div>

      <Section title={x.general}>
        <p>{x.generalText}</p>
      </Section>

      <Section title={x.collected}>
        <List items={x.collectedList} />
        <p>{x.noAds}</p>
      </Section>

      <Section title={x.purpose}>
        <List items={x.purposeList} />
      </Section>

      <Section title={x.shared}>
        <List items={x.sharedList} />
      </Section>

      <Section title={x.storage}>
        {x.storageText.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </Section>

      <Section title={x.deletion}>
        <p>
          {x.deletionText}{" "}
          <Link href={lang === "ru" ? "/hisobni-ochirish?lang=ru" : "/hisobni-ochirish"} className="text-accent-ink underline">
            {x.deletionLink}
          </Link>
          .
        </p>
      </Section>

      <Section title={x.age}>
        <p>{x.ageText}</p>
      </Section>

      {(email || phone) && (
        <Section title={x.contact}>
          <p>
            {x.contactText}{" "}
            {email && (
              <a href={`mailto:${email}`} className="text-accent-ink underline">
                {email}
              </a>
            )}
            {email && phone && ", "}
            {phone}
          </p>
        </Section>
      )}

      <p className="text-sm text-hint">{x.footer}</p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2 rounded-xl border border-line bg-card p-5 text-sm leading-6 shadow-card">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}
