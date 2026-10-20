import type { Metadata } from "next";
import Link from "next/link";
import { formatAmount } from "@/lib/money";
import { GRACE_DAYS, MONTH_OPTIONS, monthlyPrice, TRIAL_MONTHS } from "@/lib/subscription";

// Ommaviy oferta: platformadan foydalanish va obuna shartlari. Payme va Click kassa ulashda saytda shu sahifani so'raydi.
// Narx, tekin davr va imtiyoz kunlari obuna sozlamasidan olinadi (src/lib/subscription.ts, narx /admin dan), shuning
// uchun matn koddagi qoidadan farq qilmaydi. Ijrochi rekvizitlari env'dan: COMPANY_NAME, COMPANY_INN, COMPANY_ADDRESS,
// COMPANY_BANK; murojaat uchun SUPPORT_EMAIL, SUPPORT_PHONE. Ilova tili rus bo'lsa ?lang=ru bilan ochiladi
type Lang = "uz" | "ru";
type Props = { searchParams: Promise<{ lang?: string }> };
type Section = { title: string; items: string[]; link?: { href: string; label: string } };

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const lang = (await searchParams).lang === "ru" ? "ru" : "uz";
  return { title: lang === "ru" ? "Публичная оферта · Captar" : "Ommaviy oferta · Captar" };
}

type Vars = { company: string; price: string; trial: number; grace: number; months: string };

