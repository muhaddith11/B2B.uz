import type { Lang } from "@/lib/i18n";

// Distribyutor paneli matnlari: kalit o'zbekcha matnning o'zi, qiymat ruschasi ({...} o'rniga qiymat qo'yiladi).
// Lug'atda yo'q kalit TypeScript xatosi beradi. Server va brauzer komponentlarida bir xil ishlatiladi (til prop bilan beriladi)
export const PANEL_RU = {
  // Umumiy
  Bugun: "Сегодня",
  Buyurtmalar: "Заказы",
  Tovarlar: "Товары",
  "Ulanish so'rovlari": "Запросы на подключение",
  Chiqish: "Выйти",
  "Amalni bajarib bo'lmadi. Qayta urinib ko'ring": "Не удалось выполнить действие. Попробуйте ещё раз",
  "Ruxsat yo'q": "Нет доступа",
  "{n} ta": "{n}",
  "{n} kun": "{n} дн.",
  "Keyingi sahifa →": "Следующая страница →",
  "Birinchi sahifa": "Первая страница",

  // Kirish
  "Distribyutor paneli": "Панель дистрибьютора",
  "Kod olish": "Получить код",
  "{phone} raqami panel xodimiga tegishli bo'lsa, unga SMS kod yuborildi.": "Если номер {phone} принадлежит сотруднику панели, на него отправлен SMS-код.",
  "Sinov rejimi: kod {code}": "Тестовый режим: код {code}",
  "SMS kod": "SMS-код",
  Kirish: "Войти",
  "Sinov rejimi": "Тестовый режим",
  "Qaysi xodim nomidan kirasiz?": "От имени какого сотрудника войти?",
  "Telefon raqami +998 XX XXX XX XX ko'rinishida bo'lsin": "Номер телефона в формате +998 XX XXX XX XX",
  "Kod yuborilmadi": "Код не отправлен",
  "Kod noto'g'ri": "Неверный код",
  "Bu raqam bilan admin, operator yoki hisobchi topilmadi": "Администратор, оператор или бухгалтер с этим номером не найден",

  // Bugun
  "Yangi buyurtmalar": "Новые заказы",
  "Yo'ldagi buyurtmalar": "Заказы в пути",
  "Muddati o'tgan qarzlar": "Просроченные долги",
  "{n} ta do'kon": "{n} магаз.",
  "Bugun tushgan to'lovlar": "Оплаты за сегодня",
  "{n} ta yangi do'kon sizga ulanishni so'rayapti": "{n} новых магазинов просят подключения",
  "Ko'rish →": "Смотреть →",
  "Do'kon": "Магазин",
  Kechikish: "Просрочка",
  Summa: "Сумма",

  // Buyurtmalar
  Yangi: "Новые",
  "Qabul qilingan": "Принятые",
  "Yo'lda": "В пути",
  Topshirilgan: "Доставленные",
  "Rad etilgan": "Отклонённые",
  Naqd: "Наличные",
  "O'tkazma": "Перевод",
  Nasiya: "Рассрочка",
  "Bu holatda buyurtma yo'q.": "Заказов в этом статусе нет.",
  "Agent: {name}": "Агент: {name}",
  "Ilova: {name}": "Приложение: {name}",
  Artikul: "Артикул",
  Tovar: "Товар",
  Miqdor: "Кол-во",
  Narx: "Цена",
  "Rad etish sababi: {reason}": "Причина отказа: {reason}",
  "Qabul qilish": "Принять",
  "Rad etish sababi": "Причина отказа",
  "Rad etish": "Отклонить",
  "Yo'lga chiqarish": "Отправить в путь",
  Topshirildi: "Доставлен",

  // Ulanish so'rovlari
  "Ilovada sizni topib, ulanishni so'ragan do'konlar. Tasdiqlasangiz, katalogingizni ko'rib buyurtma bera oladi.":
    "Магазины, которые нашли вас в приложении и просят подключения. После подтверждения они увидят каталог и смогут заказывать.",
  "So'rovlarni faqat admin tasdiqlaydi yoki rad etadi.": "Запросы подтверждает или отклоняет только администратор.",
  "Yangi so'rov yo'q.": "Новых запросов нет.",
  "hududingizdan tashqarida": "вне вашей зоны доставки",
  "Narx guruhi": "Ценовая группа",
  "Nasiya limiti, so'm (0 = nasiyasiz)": "Лимит рассрочки, сум (0 = без рассрочки)",
  "Nasiya muddati, kun": "Срок рассрочки, дней",
  Tasdiqlash: "Подтвердить",

  // Tovarlar
  Rasm: "Фото",
  Holat: "Статус",
  Toifa: "Категория",
  Yashikda: "В коробке",
  "Narx ({group})": "Цена ({group})",
  asosiy: "основная",
  "{brand} kelishuvi": "по договору с {brand}",
  nofaol: "неактивен",
  bor: "есть",
  tugagan: "нет в наличии",
  "Excel faylni tanlash": "Выбрать файл Excel",
  "Fayl tanlanmagan": "Файл не выбран",
  Tekshirish: "Проверить",
  "Qo'llash": "Применить",
  "Shablonni yuklab olish": "Скачать шаблон",
  "Avval \"Tekshirish\": nima o'zgarishini ko'rasiz. Xato bo'lmasa, \"Qo'llash\" bilan bazaga yoziladi.":
    "Сначала «Проверить»: увидите, что изменится. Если ошибок нет, «Применить» запишет изменения.",
  "O'qilmoqda…": "Читаем…",
  "Qo'llandi: {count} ta tovar yangilandi.": "Применено: обновлено товаров — {count}.",
  "Qo'llandi: {count} ta tovar yangilandi, {off} tasi faylda yo'qligi uchun nofaol qilindi.": "Применено: обновлено товаров — {count}, {off} отключены, так как их нет в файле.",
  "Rasmi olinmagan tovarlar ({n}): tovar yozildi, rasmi o'zgarmadi": "Товары без загруженного фото ({n}): товар записан, фото не изменилось",
  "Xatolar ({n}): tuzatib, qayta yuklang": "Ошибки ({n}): исправьте и загрузите снова",
  "{row}-qator: {message}": "Строка {row}: {message}",
  "Fayldagi tovarlar": "Товаров в файле",
  yangi: "новых",
  "narxi o'zgargan": "цена изменилась",
  "faylda yo'q (nofaol bo'ladi)": "нет в файле (будут отключены)",
  "Eski narx": "Старая цена",
  "Yangi narx": "Новая цена",
  "Yangi: {list}": "Новые: {list}",
  "Nofaol bo'ladi: {list}": "Будут отключены: {list}",
  "Excel faylni tanlang": "Выберите файл Excel",
  "Fayl 10 MB dan katta": "Файл больше 10 МБ",
  "Faylni o'qib bo'lmadi. .xlsx formatidagi Excel fayl yuklang": "Не удалось прочитать файл. Загрузите Excel в формате .xlsx",
  "Rasmlarni ko'plab yuklash": "Загрузить много фото",
  "Fayl nomi tovar artikuli bilan bir xil bo'lsin: masalan, D-001.jpg": "Имя файла должно совпадать с артикулом товара: например, D-001.jpg",
  "Yuklanmoqda: {done} / {total}": "Загрузка: {done} / {total}",
  "Tayyor: {saved} ta rasm qo'yildi": "Готово: загружено фото — {saved}",
  "Tayyor: {saved} ta rasm qo'yildi, {failed} tasi qo'yilmadi": "Готово: загружено фото — {saved}, не загружено — {failed}",
  "Tarmoq xatosi": "Ошибка сети",
  "{name}: rasmni almashtirish": "{name}: заменить фото",
  "{name}: rasm qo'shish": "{name}: добавить фото",
  "Rasmni almashtirish": "Заменить фото",
  "Rasm qo'shish": "Добавить фото",
  "Olib tashlash": "Удалить",
  "Tovar topilmadi": "Товар не найден",
  "Rasmni saqlab bo'lmadi": "Не удалось сохранить фото",
  "Rasmni tanlang": "Выберите фото",
  "\"{sku}\" artikulli tovar topilmadi": "Товар с артикулом «{sku}» не найден",
} as const satisfies Record<string, string>;

export type PanelKey = keyof typeof PANEL_RU;
type Params = Record<string, string | number>;

export function panelText(lang: Lang) {
  return (key: PanelKey, params?: Params): string => {
    const template: string = lang === "ru" ? PANEL_RU[key] : key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (m, name: string) => (params[name] === undefined ? m : String(params[name])));
  };
}
