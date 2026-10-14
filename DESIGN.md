---
name: Captar
description: Distribyutor, do'kon va tovar egasi uchun bitta B2B savdo ilovasi (Expo, iOS va Android, bitta Captar uslubi)
colors:
  bg: "#F4F5F7"
  card: "#FFFFFF"
  field: "#F1F3F6"
  text: "#0F172A"
  hint: "#586579"
  border: "#E3E7ED"
  accent: "#1A64D6"
  accent-text: "#FFFFFF"
  accent-ink: "#1A64D6"
  accent-soft: "#E8F0FD"
  danger: "#C4261A"
  danger-soft: "#FDECEA"
  ok: "#0E7A51"
  ok-soft: "#E5F5EE"
  warn: "#B54708"
  warn-soft: "#FEF2E4"
  info: "#6941C6"
  info-soft: "#F1ECFB"
  dark-bg: "#0D1117"
  dark-card: "#161B22"
  dark-field: "#1F252E"
  dark-text: "#E6EAF0"
  dark-hint: "#94A0B2"
  dark-border: "#262D38"
  dark-accent: "#2F6FDB"
  dark-accent-ink: "#6FA5FA"
  dark-accent-soft: "#16263F"
  dark-danger: "#F97066"
  dark-danger-soft: "#3A1C1A"
  dark-ok: "#3CCB8B"
  dark-ok-soft: "#12291F"
  dark-warn: "#F5A54A"
  dark-warn-soft: "#33240F"
  dark-info: "#A48AFB"
  dark-info-soft: "#241D3B"
typography:
  display:
    fontFamily: "System (SF Pro / Roboto)"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: "36px"
  title:
    fontFamily: "System (SF Pro / Roboto)"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: "28px"
  h2:
    fontFamily: "System (SF Pro / Roboto)"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: "24px"
  body:
    fontFamily: "System (SF Pro / Roboto)"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "22px"
  small:
    fontFamily: "System (SF Pro / Roboto)"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  tiny:
    fontFamily: "System (SF Pro / Roboto)"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
  numeric:
    fontFamily: "System (SF Pro / Roboto)"
    fontFeature: "tnum"
  tab-label:
    fontFamily: "System (SF Pro / Roboto)"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: "12px"
rounded:
  sm: "10px"
  md: "14px"
  lg: "18px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  touch: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-text}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "52px"
  button-primary-compact:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-text}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "52px"
  button-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "52px"
  button-ghost:
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "52px"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.lg}"
    padding: "16px"
  field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "14px"
    height: "52px"
  search-input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "44px"
  chip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "36px"
  chip-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-text}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "36px"
  badge:
    backgroundColor: "{colors.field}"
    textColor: "{colors.hint}"
    typography: "{typography.tiny}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  qty-add:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-text}"
    rounded: "{rounded.pill}"
    size: "44px"
  qty-stepper:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.pill}"
    height: "44px"
  cart-bar:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-text}"
    rounded: "{rounded.lg}"
    padding: "0 18px"
    height: "56px"
  banner:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    rounded: "{rounded.md}"
    padding: "12px"
  list-row-icon:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.sm}"
    size: "40px"
  tab-bar:
    backgroundColor: "{colors.card}"
    textColor: "{colors.hint}"
    typography: "{typography.tab-label}"
    height: "56px"
---

# Design System: Captar

## Overview

**Creative North Star: "Ishonchli kassa" (The Trusted Till)**

Captar foydalanuvchilari har kuni ishlatadigan to'lov va yetkazish ilovalaridek (Click, Payme, Yandex Go / Lavka) ko'rinadi va ishlaydi: yorug' kulrang fon, oq yumaloq yuzalar, bitta ishonchli ko'k va har doim ekrandagi eng og'ir element bo'lgan aniq summa. Bu ataylab tanlangan soha kanoni: do'konchi, agent va operator yangi uslubni o'rganmaydi, tanish narsani ko'radi. Sifat o'lchovi shu ilovalarning puxtaligi.