function text(lang: Lang, v: Vars) {
  if (lang === "ru") {
    return {
      title: "Captar: публичная оферта",
      subtitle: "Условия использования платформы и договор на оказание услуги подписки",
      updated: "Вступает в силу: 20 октября 2026 г.",
      other: "O'zbekcha",
      requisites: "Реквизиты исполнителя",
      labels: { name: "Наименование", inn: "ИНН", address: "Адрес", bank: "Банковские реквизиты", phone: "Телефон", email: "Эл. почта" },
      sections: [
        {
          title: "Общие положения",
          items: [
            `Настоящий документ определяет условия использования мобильного приложения и сайта Captar (далее — «Платформа»), предоставляемых ${v.company} (далее — «Исполнитель»), и является публичной офертой в соответствии с Гражданским кодексом Республики Узбекистан.`,
            "Регистрация на Платформе, вход в неё или оплата подписки означают полное и безоговорочное принятие (акцепт) настоящей оферты. Если вы не согласны с условиями, не пользуйтесь Платформой.",
            "Платформа предназначена для бизнеса: ею пользуются юридические лица, индивидуальные предприниматели и их сотрудники. Пользователю должно быть не меньше 18 лет.",
          ],
        },
        {
          title: "Термины",
          items: [
            "Пользователь — лицо, зарегистрированное на Платформе по номеру телефона: владелец или продавец магазина, сотрудник дистрибьютора, производитель (владелец товара).",
            "Организация — магазин, дистрибьютор или производитель на Платформе; все её сотрудники работают от имени одной организации.",
            "Подписка — право организации на полное использование Платформы; срок считается в месяцах.",
          ],
        },
        {
          title: "Предмет услуги",
          items: [
            "Платформа даёт магазинам, дистрибьюторам и производителям программный инструмент для оформления и приёма заказов, каталога, цен, учёта отсрочки (долга) и платежей, сотрудников и уведомлений, а также помогает магазину найти дистрибьютора, а дистрибьютору — производителя.",
            "Исполнитель не является стороной сделок купли-продажи между пользователями: за качество, цену и доставку товара, за долг и его возврат отвечают сами стороны сделки.",
            "Магазин оплачивает дистрибьютору через собственную кассу Payme или Click дистрибьютора либо переводом; эти деньги не проходят через счёт Исполнителя.",
          ],
        },
        {
          title: "Регистрация и аккаунт",
          items: [
            "Вход в аккаунт — по номеру телефона и коду из SMS. Пользователь отвечает за то, чтобы посторонние не получили доступ к его номеру и телефону; действия из аккаунта считаются действиями этого пользователя.",
            "Пользователь указывает достоверные сведения о себе и своей организации. Дистрибьютор и производитель начинают торговлю после проверки Исполнителем.",
            "Администратор организации добавляет сотрудников и определяет их права; за действия сотрудников отвечает организация.",
          ],
        },
        {
          title: "Стоимость подписки и порядок оплаты",
          items: [
            "Подписка платная для дистрибьюторов и магазинов; для производителей Платформа пока бесплатна. Все сотрудники организации работают по одной подписке, число сотрудников не ограничено.",
            `Первые ${v.trial} месяцев с даты подключения организации — бесплатно. Далее стоимость подписки — ${v.price} в месяц.`,
            `Подписка оплачивается заранее на ${v.months} мес.: на сайте на странице /obuna через Payme или Click либо банковским переводом по согласованию с Исполнителем. После подтверждения оплаты срок продлевается автоматически: если срок не истёк — с его окончания, если истёк — со дня оплаты.`,
            `Если срок истёк и оплата не поступила, даётся ${v.grace} дней льготного периода. После него оформление и приём новых заказов закрываются; начатые доставки, учёт долга, платежи и просмотр данных продолжают работать. После оплаты всё восстанавливается сразу.`,
            "Исполнитель вправе изменить стоимость; это не влияет на уже оплаченный срок.",
            "Оплаченная подписка не возвращается, кроме случаев, когда услуга не была оказана по вине Исполнителя или платёж списан ошибочно (например, дважды): в этом случае в течение 10 рабочих дней после обращения деньги возвращаются или срок продлевается.",
          ],
        },
        {
          title: "Обязанности пользователя",
          items: [
            "Не продавать через Платформу товары, запрещённые законом или требующие лицензии, которой у него нет.",
            "Не регистрироваться от имени, номера или организации другого лица, не загружать фиктивные заказы, платежи или чеки.",
            "Не мешать работе Платформы: не пытаться её взломать, получить доступ к чужим данным или отправлять автоматические массовые запросы.",
            "Иметь права на загружаемые фото и тексты.",
          ],
        },
        {
          title: "Права и обязанности исполнителя",
          items: [
            "Принимать разумные меры для бесперебойной работы Платформы и защищать данные в соответствии с политикой конфиденциальности.",
            "Ненадолго останавливать Платформу для технических работ, обновлять приложение и отключать устаревшие версии.",
            "При нарушении условий приостанавливать аккаунт или организацию с предупреждением или без него.",
          ],
        },
        {
          title: "Ответственность",
          items: [
            "Платформа предоставляется «как есть». Исполнитель не отвечает за убытки, возникшие из сделок между пользователями, товара, доставки и долгов.",
            "Исполнитель не отвечает за сбои третьих лиц: интернета, оператора связи, SMS и платёжных систем, Apple и Google.",
            "Ответственность Исполнителя в любом случае не превышает суммы подписки, оплаченной организацией за последние 3 месяца.",
            "Стороны освобождаются от ответственности при обстоятельствах непреодолимой силы (форс-мажор).",
          ],
        },
        {
          title: "Персональные данные",
          items: ["Данные пользователей обрабатываются в соответствии с политикой конфиденциальности Платформы."],
          link: { href: "/maxfiylik?lang=ru", label: "Политика конфиденциальности" },
        },
        {
          title: "Срок действия и расторжение",
          items: [
            "Оферта действует с момента принятия до удаления аккаунта.",
            "Пользователь может в любое время удалить аккаунт в приложении или на странице удаления аккаунта.",
          ],
        },
        {
          title: "Разрешение споров",
          items: [
            "Споры сначала решаются путём переговоров; срок ответа на обращение — 10 рабочих дней. Если договориться не удалось, спор рассматривается в суде в соответствии с законодательством Республики Узбекистан.",
          ],
        },
        {
          title: "Изменение оферты",
          items: [
            "Исполнитель вправе изменять оферту. Новая редакция вступает в силу со дня публикации на этой странице; продолжение использования Платформы означает принятие новой редакции.",
          ],
        },
      ] satisfies Section[],
    };
  }
  return {
    title: "Captar: ommaviy oferta",
    subtitle: "Platformadan foydalanish shartlari va obuna xizmatini ko'rsatish shartnomasi",
    updated: "Kuchga kirgan sana: 2026-yil 20-oktabr",
    other: "Русский",
    requisites: "Ijrochi rekvizitlari",
    labels: { name: "Nomi", inn: "STIR", address: "Manzil", bank: "Bank rekvizitlari", phone: "Telefon", email: "Elektron pochta" },
    sections: [
      {
        title: "Umumiy qoidalar",
        items: [
          `Ushbu hujjat ${v.company} (keyingi o'rinlarda «Ijrochi») taqdim etadigan Captar mobil ilovasi va saytidan (keyingi o'rinlarda «Platforma») foydalanish shartlarini belgilaydi va O'zbekiston Respublikasi Fuqarolik kodeksiga muvofiq ommaviy oferta hisoblanadi.`,
          "Platformada ro'yxatdan o'tish, unga kirish yoki obuna uchun to'lov qilish ushbu ofertani to'liq va so'zsiz qabul qilish (aksept) hisoblanadi. Shartlarga rozi bo'lmasangiz, Platformadan foydalanmang.",
          "Platforma biznes uchun mo'ljallangan: undan yuridik shaxslar, yakka tartibdagi tadbirkorlar va ularning xodimlari foydalanadi. Foydalanuvchi 18 yoshdan kichik bo'lmasligi kerak.",
        ],
      },
      {
        title: "Atamalar",
        items: [
          "Foydalanuvchi: Platformada telefon raqami bilan ro'yxatdan o'tgan shaxs (do'kon egasi yoki sotuvchisi, distribyutor xodimi, tovar egasi).",
          "Tashkilot: Platformadagi do'kon, distribyutor yoki tovar egasi; uning barcha xodimlari bitta tashkilot nomidan ishlaydi.",
          "Obuna: tashkilotning Platformadan to'liq foydalanish huquqi; muddati oylarda hisoblanadi.",
        ],
      },
      {
        title: "Xizmat mazmuni",
        items: [
          "Platforma do'kon, distribyutor va tovar egasiga buyurtma berish va qabul qilish, katalog, narxlar, nasiya (qarz) va to'lovlar hisobi, xodimlar va bildirishnomalar uchun dasturiy vosita beradi, shuningdek do'konga distribyutor, distribyutorga tovar egasi topishga yordam beradi.",
          "Ijrochi foydalanuvchilar o'rtasidagi oldi-sotdi bitimlarining tarafi emas: tovar sifati, narxi va yetkazib berilishi, qarz va uni qaytarish uchun bitim taraflari o'zlari javob beradi.",
          "Do'kon distribyutorga to'lovni distribyutorning o'z Payme yoki Click kassasi orqali yoki o'tkazma bilan qiladi; bu pullar Ijrochi hisobidan o'tmaydi.",
        ],
      },
      {
        title: "Ro'yxatdan o'tish va hisob",
        items: [
          "Hisobga telefon raqami va SMS kod bilan kiriladi. Foydalanuvchi raqami va telefoniga begonalar kirmasligi uchun o'zi javob beradi; hisobdan qilingan amallar shu foydalanuvchiniki hisoblanadi.",
          "Foydalanuvchi o'zi va tashkiloti haqida to'g'ri ma'lumot beradi. Distribyutor va tovar egasi Ijrochi tekshiruvidan o'tgach savdo qila boshlaydi.",
          "Tashkilot admini xodimlarni qo'shadi va ularning huquqlarini belgilaydi; xodimlarning amallari uchun tashkilot javob beradi.",
        ],
      },
      {
        title: "Obuna narxi va to'lov tartibi",
        items: [
          "Distribyutor va do'kon uchun obuna pullik, tovar egasi uchun Platforma hozircha bepul. Tashkilotning barcha xodimlari bitta obuna bilan ishlaydi, xodimlar soni cheklanmaydi.",
          `Tashkilot Platformaga qo'shilgan kundan boshlab ${v.trial} oy tekin. Keyin obuna narxi oyiga ${v.price}.`,
          `Obuna ${v.months} oyga oldindan to'lanadi: saytdagi /obuna sahifasida Payme yoki Click orqali yoki Ijrochi bilan kelishib bank o'tkazmasi bilan. To'lov tasdiqlangach muddat avtomatik uzayadi: muddat tugamagan bo'lsa uning oxiridan, tugagan bo'lsa to'lov kunidan boshlab.`,
          `Muddat tugab, to'lov qilinmasa, ${v.grace} kun imtiyoz beriladi. Undan keyin yangi buyurtma berish va qabul qilish yopiladi; boshlangan yetkazishlar, qarz hisobi, to'lovlar va ma'lumotlarni ko'rish ishlayveradi. To'lov qilingach hammasi darhol tiklanadi.`,
          "Ijrochi narxni o'zgartirishi mumkin; bu oldindan to'langan muddatga ta'sir qilmaydi.",
          "To'langan obuna puli qaytarilmaydi. Bundan xizmat Ijrochi aybi bilan ko'rsatilmagan yoki to'lov xato (masalan, ikki marta) yechilgan hollar mustasno: bunda murojaatdan keyin 10 ish kunida pul qaytariladi yoki muddat uzaytiriladi.",
        ],
      },
      {
        title: "Foydalanuvchining majburiyatlari",
        items: [
          "Platforma orqali qonun bilan taqiqlangan yoki o'zida litsenziyasi bo'lmagan holda sotib bo'lmaydigan tovarlarni sotmaslik.",
          "Boshqa shaxsning nomi, raqami yoki tashkiloti nomidan ro'yxatdan o'tmaslik, soxta buyurtma, to'lov yoki chek yuklamaslik.",
          "Platformaning ishlashiga xalaqit bermaslik: uni buzishga, begona ma'lumotlarga kirishga yoki avtomatik ommaviy so'rovlar yuborishga urinmaslik.",
          "Yuklanadigan rasm va matnlarga huquqi bo'lishi.",
        ],
      },
      {
        title: "Ijrochining huquq va majburiyatlari",
        items: [
          "Platformaning uzluksiz ishlashi uchun oqilona choralar ko'radi va ma'lumotlarni maxfiylik siyosatiga muvofiq himoya qiladi.",
          "Texnik ishlar uchun Platformani qisqa vaqtga to'xtatishi, ilovani yangilashi va eskirgan versiyalarni o'chirishi mumkin.",
          "Shartlar buzilsa, hisob yoki tashkilotni ogohlantirib yoki ogohlantirmasdan to'xtatishi mumkin.",
        ],
      },
      {
        title: "Javobgarlik",
        items: [
          "Platforma «boricha» taqdim etiladi. Ijrochi foydalanuvchilar o'rtasidagi bitimlar, tovar, yetkazish va qarzlar natijasida yetgan zarar uchun javob bermaydi.",
          "Ijrochi internet, aloqa operatori, SMS va to'lov tizimlari, Apple va Google kabi uchinchi shaxslar nosozligi uchun javob bermaydi.",
          "Ijrochining javobgarligi har qanday holatda tashkilot oxirgi 3 oyda to'lagan obuna summasidan oshmaydi.",
          "Yengib bo'lmaydigan kuch (fors-major) holatlarida taraflar javobgarlikdan ozod bo'ladi.",
        ],
      },
      {
        title: "Shaxsiy ma'lumotlar",
        items: ["Foydalanuvchilar ma'lumotlari Platformaning maxfiylik siyosatiga muvofiq ishlanadi."],
        link: { href: "/maxfiylik", label: "Maxfiylik siyosati" },
      },
      {
        title: "Amal qilish muddati va bekor qilish",
        items: [
          "Oferta qabul qilingan paytdan hisob o'chirilguncha amal qiladi.",
          "Foydalanuvchi istalgan vaqtda hisobini ilovada yoki hisobni o'chirish sahifasida o'chirishi mumkin.",
        ],
      },
      {
        title: "Nizolarni hal qilish",
        items: [
          "Nizolar avval muzokara yo'li bilan hal qilinadi; murojaatga javob muddati 10 ish kuni. Kelishilmasa, nizo O'zbekiston Respublikasi qonunchiligiga muvofiq sudda ko'riladi.",
        ],
      },
      {
        title: "Ofertaning o'zgarishi",
        items: [
          "Ijrochi ofertani o'zgartirishi mumkin. Yangi tahriri shu sahifada e'lon qilingan kundan kuchga kiradi; Platformadan foydalanishni davom ettirish yangi tahrirni qabul qilish hisoblanadi.",
        ],
      },
    ] satisfies Section[],
  };
}

