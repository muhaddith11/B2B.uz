---
name: Captar
description: Distribyutor, do'kon va tovar egasi uchun bitta B2B savdo ilovasi (Expo, iOS va Android; "Atlas" dunyosi)
colors:
  ground: "#F6F5FA"
  card: "#FFFFFF"
  field: "#EFEEF6"
  ink: "#17152E"
  hint: "#625F80"
  line: "#E4E2EF"
  indigo: "#23205C"
  indigo-ink: "#3B34A6"
  indigo-soft: "#ECEBF8"
  indigo-2: "#2F2B78"
  shell-hint: "#C9C6EA"
  malina: "#D11F5E"
  malina-soft: "#FCE8F0"
  zafaron: "#F2B705"
  danger: "#C42B1C"
  danger-soft: "#FCEBE9"
  ok: "#1B7F50"
  ok-soft: "#E4F4EC"
  warn: "#A85208"
  warn-soft: "#FDF0E1"
  info: "#6B3FA0"
  info-soft: "#F2ECFA"
  dark-ground: "#0E0D1A"
  dark-card: "#171628"
  dark-field: "#211F36"
  dark-ink: "#ECEBF7"
  dark-hint: "#A29FC2"
  dark-line: "#2A2843"
  dark-indigo: "#4C45C9"
  dark-indigo-ink: "#A9A4FF"
  dark-indigo-soft: "#23214A"
  dark-shell: "#1E1B4F"
  dark-indigo-2: "#2B2770"
  dark-malina: "#FF4F8B"
  dark-malina-soft: "#3A1426"
  dark-zafaron: "#F5C431"
  dark-danger: "#FF6B5E"
  dark-ok: "#3CCB8B"
  dark-warn: "#F5A54A"
  dark-info: "#B596F5"
typography:
  display:
    fontFamily: "Unbounded"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: "42px"
  headline:
    fontFamily: "Unbounded"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "30px"
  title:
    fontFamily: "Unbounded"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "24px"
  amount:
    fontFamily: "Unbounded"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: "20px"
    fontFeature: "tnum"
  body:
    fontFamily: "Golos Text"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "22px"
  small:
    fontFamily: "Golos Text"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  label:
    fontFamily: "Golos Text"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
  tab-label:
    fontFamily: "Golos Text"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: "12px"
rounded:
  sm: "10px"
  md: "14px"
  lg: "18px"
  shell: "28px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  band: "20px"
  touch: "48px"
components:
  button-primary:
    backgroundColor: "{colors.indigo}"
    textColor: "{colors.card}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "52px"
  button-secondary:
    backgroundColor: "{colors.indigo-soft}"
    textColor: "{colors.indigo-ink}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "52px"
  button-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "52px"
  button-on-shell:
    backgroundColor: "{colors.card}"
    textColor: "{colors.indigo-ink}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "52px"
  button-shell:
    backgroundColor: "{colors.indigo-2}"
    textColor: "{colors.card}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "52px"
  chip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "36px"
  chip-selected:
    backgroundColor: "{colors.malina}"
    textColor: "{colors.card}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "36px"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.lg}"
    padding: "16px"
  field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "14px"
    height: "52px"
  shell-band:
    backgroundColor: "{colors.indigo}"
    textColor: "{colors.card}"
    rounded: "{rounded.shell}"
    padding: "12px 20px 22px"
  abr-bar:
    backgroundColor: "{colors.line}"
    rounded: "{rounded.pill}"
    height: "10px"
  abr-bar-on-shell:
    backgroundColor: "{colors.zafaron}"
    rounded: "{rounded.pill}"
    height: "14px"
  status-badge:
    backgroundColor: "{colors.indigo-soft}"
    textColor: "{colors.indigo-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  qty-add:
    backgroundColor: "{colors.indigo}"
    textColor: "{colors.card}"
    rounded: "{rounded.pill}"
    size: "44px"
  cart-bar:
    backgroundColor: "{colors.indigo}"
    textColor: "{colors.card}"
    rounded: "{rounded.lg}"
    padding: "0 18px"
    height: "60px"
  tab-bar:
    backgroundColor: "{colors.card}"
    textColor: "{colors.hint}"
    typography: "{typography.tab-label}"
    height: "62px"