Ekran zich, lekin bo'g'iq emas: 16 pt chekka, 12 pt oraliq, har bir bosiladigan narsa kamida 44-48 pt. Ierarxiya rang bilan emas, og'irlik bilan quriladi: summa qalin va katta, ikkinchi darajali matn `hint` rangida, holat esa faqat o'zining yumshoq belgisida. Yorug' sxema asosiy (do'kon kunduzi, agent ko'chada); qorong'i sxema to'liq ikkinchi palitra, faqat ranglarni almashtirmaydi, chuqurlikni soya o'rniga chegara bilan beradi.

Rad etilgan: avvalgi qora, har ekranda bir xil kulrang qutilar uyumi, unda pul, holat va amal bir xil og'irlikda turardi.

**Key Characteristics:**
- Bitta ko'k (`accent`) faqat asosiy amal, tanlov va savat uchun.
- Qat'iy holat lug'ati: har holat bitta so'z va bitta ohang.
- Tizim shrifti, summalarda jadval raqamlari, "so'm" summadan kichikroq.
- Yumaloq yuzalar (10 / 14 / 18 pt, chiplar va qadam tugmasi to'liq yumaloq).
- Ionicons outline, bitta qalinlik.
- iOS va Android uchun bitta uslub; OS kafolatlari (safe area, orqaga, tizim shrift o'lchami) saqlanadi.

**Ma'lum bo'shliqlar (tizim qoidasi emas).** Quyidagilar hali qurilmagan va kelajakdagi ekranlar meros qilib oladigan qoida emas: haptik javob, yig'iladigan katta sarlavhalar, Android ripple, skeleton yuklanish (hozir `ActivityIndicator`), yopishqoq qidiruv va chiplar, holat bosqichlarida vaqt belgilari. Faqat qurilmada tekshiriladigan narsalar ochiq: orqaga chevroni, SF / Roboto metrikasi, 130% shrift o'lchami, safe area, sakrash vaqti (sharhdagi suratlar react-native-web, 375x812).

## Colors

Neytral kulrang-oq asos, bitta to'yingan ko'k va to'rtta faqat holat uchun ishlatiladigan ohang; har bir ohangning yumshoq foni bor (`softOf()`).

### Primary
- **Captar ko'ki** (`accent`): asosiy tugma, faol chip, "+" tugmasi, suzuvchi savat tugmasi, tab bar faol belgisi, fokusdagi maydon chegarasi, tanlangan tovar kartochkasining chegarasi, yangilash indikatori. Qorong'ida `dark-accent`.
- **Ko'k matn** (`accent-ink`): havola, ikkinchi darajali tugma matni, qadam tugmasi raqami. Yorug'da `accent` bilan bir xil; qorong'ida o'qilishi uchun ochroq `dark-accent-ink`.
- **Ko'k yumshoq** (`accent-soft`): ikkinchi darajali tugma foni, qadam tugmasi foni, rasm o'rni, ro'yxat belgisi foni, "Yuborildi" belgisi.

### Secondary
- **Binafsha** (`info`, `info-soft`): faqat "Qabul qilindi" holati va info banner.

### Tertiary
- **Holat ohanglari**: `warn` / `warn-soft` (sariq-amber: "Yo'lda", kutilayotgan so'rov, ogohlantirish), `ok` / `ok-soft` (yashil: "Topshirildi", muvaffaqiyat), `danger` / `danger-soft` (qizil: "Rad etildi", muddati o'tgan qarz, xato, xavfli amal).

### Neutral
- **Ekran foni** (`bg`): har bir ekran va tab sarlavhasi foni.
- **Oq yuza** (`card`): kartochka, tab bar, pastki amal paneli, qidiruv maydoni, faol bo'lmagan chip.
- **Maydon foni** (`field`): kiritish maydoni, IconButton bosilgandagi fon, `hint` belgisi foni, bo'sh holat doirasi.
- **Asosiy matn** (`text`): sarlavha, nom, summa.
- **Ikkinchi darajali matn** (`hint`): manzil, sana, yorliq, faol bo'lmagan tab.
- **Chegara** (`border`): ajratgich, chip chegarasi, tovar kartochkasi chegarasi, qorong'ida kartochka chegarasi.

### Named Rules
**The One Blue Rule.** Ko'k faqat amal va tanlov uchun: asosiy tugma, faol chip, "+" va savat. Bezak, sarlavha yoki fon dog'i sifatida ko'k ishlatilmaydi.

**The Status Vocabulary Rule.** Holat ohangi `ORDER_TONE` dan olinadi va boshqa joyda boshqa ma'noda ishlatilmaydi: `SENT` ko'k, `ACCEPTED` binafsha, `IN_DELIVERY` amber, `DELIVERED` yashil, `REJECTED` qizil, `CANCELLED` kulrang. Har holat bitta so'z.

**The Soft Ground Rule.** Holat ohangi hech qachon to'liq fon bo'lmaydi: belgi, banner va xavfli tugma o'z ohangining `*-soft` fonida ohang rangidagi matn bilan chiqadi. To'liq to'yingan fon faqat `accent` (va `Count` qizil soni) uchun.

**The Paired Scheme Rule.** Har bir yangi rang ikkala palitraga bir vaqtda qo'shiladi (`light` va `dark` bir xil kalitlar bilan); komponent rangni faqat `usePalette()` orqali oladi.

## Typography

**Display Font:** tizim shrifti (iOS: SF Pro, Android: Roboto); `fontFamily` berilmaydi.
**Body Font:** o'sha tizim shrifti.

**Character:** Tanish, neytral tizim shrifti; xarakter shriftdan emas, og'irlik farqi va jadval raqamlaridan keladi. Shrift o'lchami tizim sozlamasiga ergashadi.

### Hierarchy
- **Display** (700, 30/36): faqat kirish ekranidagi "Captar" nomi.
- **Title** (700, 22/28): bosh sahifadagi do'kon yoki xodim nomi, asosiy summa (umumiy qarz, buyurtma jami, bugungi tushum); tab sarlavhalari ham 22/700.
- **H2** (600, 17/24): bo'lim sarlavhasi (`SectionTitle`), buyurtma raqami, kartochka ichidagi asosiy qator.
- **Body** (400, 16/22; `bold` bilan 600): nomlar, tugma matni (600), maydon matni.
- **Small** (400, 14/20): ikkinchi darajali ma'lumot, `Row` yorliq-qiymat, banner (500), maydon yorlig'i (500).
- **Tiny** (500, 12/16): holat belgisi (600), holat bosqichi nomi, katalogdagi "Yashikda 12 dona", "/ dona".
- **Tab label** (600, 10/12): pastki tab bar.

### Named Rules
**The Heaviest Sum Rule.** Summa ko'rsatilgan har bir joyda u `Money` orqali chiziladi va o'z qatoridagi eng og'ir element bo'ladi: raqam qalin, " so'm" bir pog'ona kichik va 500 og'irlikda.

**The Tabular Rule.** Summa, miqdor, sana, buyurtma raqami va son belgilari `num` (tabular-nums) bilan chiziladi, ustunlar bir chiziqda turadi.

**The Unbreakable Sum Rule.** Summalar `formatAmount` / `formatSom` orqali formatlanadi: uch xonali guruhlar va "so'm" oldidagi bo'sh joy uzilmaydigan U+00A0, manfiy belgi U+2212. Summa va "so'm" hech qachon ikki qatorga bo'linmaydi.

## Layout

Bitta ustunli scroll ekran (`Screen`): 16 pt chekka, bloklar orasida 12 pt (zich ro'yxatlarda 8 pt), pastda 32 pt. Sarlavhasiz bosh sahifalar yuqoridan `insets.top + 8` oladi (`safeTop`). Oraliqlar 4 pt qadamda: 2, 4, 6, 8, 10, 12, 16.

- **Katalog:** ikki ustunli to'r, ustunlar orasi 12 pt, kartochka kengligi 50% gacha.
- **Agentning buyurtma olishi:** bir ustunli ixcham ro'yxat (tik turib tez kiritish uchun), hisoblagich har qatorda bir joyda.
- **Suzuvchi savat:** chap, o'ng va pastdan 16 pt; ostidagi ro'yxat pastdan 128 pt joy qoldiradi.
- **Pastki amal paneli:** buyurtma sahifasi, savat va yangi buyurtmada ekran tagiga yopishgan oq panel, ustida 1 pt chegara, ichida 16 pt; asosiy va xavfli tugma yonma-yon.
- **Tegish maydoni:** `TOUCH` = 48 pt (ro'yxat qatori, tugmalar 52 pt, qadam tugmasi va IconButton 44 pt + hitSlop).

**The Thumb Reach Rule.** Ekranning asosiy amali (savat, "Qabul qilish", "Yuborish") pastda, bosh barmoq yetadigan joyda turadi; tepada faqat sarlavha va holat.

## Elevation & Depth

Gibrid: yorug' sxemada oq kartochkalar `bg` kulrang fonidan juda yumshoq soya bilan ko'tariladi; qorong'i sxemada soya yo'q, kartochka 1 pt `dark-border` chegarasi bilan ajraladi. Sarlavhalarda soya o'chirilgan (`headerShadowVisible: false`). Ko'tarilgan soyani faqat suzuvchi savat tugmasi oladi.

### Shadow Vocabulary
- **Kartochka (faqat yorug')** (`shadowColor #0F172A, opacity 0.06, radius 12, offset 0/4, Android elevation 2`): `Card` va `PressCard`.
- **Suzuvchi savat** (`shadowColor = accent, opacity 0.3, radius 14, offset 0/6, Android elevation 6`): faqat `CartBar`.

### Named Rules
**The Border-in-the-Dark Rule.** Qorong'i sxemada chuqurlik faqat chegara va `card`/`bg` tonal farqi bilan beriladi; soya qo'shilmaydi.

**The One Float Rule.** Ekranda faqat bitta suzuvchi, rangli soyali element bo'ladi: savat tugmasi.

## Shapes

Yumaloq, do'stona, lekin ko'pikli emas. Uchta radius va bitta to'liq yumaloq:
- `sm` (10 pt): ro'yxat belgisi kvadrati.
- `md` (14 pt): tugma, maydon, qidiruv, banner, rasm, distribyutor bosh harfi kvadrati, agentning tovar qatori, to'lov turi plitkasi.
- `lg` (18 pt): kartochka, tovar kartochkasi, savat tugmasi.
- `pill`: chip, holat belgisi, qadam tugmasi, "+" doirasi, son belgisi.

Holat bosqichlari 6 pt balandlikdagi, 3 pt radiusli chiziqlar. Chegaralar 1 pt (qorong'idagi kartochka, chip, qidiruv, pastki panel ustidagi chiziq) yoki 1.5 pt (maydon fokusi va tanlanadigan yuzalar: tovar kartochkasi, agentning tovar qatori, to'lov turi plitkasi; dam olishda `border`, tanlanganda `accent`).

## Components

### Buttons
Ishonchli, keng, bosh barmoq uchun.
- **Shape:** `md` (14 pt), balandligi 52 pt (ixcham: 40 pt), ichki 18 pt (ixcham: 14 pt), belgi va matn orasi 8 pt, matn 16/600 (ixcham: 14).
- **Primary:** `accent` fon, oq matn. Ekranda bitta.
- **Secondary:** `accent-soft` fon, `accent-ink` matn (masalan, "To'lash", "Buyurtma olish", "Yangi distribyutor topish").
- **Danger:** `danger-soft` fon, `danger` matn ("Rad etish", "Bekor qilish").
- **Ghost:** shaffof, `accent-ink` matn.
- **States:** bosilganda opacity 0.82; o'chiq yoki yuklanayotganda 0.45 va matn o'rnida ActivityIndicator. Ikki tanlovli almashinuvda (Naqd / O'tkazma) tanlangani primary, ikkinchisi secondary.
- **IconButton:** 44 pt doira, 22 pt belgi, bosilganda `field` fon; har doim `accessibilityLabel`.

### Chips
- **Style:** `pill`, 36 pt balandlik, 14 pt ichki, 14/500 matn; faol emas: `card` fon, 1 pt `border`; faol: `accent` fon va chegara, oq matn. Ixtiyoriy son tabular, `hint` rangida.
- **State:** gorizontal scrollda 8 pt oraliq bilan (toifa va holat filtrlari, `Segmented`). Bosilganda opacity 0.85.

### Cards / Containers
- **Corner Style:** `lg` (18 pt).
- **Background:** `card`.
- **Shadow Strategy:** yorug'da kartochka soyasi, qorong'ida 1 pt chegara (Elevation & Depth).
- **Internal Padding:** 16 pt; ichki oraliq 6-12 pt.
- **Tovar kartochkasi (katalog):** `card` fon, `lg` radius, ichki 10 pt, 1.5 pt chegara (`border`, savatda bo'lsa `accent`), soya yo'q; nom 14/600 ikki qator, "Yashikda 12 dona" tiny `hint`, narx `Money` body + "/ dona", ostida "Yashik: ..." tabular tiny; omborda yo'q bo'lsa opacity 0.6. Agentning ixcham qatori shu tanlov tilini `md` radius bilan oladi.
- **To'lov turi plitkasi:** savatda Naqd / O'tkazma / Nasiya, 64 pt, `md`, 1.5 pt chegara; tanlangani `accent-soft` fon, `accent` chegara va `accent-ink` belgi-matn; mumkin bo'lmagani opacity 0.45.
- **PressCard:** bosilganda opacity 0.85 va scale 0.99. `OrderCard`: raqam (h2) va holat belgisi bir qatorda, do'kon nomi va manzil, pastda sana · to'lov · manba va summa; yangi buyurtmada ixcham "Qabul qilish". `ShopCard`: nom, manzil, o'ngda qarz (muddati o'tgan bo'lsa `danger`), ostida belgilar.

### Inputs / Fields
- **Style:** `field` fon, `md` radius, 52 pt balandlik, 14 pt ichki, 16 pt matn; yorliq tepada 14/500 `hint`.
- **Focus:** 1.5 pt `accent` chegara (dam olishda chegara shaffof), kursor `accent`.
- **Error:** 1.5 pt `danger` chegara va ostida 14 pt `danger` matn.
- **SearchInput:** `card` fon, 1 pt `border`, 44 pt, chapda 18 pt qidiruv belgisi, matn bo'lsa tozalash belgisi.

### Navigation
- **Stack sarlavhasi:** soyasiz, sarlavha 600; orqaga tugmasi yonida "Orqaga".
- **Tab sarlavhasi:** chapga tekislangan, 22/700, `bg` fonda.
- **Tab bar:** `card` fon, ustida `border` chizig'i, balandligi 56 + pastki safe area; Ionicons outline 22 pt; faol `accent`, faol emas `hint`; yorliq 10/600; savat soni `accent` fondagi 11 pt belgi.
- Navigatsiya mavzusi (`primary`, `background`, `card`, `text`, `border`, `notification`) Captar palitrasidan olinadi.

### Status Badge va Status Steps
- **Badge:** `pill`, 3/10 pt ichki, `softOf(tone)` fon, ohang rangidagi 12/16/600 matn.
- **StatusSteps:** buyurtma yo'li to'rt teng chiziq (Yuborildi, Qabul qilindi, Yo'lda, Topshirildi), 4 pt oraliq; o'tilgan bosqichlar joriy holat ohangida, qolgani `border`; joriy nom 700 va ohang rangida. Rad etilgan yoki bekor qilingan buyurtmada chiziq o'rniga belgi. Buyurtma sahifasida doim bir joyda, summa ostida.

### Banner
`md` radius, 12 pt ichki, `softOf(tone)` fon, 20 pt Ionicons (ohangga qarab alert / checkmark / information) va 14/500 ohang matni. Xato holati ham shu banner (`ErrorText`).

### QtyStepper (imzo komponenti)
Yashik soni. Nolda: 44 pt `accent` doira, oq 26 pt "+". Bosilganda o'z joyida `accent-soft` pill hisoblagichga aylanadi: "−" (bitta qolganda axlat qutisi belgisi), qalin tabular `accent-ink` "2 yashik", "+". Katalogda kartochka kengligini to'ldiradi va kartochka chegarasi 1.5 pt `accent` bo'ladi. Qiymat o'zgarganda yengil sakrash: 90 ms da 1.06 gacha, keyin prujina (damping 12, stiffness 220); birinchi chizishda sakramaydi, harakat kamaytirilganda Reanimated o'chiradi.

### CartBar
Suzuvchi `accent` tugma, `lg` radius, 56 pt, chapda savat belgisi va "Savat · 3 yashik" (16/600) ostida izoh (12, tabular), o'ngda jami (17/700, tabular). Yorliq o'zgarganda QtyStepper bilan bir xil sakrash.

### ListRow, Row, Empty
- **ListRow:** 48 pt, chapda 40 pt `sm` kvadrat (`softOf(tone)` fon, 20 pt belgi), nom 16/500, ostida 14 `hint`, o'ngda qiymat va chevron.
- **Row:** chapda `hint` yorliq, o'ngda 14/500 tabular qiymat (buyurtma tafsilotlari).
- **Empty:** 56 pt `field` doirada 26 pt `hint` belgi, ostida markazlangan 14 pt `hint` matn (eng ko'p 280 pt), ixtiyoriy amal.

## Do's and Don'ts

### Do:
- **Do** har bir rangni `usePalette()` dan oling va yangi kalitni `light` hamda `dark` ga birga qo'shing.
- **Do** summani `Money` bilan chizing: qalin tabular raqam, kichikroq " so'm", formatlash `formatAmount` / `formatSom` (U+00A0) orqali.
- **Do** buyurtma holatini `StatusBadge` / `StatusSteps` va `ORDER_TONE` bilan ko'rsating; yangi holat qo'shilsa, unga lug'atdan bitta ohang va bitta so'z bering.
- **Do** ekranning asosiy amalini pastga qo'ying: suzuvchi `CartBar` yoki chegarali oq pastki panel, ichida bitta primary tugma.
- **Do** tegish maydonini kamida 44 pt, ro'yxat qatorlarini 48 pt (`TOUCH`) qiling va har bir belgi-tugmaga `accessibilityLabel` bering.
- **Do** belgilar uchun faqat Ionicons outline ishlating (tugmada 18-20 pt, tab va IconButton'da 22 pt).
- **Do** tovar rasmi bo'lmasa katalog kartochkasida rasm o'rnini umuman chizmang; rasm bo'lsa 1.25:1 nisbatda `md` radius bilan chiqaring.

### Don't:
- **Don't** ko'kni bezak, fon dog'i yoki sarlavha rangi sifatida ishlating; u faqat amal va tanlov uchun.
- **Don't** holat ohanglarini (amber, binafsha, yashil, qizil) holatdan boshqa ma'noda ishlating yoki ularni to'liq to'yingan fon qiling.
- **Don't** qorong'i sxemada kartochkaga soya bering; chegara ishlating.
- **Don't** summani `hint` rangida yoki yupqa og'irlikda, yoki atrofdagi matndan kichikroq qilib ko'rsating.
- **Don't** maxsus shrift oilasi qo'shing yoki shrift o'lchamini tizim sozlamasidan uzib qo'ying.
- **Don't** iOS va Android uchun alohida vizual til yarating; farq faqat OS kafolatlarida (safe area, orqaga imo-ishorasi, tizim shrift o'lchami).