export default async function OfferPage({ searchParams }: Props) {
  const lang: Lang = (await searchParams).lang === "ru" ? "ru" : "uz";
  const price = await monthlyPrice();
  const company = process.env.COMPANY_NAME;
  const x = text(lang, {
    company: company ?? (lang === "ru" ? "владельцем платформы Captar" : "Captar platformasi egasi"),
    price: `${formatAmount(price)} ${lang === "ru" ? "сум" : "so'm"}`,
    trial: TRIAL_MONTHS,
    grace: GRACE_DAYS,
    months: MONTH_OPTIONS.join(", "),
  });
  const requisites = [
    [x.labels.name, company],
    [x.labels.inn, process.env.COMPANY_INN],
    [x.labels.address, process.env.COMPANY_ADDRESS],
    [x.labels.bank, process.env.COMPANY_BANK],
    [x.labels.phone, process.env.SUPPORT_PHONE],
    [x.labels.email, process.env.SUPPORT_EMAIL],
  ].filter((r): r is [string, string] => !!r[1]);

  return (
    <main lang={lang} className="mx-auto grid max-w-2xl gap-6 px-4 py-8 text-ink sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{x.title}</h1>
          <p className="mt-1 text-sm text-ink">{x.subtitle}</p>
          <p className="mt-1 text-sm text-hint">{x.updated}</p>
        </div>
        <Link href={lang === "ru" ? "/oferta" : "/oferta?lang=ru"} className="rounded-full border border-line bg-card px-3 py-1 text-sm font-medium hover:border-accent">
          {x.other}
        </Link>
      </div>

      {x.sections.map((s, i) => (
        <section key={s.title} className="grid gap-2 rounded-xl border border-line bg-card p-5 text-sm leading-6 shadow-card">
          <h2 className="text-base font-semibold">
            {i + 1}. {s.title}
          </h2>
          {s.items.map((item, j) => (
            <p key={item}>
              {i + 1}.{j + 1}. {item}
            </p>
          ))}
          {"link" in s && s.link && (
            <Link href={s.link.href} className="text-accent-ink underline">
              {s.link.label}
            </Link>
          )}
        </section>
      ))}

      {requisites.length > 0 && (
        <section className="grid gap-2 rounded-xl border border-line bg-card p-5 text-sm leading-6 shadow-card">
          <h2 className="text-base font-semibold">{x.requisites}</h2>
          <dl className="grid gap-1 sm:grid-cols-[auto_1fr] sm:gap-x-4">
            {requisites.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-hint">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </main>
  );
}