---

# Design System: Captar

## Overview

**Creative North Star: "Abr: bo'yalgan ip" (The Dyed Thread)**

Captar Marg'ilon atlasidan o'zining ko'rinishini oladi, lekin cheklangan bo'yoq bilan. Atlas iplari to'qishdan oldin bo'yaladi va rang chegarasi bulutdek yoyiladi (abr). Ilovada savdoning har bir o'lchovi shunday ip: buyurtma yo'li, nasiya limitidan qancha ishlatilgani, bugungi yetkazish, distribyutorlar bo'yicha savdo. Bosqich o'tgan sari bo'yoq oldinga yoyiladi, cheti pog'onali bo'lib qoladi. Bu ilovaning imzosi. Naqsh ham, mato teksturasi ham, bezak ham yo'q, dunyo faqat rang, shrift va shu ip orqali gapiradi.

Bosh sahifalar (do'kon, distribyutor xodimi, tovar egasi) to'q indigo tasma bilan ochiladi. Tasmada tashkilotning surati yoki logosi, eng muhim summa va za'faron rangli abr ipi turadi. Undan pastdagi hamma narsa ipak-oq yer ustidagi oq kartochkalarda. Ekran zich, lekin bo'g'iq emas: 16 pt chekka, 12 pt oraliq, har bir bosiladigan narsa kamida 44-48 pt. Yorug' sxema asosiy, chunki do'konchi kunduzi peshtaxta orqasida, agent esa ko'chada ishlaydi. Qorong'i sxema to'liq ikkinchi palitra.

Rad etilgan: avvalgi "Ishonchli kassa" kanoni (oq kartochkalar va bitta ko'k tugma), unda Captar to'lov ilovalaridan ajralmasdi; "rasmiy va sovuq" ham, "o'yinchoq kabi rang-barang" ham (PRODUCT.md).

**Key Characteristics:**
- Indigo: asosiy amal va bosh sahifa tasmasi. Malina: faqat "hozirgi" narsa. Za'faron: faqat tasma ustidagi bo'yoq.
- Unbounded faqat sarlavha va summada, to'rt o'lchamda; qolgan matn Golos Text.
- Abr ipi: har o'lchov va bosqichda bir xil, har doim bir joyda.
- Tashkilot rasmi yumaloq kvadrat plitkada, odam rasmi doirada; rasm yo'q bo'lsa bo'yoq plitkasida bosh harf.
- iOS va Android uchun bitta uslub; OS kafolatlari (safe area, orqaga, tizim shrift o'lchami) saqlanadi.

**Ochiq bo'shliqlar (tizim qoidasi emas).** Sharhdagi suratlar react-native-web render'i (390x844); haqiqiy qurilmada (iOS, Android) tekshirilmagan: Unbounded va Golos'ning nativ metrikasi, 130% shrift o'lchami, ripple, abr harakati tezligi. Logo vaqtinchalik (indigo fonda oq "C" va malina abr ipi).

## Colors

To'q indigo ipak va ipak-oq yer; bitta malina "hozirgi" uchun, za'faron faqat tasmada; holat ohanglari faqat holat uchun, har birining yumshoq foni bor.

### Primary
- **To'q indigo ipak** (indigo): asosiy tugma, "+" (savatga qo'shish), suzuvchi savat, son belgisi va bosh sahifa tasmasi; abr ipining o'tilgan bo'laklari. Qorong'ida tugma uchun ochroq dark-indigo, tasma uchun dark-shell.
- **Indigo siyoh** (indigo-ink): havola, ikkinchi darajali tugma matni, qadam tugmasi raqami, maydon fokusi chegarasi, sarlavhadagi orqaga tugmasi.
- **Indigo yumshoq** (indigo-soft): ikkinchi darajali tugma foni, qadam tugmasi foni, "Yuborildi" belgisi, bo'sh holat doirasi.
- **Tasmaning ikkinchi yuzasi** (indigo-2): tasma ustidagi ikkinchi darajali tugma; **tasma matni** (shell-hint): tasmadagi yorliq va izohlar.

### Secondary
- **Malina** (malina, malina-soft): faqat "hozirgi" narsa: buyurtma yo'lidagi joriy bo'lak va uning nomi, faol tab va uning ostidagi abr belgisi, tanlangan chip va tanlangan teg.

### Tertiary
- **Za'faron** (zafaron): faqat indigo tasma ustidagi abr ipining bo'yog'i (nasiya limiti, bugungi yetkazish).
- **Holat ohanglari**: warn (yo'lda, kutilayotgan), ok (topshirildi, muvaffaqiyat), danger (rad, muddati o'tgan, xavfli amal), info (qabul qilindi, info banner).

### Neutral
- **Ipak-oq yer** (ground): har bir ekran va sarlavha foni.
- **Oq yuza** (card): kartochka, tab bar, pastki panel, qidiruv, faol bo'lmagan chip, tasmadagi oq tugma.
- **Maydon foni** (field): kiritish maydoni, kartochka ustidagi abr ipining yo'li, skeleton.
- **Siyoh** (ink) va **ikkinchi darajali matn** (hint), **chegara** (line).

### Named Rules
**The One Current Rule.** Malina faqat hozirgi narsa uchun: joriy bosqich, faol tab, tanlangan. Tugma, sarlavha, bezak yoki holat uchun malina ishlatilmaydi.

**The Saffron Stays On The Band Rule.** Za'faron faqat indigo tasma ustida, abr ipining bo'yog'i sifatida. Oq kartochkada abr ipi indigo (yoki muddati o'tganda danger) bo'yog'ida.

**The Status Vocabulary Rule.** Buyurtma holati `ORDER_TONE` dan: SENT indigo, ACCEPTED info, IN_DELIVERY warn, DELIVERED ok, REJECTED danger, CANCELLED hint. Har holat bitta so'z, holat ohangi faqat yumshoq fon ustida (to'liq to'yingan fon emas).

**The Paired Scheme Rule.** Har bir rang `light` va `dark` palitralarga bir xil kalit bilan birga qo'shiladi; komponent rangni faqat `usePalette()` dan oladi. Web (sayt, panel, admin) shu qiymatlarni `src/app/globals.css` dagi CSS o'zgaruvchilari orqali oladi (`--c-*`, Tailwind'da `bg-accent`, `text-current` va hokazo), Tailwind'ning tayyor `gray-*`, `blue-*` ranglari ishlatilmaydi.

## Typography

**Display Font:** Unbounded (ilova ichida, `@expo-google-fonts/unbounded`; web'da `next/font`)
**Body Font:** Golos Text (ilova ichida, `@expo-google-fonts/golos-text`; web'da `next/font`)

**Character:** Unbounded keng, yumaloq va ishonchli: summa va sarlavhaga Captar ovozini beradi. Golos Text sokin ishchi shrift, lotin (o'zbek) va kirill (rus) yozuvlarini bir xil sifatda o'qitadi. Ikkalasi ham ilova ichiga joylangan, internet kerak emas. Shrift o'lchami tizim sozlamasiga ergashadi.

### Hierarchy
- **Display** (Unbounded 700, 34/42): tasmadagi asosiy summa (umumiy qarz, bugungi to'lov, savdo), kirish ekranidagi "Captar". Sig'masa kichrayadi, ikki qatorga bo'linmaydi.
- **Headline** (Unbounded 600, 24/30): tab sarlavhalari va kartochkadagi katta summa.
- **Title** (Unbounded 600, 18/24): bo'lim sarlavhasi (`SectionTitle`), buyurtma raqami, sahifa ichidagi nom.
- **Amount** (Unbounded 600, 15/20, tabular): ro'yxat va kartochkadagi summa, savat tugmasidagi jami.
- **Body** (Golos 400, 16/22; 600 qalin): nomlar, tugma matni (600), maydon matni. Stack sarlavhasi Golos 600 17.
- **Small** (Golos 400, 14/20): ikkinchi darajali ma'lumot, yorliq (500), banner (500).
- **Label** (Golos 500, 12/16): holat belgisi (600), bosqich nomi, "Yashikda 12 dona"; tab yorlig'i 600 10/12.

### Named Rules
**The Four Steps Rule.** Unbounded faqat to'rt o'lchamda: 34, 24, 18, 15. Oraliq o'lcham yo'q; kichikroq summa Golos 600 da chiziladi.

**The Weight-In-The-Name Rule.** Maxsus shriftda `fontWeight` emas, og'irlik nomli shrift ishlatiladi (`FONT.textSemi` va hokazo). `T` komponenti style'dagi `fontWeight` ni o'zi mos shriftga aylantiradi (Android'da tizim shriftiga qaytib qolmasin).

**The Heaviest Sum Rule.** Summa har doim `Money` orqali va o'z qatoridagi eng og'ir element: raqam Unbounded, " so'm" Golos 500 da kichikroq va 80% shaffoflikda. Formatlash `formatAmount` / `formatSom` (U+00A0, manfiy U+2212); summa va "so'm" ikki qatorga bo'linmaydi.

## Layout

Bitta ustunli scroll ekran (`Screen`): 16 pt chekka, bloklar orasida 12 pt (zich ro'yxatda 8 pt), pastda 32 pt. Bosh sahifalarda `Screen band` tasmani ekran chekkasigacha, tizim paneli ostidan boshlab chizadi (ichki 20 pt, tepada safe area + 12 pt), kontent esa tasmadan 20 pt pastda. Oraliqlar 4 pt qadamda.

- **Katalog:** ikki ustunli to'r, ustunlar orasi 12 pt; tovar rasmi bo'lsa kartochka tepasida 1.25:1, bo'lmasa rasm o'rni chizilmaydi.
- **Agentning buyurtma olishi:** bir ustunli ixcham ro'yxat (tik turib tez kiritish), hisoblagich har qatorda bir joyda.
- **Suzuvchi savat:** chap, o'ng va pastdan 16 pt; ostidagi ro'yxat pastdan 128 pt joy qoldiradi.
- **Pastki amal paneli:** buyurtma sahifasi, savat, yangi buyurtma: ekran tagiga yopishgan oq panel, ustida chiziq, asosiy va xavfli tugma yonma-yon.
- **Tegish maydoni:** `TOUCH` = 48 pt; tugma 52 pt, qadam tugmasi va IconButton 44 pt + hitSlop.

**The Thumb Reach Rule.** Ekranning asosiy amali (savat, "Qabul qilish", "Qarzni to'lash") pastda yoki tasmaning pastida, bosh barmoq yetadigan joyda.

**The Registration Rule.** Abr ipi (buyurtma yo'li) har buyurtma kartochkasi va sahifasida aynan bir joyda, bir xil uzunlikda: kartochkaning pastida, raqam va summa ostida.

## Elevation & Depth

Gibrid: yorug' sxemada oq kartochkalar ipak-oq yerdan juda yumshoq indigo soya bilan ko'tariladi; qorong'ida soya yo'q, kartochka 1 pt chegara bilan ajraladi. Tasma o'zi eng chuqur qatlam (to'q indigo), soyasiz. Sarlavhalarda soya o'chirilgan.

### Shadow Vocabulary
- **Kartochka (faqat yorug')** (`shadowColor #23205C, opacity 0.07, radius 14, offset 0/4, Android elevation 2`): `Card`, `PressCard`.
- **Suzuvchi savat** (`shadowColor = indigo, opacity 0.3, radius 14, offset 0/6, elevation 6`): faqat `CartBar`.

### Named Rules
**The Border-in-the-Dark Rule.** Qorong'ida chuqurlik faqat chegara va tonal farq bilan; soya qo'shilmaydi.

**The One Float Rule.** Ekranda faqat bitta suzuvchi, rangli soyali element: savat tugmasi.

## Shapes

Yumaloq, do'stona, lekin ko'pikli emas: `sm` 10 (ro'yxat belgisi kvadrati), `md` 14 (tugma, maydon, banner, rasm), `lg` 18 (kartochka, savat tugmasi), `shell` 28 (tasmaning pastki burchaklari), `pill` (chip, belgi, qadam tugmasi, abr ipi). Tashkilot rasmi plitkasi tomonining 28% radiusli yumaloq kvadrat; odam rasmi doira. Chegara 1 pt yoki 1.5 pt (maydon fokusi, tanlanadigan yuza); ajratgich `Divider` bitta ingichka qalinlikda.

## Components

### Buttons
Keng, ishonchli, bosh barmoq uchun.
- **Shape:** `md` (14), balandlik 52 (ixcham 40), ichki 18 (ixcham 14), matn Golos 600 16 (ixcham 14), belgi va matn orasi 8.
- **Primary:** indigo fon, oq matn. Ekranda bitta.
- **Secondary:** indigo-soft fon, indigo-ink matn. **Danger:** danger-soft fon, danger matn. **Ghost:** shaffof, indigo-ink.
- **Tasma ustida:** `light` (oq fon, indigo-ink matn) asosiy amal uchun, `shell` (indigo-2 fon, oq matn) ikkinchi darajali.
- **States:** bosilganda opacity 0.82 (Android'da ripple); o'chiq yoki yuklanayotganda 0.45 va matn o'rnida ActivityIndicator.

### Chips
- **Style:** `pill`, 36 pt, ichki 14, Golos 500 14; tanlanmagan: oq fon, 1 pt chegara; tanlangan: malina fon va chegara, oq Golos 600 matn.
- **State:** gorizontal scrollda 8 pt oraliq; tanlashda yengil haptik.

### Cards / Containers
- **Corner Style:** `lg` (18). **Background:** oq. **Shadow Strategy:** Elevation & Depth. **Internal Padding:** 16.
- **Yo'ldagi buyurtma kartochkasi:** chapda distribyutor logosi (44 plitka), nom va "№12 · 6 yashik", o'ngda Amount summa; ostida abr ipi bosqich nomlari va vaqtlari bilan.
- **Tovar kartochkasi (katalog):** ichki 10, 1.5 pt chegara (savatda bo'lsa indigo), nom 14/600 ikki qator, narx Amount + "/ dona", "+" indigo doira.

### Inputs / Fields
- **Style:** field fon, `md`, 52 pt, ichki 14, Golos 16; yorliq tepada Golos 500 14 hint.
- **Focus:** 1.5 pt indigo-ink chegara, kursor indigo-ink. **Error:** 1.5 pt danger chegara va ostida danger matn.
- **SearchInput:** oq fon, 1 pt chegara, 44 pt, chapda qidiruv belgisi.

### Navigation
- **Stack sarlavhasi:** yer rangida, soyasiz; sarlavha Golos 600 17; orqaga tugmasi indigo-ink.
- **Tab sarlavhasi:** chapga tekislangan, Unbounded 600 24.
- **Tab bar:** oq, ustida chegara, 62 + safe area; Ionicons outline 22; faol tab malina, yorlig'i ostida kichik abr belgisi (14 pt ip va 3 pt uchi); faol emas hint.

### Abr ipi (imzo komponenti)
`AbrBar`: ingichka iplardan iborat chiziq (balandlik/2 ip, kamida 3), har ipning bo'yog'i biroz boshqa joyda tugaydi (pog'onali abr cheti); to'liq yoki bo'sh bo'lsa chet tekis. Qiymat o'zgarganda bo'yoq iplar bo'ylab birin-ketin yoyiladi: har ip 35 ms kechikish bilan, 560 ms, eksponensial sekinlashuv; tizimda harakat kamaytirilgan bo'lsa sakrashsiz. Tasmada 14 pt za'faron bo'yoq oq 14% yo'lda; kartochkada 10 pt indigo (yoki danger) bo'yoq field yo'lda. `StatusSteps`: to'rt teng bo'lak (Yuborildi, Qabul qilindi, Yo'lda, Topshirildi), o'tilganlari indigo, joriy bo'lak malina bo'yoq bilan yarim bo'yalgan abr; holat ekran ochiqligida o'zgarsa yangi bo'lak bo'yog'i yoyilib keladi. Rad etilgan yoki bekor qilinganda ip o'rnida holat belgisi.

### Rasmlar (Pic va PicEdit)
- **Pic:** tashkilot (do'kon, distribyutor, tovar egasi) plitkada, odam doirada; rasm bo'lmasa nomidan doim bir xil chiqadigan bo'yoq plitkasi (7 ta atlas bo'yog'i) va oq Golos 700 bosh harf (odamda ikki harf). Tasmada oq halqa bilan.
- **PicEdit:** burchagida indigo kamera belgisi; bosilganda pastki varaq (kamera, galereya, olib tashlash). Avatar va logo 1:1, tovar 5:4 qirqiladi.

### Indigo tasma (ShellBand)
Bosh sahifaning boshi: tashkilot rasmi (52), nomi (Golos 600 17 oq) va izoh (shell-hint), yorliq va Display summa, kerak bo'lsa abr ipi va uning izohi (chapda nima, o'ngda qancha qoldi yoki necha ta), oxirida bitta `light` tugma. Tizim paneli matni oq.

### Yuklanish, xato va tasdiqlash
Skeleton (oq kartochka shakllari 700 ms miltillaydi), `ErrorState` (danger-soft doira, sabab, "Qayta urinish"), tizim tasdiqlash oynasi (savol, oqibat, "Ortga" va amal nomi).

## Do's and Don'ts

### Do:
- **Do** har bir ko'rinadigan matnni `t()` orqali yozing (kalit o'zbekcha matn, ruschasi `i18n-ru.ts` da).
- **Do** qaytarib bo'lmaydigan amaldan oldin `confirm` bilan so'rang.
- **Do** ma'lumot yuklaydigan har bir ekranda `Loading`, `ErrorState` va `Empty` holatlarini bering.
- **Do** har bir rangni `usePalette()` dan oling va yangi kalitni `light` hamda `dark` ga birga qo'shing.
- **Do** summani `Money` bilan, holatni `StatusBadge` / `StatusSteps` va `ORDER_TONE` bilan chizing.
- **Do** o'lchov va bosqichni `AbrBar` bilan ko'rsating, qolgan sig'imni doim raqam bilan yozing ("Qoldi 1 187 400 so'm").
- **Do** tashkilot va odam ko'rinadigan joyda `Pic` ishlating (logo, do'kon surati, avatar).
- **Do** belgilar uchun faqat Ionicons outline ishlating; tegish maydoni kamida 44 pt, ro'yxat qatori 48 pt, belgi-tugmada `accessibilityLabel`.

### Don't:
- **Don't** malinani tugma, sarlavha yoki bezak uchun ishlating; u faqat hozirgi narsa uchun.
- **Don't** za'faronni tasmadan tashqarida ishlating.
- **Don't** Unbounded'ni to'rt o'lchamdan boshqasida yoki uzun matnda (nom, tavsif) ishlating.
- **Don't** atlas naqshi, mato teksturasi yoki gradient qo'shing; dunyo faqat rang, shrift va abr ipi orqali gapiradi.
- **Don't** holat ohanglarini holatdan boshqa ma'noda yoki to'liq to'yingan fon qilib ishlating.
- **Don't** qorong'i sxemada kartochkaga soya bering.
- **Don't** matn glifini ("›", "×", "→") belgi o'rnida ishlating.
- **Don't** iOS va Android uchun alohida vizual til yarating.
