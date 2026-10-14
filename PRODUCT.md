# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

Bitta Expo / React Native ilova iOS va Android uchun. Foydalanuvchi qarori (2026-10-13): ikkala platformada **bir xil Captar uslubi**, har bir OS'ga alohida dizayn tili emas. Shu bilan birga har bir OS'ning kafolatlari saqlanadi: safe area, tizim "orqaga" imo-ishorasi va tugmasi, tegish maydoni o'lchamlari, tizim shrift o'lchami (Dynamic Type / sp).

## Users

Uch tomon **teng muhim** (foydalanuvchi qarori), har biri bitta ilovaning o'z qismini ko'radi:

- **Do'kon egasi (do'konchi).** Distribyutorlardan tovar buyurtma qiladi, qarzini (nasiya) kuzatadi va to'laydi, yangi distribyutor topadi.
- **Distribyutor xodimlari**, rolga qarab:
  - Admin: hammasi, shu jumladan nasiya shartlari, xodimlar, to'lov usullari, kompaniya sozlamalari, tovar egalari bilan kelishuv.
  - Operator: buyurtmani qabul qiladi yoki rad etadi, yetkazuvchiga biriktiradi, tovar va narxlarni yuritadi.
  - Hisobchi: chek bilan kelgan to'lovlarni tasdiqlaydi yoki rad etadi.
  - Agent: do'konma-do'kon yurib yangi do'kon qo'shadi, do'kon nomidan buyurtma oladi, naqd pul qabul qiladi.
  - Yetkazuvchi: yo'ldagi buyurtmalar, qisman topshirish, naqd olish.
- **Tovar egasi** (ishlab chiqaruvchi yoki brend): tovarini distribyutorlarga taklif qiladi, hudud va shartlar bo'yicha kelishuv tuzadi, xarid buyurtmalarini qabul qiladi, savdo statistikasini ko'radi.

Foydalanuvchilar **aralash**: har xil telefon (arzon Androiddan zamonaviy iPhone'gacha) va har xil yosh hamda texnik tajriba.

## Product Purpose

Distribyutor, do'kon va tovar egasi o'rtasidagi B2B savdoni bitta ilovaga jamlash (2026-10-12 da foydalanuvchi bergan to'rt maqsad):

1. Distribyutor va do'kon o'rtasidagi savdoni avtomatlashtirish.
2. Do'konchi bitta ilovadan turli distribyutorlardan buyurtma beradi va shu ilovadan to'laydi.
3. Yangi do'kon ochganlarga distribyutor topib berish.
4. Tovar egalari tovarini onlayn taklif qiladi; kelishuv tuzilsa, distribyutor bilan birga savdo qiladi.

## Positioning

Bitta ilovada uch tomon: do'konchi bir savatda bir nechta distribyutordan buyurtma beradi va qarzini shu yerda to'laydi; yangi do'kon hududi, toifa, tovar yoki brend bo'yicha distribyutor topadi; tovar egasi hudud va qamrov bo'yicha distribyutor topib, kelishuv tuzadi. Nasiya limit va muddat bilan ilovaning o'zida yuritiladi.

## Operating Context

- Bozor: O'zbekiston. Pul birligi: so'm.
- Kirish faqat telefon raqami va SMS kod bilan (TextUP). Bitta raqam bir nechta hisobga bog'lanishi mumkin, unda ilova tanlatadi.
- To'lov: naqd, o'tkazma (karta yoki hisobga o'tkazib chek rasmini yuborish), nasiya, Payme va Click orqali onlayn.
- Har bir muhim hodisada (yangi buyurtma, holat o'zgarishi, to'lov, so'rov, kelishuv) tegishli odamga push bildirishnoma boradi.
- Yonidagi yuzalar: sayt (`/`), web distribyutor paneli (`/panel`, Excel prays-list), platforma admini (`/admin`), obuna to'lovi (`/obuna`). Telegram Mini App 2026-10-14 da olib tashlandi (foydalanuvchi qarori): do'konlar faqat mobil ilovadan foydalanadi.

## Capabilities and Constraints

- Stek: Expo SDK 57, Expo Router, TypeScript (`mobile/`); server Next.js (`/api/*`).
- **Tillar: o'zbek (lotin) va rus**, foydalanuvchi tanlaydi (foydalanuvchi qarori, 2026-10-13). Ilova, server xato matnlari, push bildirishnomalar, sayt va maxfiylik siyosati ikki tilda (2026-10-14). Distribyutor paneli va admin hozircha faqat o'zbekcha.
- Do'konlarga chiqish uchun majburiy: maxfiylik siyosati (`/maxfiylik`), ilova ichida va saytda hisobni o'chirish (bajarilgan).
- App Store ko'rib chiqishi uchun demo hisob: `REVIEW_PHONE` / `REVIEW_CODE` va `npm run db:review` tayyor; production'da yaratish va App Store Connect'ga yozish qoldi.
- Ilova identifikatori `uz.captar.app`; EAS loyihasi `@muhaddith/captar`.

## Brand Commitments

- Nom: **Captar** (foydalanuvchi tanlagan). O'zbekcha "kaptar" deb o'qiladi.
- Hozirgi logo vaqtinchalik (ko'k fonda oq "C"): haqiqiy logo keyin dizayner tomonidan chiziladi, majburiy emas.
- **Vizual yo'nalish: sohaning odatiy, tanish ko'rinishi, eng yuqori sifatda** (foydalanuvchi qaror sahifasida ataylab tanlagan, 2026-10-13). O'yinchoq yoki ataylab "g'alati" bezak yo'q.
- **Sifat o'lchovi** (foydalanuvchi tanlagan): Click / Payme (pul, qarz va summalarning aniqligi) va Yandex Go / Lavka (tez buyurtma, holat kuzatuvi). Captar ular bilan yonma-yon turganda kam ko'rinmasligi kerak.
- Yoqmaydigan natijalar (foydalanuvchi aytgan): rasmiy va sovuq (bank yoki davlat xizmati kabi); ortiqcha rang-barang (o'yinchoq kabi).

## Evidence on Hand

- Haqiqiy mijoz, sharh, statistika yoki hamkor logotiplari **yo'q**: ilova hali ishga tushmagan, production bazasi bo'sh. Bularni o'ylab topib bo'lmaydi.
- Lokal demo ma'lumotlar (`prisma/seed.ts`): demo do'konlar, distribyutorlar va tovar egalari, faqat sinov uchun.

## Product Principles

1. **Har bir rol o'z ishini tez qiladi.** Ekran shu odamning keyingi qiladigan ishini birinchi ko'rsatadi; boshqa rollarning tafsilotlari xalaqit bermaydi.
2. **Pul aniq.** Summa, qarz, muddat va to'lov holati hech qachon ikki xil tushunilmaydi.
3. **Hamma uchun tushunarli.** Oddiy so'zlar, ko'rinadigan holatlar, tasodifiy bosib bo'lmaydigan muhim amallar: texnikaga uzoq odam ham adashmaydi.
4. **Ikki til teng.** Har bir matn o'zbek va rus tilida bir xil sifatda bo'ladi.

## Accessibility & Inclusion

Aralash yosh va tajriba: o'qilishi oson matn, tizim shrift o'lchamiga moslashish, yetarli kontrast va katta tegish maydonlari. Maxsus standart belgilanmagan.
