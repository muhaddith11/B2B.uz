# Captar

Distribyutor, do'kon va tovar egalari uchun B2B savdo platformasi: buyurtma, nasiya, to'lov, distribyutor topish va hamkorlik kelishuvlari.

Ikki qism:

| Qism | Kim uchun | Qayerda |
| --- | --- | --- |
| Mobil ilova (Android, iOS) | Do'kon egasi, distribyutor xodimlari, tovar egasi | `mobile/` |
| Server va web | API, sayt, distribyutor paneli (Excel prays-list), platforma admini, obuna to'lovi | shu papka (Next.js) |

Ilova ikki tilda: o'zbek (lotin) va rus. Birinchi ochilishda telefon tili olinadi, keyin profil pastidan almashtiriladi. Server xato matnlari va push bildirishnomalar ham tanlangan tilda boradi (ilova `x-lang` sarlavhasini yuboradi, tarjimalar `src/lib/i18n-ru.ts` va `mobile/src/lib/i18n-ru.ts` da). Sayt, maxfiylik siyosati va hisobni o'chirish sahifasi ikki tilda (`?lang=ru`); distribyutor paneli va admin hozircha o'zbekcha.

## Kim nima qila oladi

**Do'kon egasi** (mobil ilova)
- SMS kod bilan kiradi, agentsiz o'zi ro'yxatdan o'tadi
- Hududi, toifa, tovar yoki brend bo'yicha distribyutor topadi va ulanish so'rovini yuboradi
- Bir nechta distribyutordan bitta savatda buyurtma beradi: naqd, o'tkazma yoki nasiya (limit tekshiriladi)
- Qarzini ilovadan to'laydi: Payme yoki Click orqali onlayn, yoki karta/hisobga o'tkazib chek rasmini yuboradi
- Buyurtmalar holatini (har bosqich vaqti bilan) kuzatadi, qabul qilinmaganini bekor qiladi, oldingi buyurtmani takrorlaydi

**Distribyutor xodimlari** (mobil ilova, rolga qarab)
- Admin: hammasi, shu jumladan nasiya shartlari, xodimlar, to'lov usullari (karta, hisob, Payme, Click), kompaniya sozlamalari, tovar egalari bilan kelishuv
- Operator: buyurtmalarni qabul qilish, rad etish, yetkazuvchiga biriktirib yo'lga chiqarish, tovar, narx va tovar rasmlari (telefon kamerasidan)
- Hisobchi: chek bilan kelgan to'lovlarni tasdiqlash yoki rad etish
- Agent: yangi do'kon qo'shish, do'kon nomidan buyurtma olish (darhol qabul qilingan bo'ladi), naqd pul qabul qilish
- Yetkazuvchi: yo'ldagi buyurtmalar, qisman topshirish, naqd olish

**Tovar egasi** (ishlab chiqaruvchi, mobil ilova)
- Tovarlarini distribyutorlarga narx va rasm bilan taklif qiladi
- Distribyutorni hudud va qamrov bo'yicha topib, hamkorlik taklif qiladi (yoki taklifni qabul qiladi): hudud, chegirma, shartlar
- Kelishuv faol bo'lsa, distribyutor tovarni katalogiga qo'shadi va xarid buyurtmasi beradi; tovar egasi qabul qilib jo'natadi
- Tovarlari qaysi distribyutor orqali qancha sotilganini ko'radi

**Web**
- `/`: sayt (ilova haqida, ikki tilda)
- `/panel`: distribyutor paneli. Excel (.xlsx) prays-list yuklash (avval farqni ko'rsatadi), buyurtmalar, ulanish so'rovlari
- `/admin`: platforma admini. Yangi distribyutor va tovar egalarini tekshirib tasdiqlaydi
- `/obuna`, `/maxfiylik`, `/hisobni-ochirish`: obuna to'lovi, maxfiylik siyosati, ilovasiz hisobni o'chirish (do'konlar talabi)

Har bir muhim hodisada (yangi buyurtma, holat o'zgarishi, to'lov, so'rov, kelishuv) tegishli odamga push bildirishnoma boradi.

## Ishga tushirish (lokal)

Kerak: Node.js 22, PostgreSQL 17 (`localhost:5432`).

```bash
npm install
```

```bash
npx prisma migrate dev
```

```bash
npm run db:seed
```

```bash
npm run dev
```

Mobil ilova: [mobile/README.md](mobile/README.md).

Sozlamalar `.env` faylida (namuna va izohlar: `.env.example`). `DEV_AUTH=1` faqat lokal sinov uchun: SMS yuborilmaydi, kod ilovaning o'zida ko'rinadi.

### Demo hisoblar

Barchasi SMS kod bilan kiradi (sinov rejimida kod ekranda ko'rinadi).

| Kim | Telefon |
| --- | --- |
| Do'konlar (Barakat, Oila market, Mahalla, Yangi do'kon) | `+998 90 000 00 01` … `04` |
| Vodiy Ichimliklari: admin, operator, agent, yetkazuvchi, hisobchi | `+998 91 000 0000` … `0004` |
| Qo'qon Sut Savdo (xuddi shunday tartib) | `+998 91 001 0000` … `0004` |
| Toza Uy (Nafis Kosmetika taklifi kutmoqda) | `+998 91 003 0000` |
| Andijon Savdo (platforma tekshiruvida) | `+998 91 005 0000` |
| Tovar egalari: Bog'dan Sharbatlari, Nafis Kosmetika, Yangi Brend (tekshiruvda) | `+998 97 000 00 01` … `03` |

Sinov uchun Payme kassasi: Vodiy Ichimliklari (`demo-payme-key`), Click: Qo'qon Sut Savdo (`demo-click-key`).

## Obuna

Har bir distribyutor va do'kon (tashkilot) uchun alohida obuna, uning barcha xodimlari bitta obuna bilan ishlaydi. Tovar egalari bepul.

- **Tekin davr:** tashkilot qo'shilgan kundan 12 oy. Keyin oylik to'lov; narx so'mda, `/admin` → Obuna bo'limida o'zgartiriladi (standart 100 000 so'm).
- **To'lov:** saytda, `/obuna` sahifasida. Distribyutor admini yoki do'kon egasi SMS kod bilan kiradi, 1, 3, 6 yoki 12 oy tanlab Payme yoki Click orqali **platformaning o'z kassasiga** to'laydi. Bank o'tkazmasi bilan to'laganlar uchun admin `/admin` dan qo'lda uzaytiradi.
- **Ilovada** faqat holat ko'rinadi (muddat, 14 kun qolganda eslatma). Narx, to'lov tugmasi va saytga havola yo'q: App Store va Google Play ilova ichidagi to'lovni o'z tizimi orqali talab qiladi. App Review uchun izoh: ilova B2B, obuna tashkilotlarga ilovadan tashqarida sotiladi (Apple 3.1.3(c)).
- **To'lanmasa:** 7 kun imtiyoz, keyin "faqat ko'rish": do'kon yangi buyurtma bera olmaydi, distribyutor yangi buyurtma ololmaydi va qabul qila olmaydi. Boshlangan yetkazish, qarz daftari va to'lovlar ishlayveradi.

Platforma kassalari Vercel env'da: `PLATFORM_PAYME_MERCHANT_ID`, `PLATFORM_PAYME_KEY`, `PLATFORM_CLICK_SERVICE_ID`, `PLATFORM_CLICK_MERCHANT_ID`, `PLATFORM_CLICK_SECRET_KEY`. Kabinetga kiritiladigan manzillar `/admin` → Obuna bo'limida ko'rsatiladi.

## Vercel

Server Vercel'da: `muhaddith11-7435s-projects/b2b-uz` loyihasi, GitHub `main` branchiga har push avtomatik deploy qilinadi. Baza: Vercel Neon (Frankfurt), migratsiyalar har deployda qo'llanadi (`vercel-build`). Cheklar bazada saqlanadi (Blob ombori ulansa, avtomatik Blob'ga o'tadi).

Vercel → b2b-uz → Settings → Environment Variables bo'limida o'zingiz kiritadigan o'zgaruvchilar (keyin Redeploy):

| O'zgaruvchi | Nima |
| --- | --- |
| `TEXTUP_EMAIL`, `TEXTUP_PASSWORD` | TextUP kabinetiga kirish login va paroli (SMS kod shu orqali boradi). Kiritilmaguncha hech kim kira olmaydi |
| `TEXTUP_NICKNAME_ID` | Ixtiyoriy: TextUP'dagi alfa-nom (jo'natuvchi nomi) ID'si. Bo'lmasa qisqa raqamdan yuboriladi |
| `TEXTUP_TEMPLATE_ID` | Ixtiyoriy: TextUP talab qilsa, tasdiqlangan shablon ID'si |
| `OTP_SMS_TEXT` | Ixtiyoriy: SMS matni, `{code}` o'rniga kod. TextUP'da tasdiqlangan shablon bilan bir xil bo'lsin |
| `PLATFORM_ADMIN_PHONES` | `/admin` sahifasiga kiradigan raqamlar (vergul bilan), masalan `+998901234567` |
| `SUPPORT_EMAIL`, `SUPPORT_PHONE` | Maxfiylik siyosati sahifasidagi murojaat manzili (App Store va Google Play uchun) |

`SESSION_SECRET`, `PUBLIC_URL` va baza o'zgaruvchilari allaqachon kiritilgan.

## Ishga chiqarish uchun kerak

Kod tayyor; quyidagilar sizning hisoblaringiz va qarorlaringiz:

1. **Server va domen.** Server Vercel'da (yuqoriga qarang). O'z domeningizni ulasangiz (Vercel → Domains), `PUBLIC_URL` ni ham o'zgartiring. Boshqa serverda: `.env` da `DEV_AUTH` ni o'chiring, `PUBLIC_URL` va `PLATFORM_ADMIN_PHONES` ni yozing, cheklar `UPLOAD_DIR` papkasida saqlanadi.
2. **SMS: TextUP hisobi.** `TEXTUP_EMAIL`, `TEXTUP_PASSWORD` (yuqoridagi jadval). TextUP faqat kabinetda tasdiqlangan shablonga mos matnni yuboradi (aks holda `template not found for this message`). Shablon matni: `Captar ilovasi kirish kodi {code}. Kodni hech kimga bermang.` (ilova, panel va admin uchun bitta). Boshqa matn tasdiqlansa, uni `OTP_SMS_TEXT` ga yozing (`{code}` o'rniga kod qo'yiladi). Zaxira sifatida Eskiz.uz ham ishlaydi (`ESKIZ_EMAIL`, `ESKIZ_PASSWORD`).
3. **Payme va Click.** Har bir distribyutor o'z kassasini ochadi va ilovada (Ko'proq → To'lov usullari) kassa ID va kalitni kiritadi. Ilova ko'rsatgan manzilni Payme/Click kabinetiga yozadi. Payme hisob maydoni: `order_id`. Ishga tushirishdan oldin Payme sinov kassasi (`PAYME_TEST=1`) va Click sinov muhitida tekshiring.
4. **Mobil ilova do'konlarga.** Expo hisobi, `npx eas-cli@latest init` (push bildirishnomalar ham shundan keyin ishlaydi), Google Play va App Store dasturchi hisoblari. Batafsil: [mobile/README.md](mobile/README.md).
5. **Tekshiruvchilar uchun demo hisob.** App Store va Google Play tekshiruvchisi ilovaga kirishi kerak, lekin unga SMS bormaydi. Vercel env'ga `REVIEW_PHONE` (masalan, ishlatilmaydigan `+998 99 000 00 00`) va `REVIEW_CODE` (6 raqam) yozing: shu raqamga SMS yuborilmaydi, kod doim `REVIEW_CODE`. Keyingi deployda demo tashkilotlar production bazasida avtomatik yaratiladi (`vercel-build` ichida `prisma/review.ts --if-configured`): do'kon, distribyutor admini va tovar egasi shu raqamga bog'lanadi, boshqa ma'lumotga tegilmaydi. Bu raqamda biror hisob bo'lsa hech narsa o'zgarmaydi. Lokal bazada qo'lda:

```bash
npm run db:review
```

   Raqam va kodni App Store Connect (App Review Information → Sign-in required) va Google Play Console (App access) ga yozing.

## Tuzilma

| Joy | Nima |
| --- | --- |
| `prisma/schema.prisma` | Ma'lumotlar modeli |
| `prisma/seed.ts` | Demo ma'lumotlar |
| `src/lib/ledger.ts` | Qarz daftari: qoldiq, eng eski qarzdan yopish, muddat, nasiya tekshiruvi |
| `src/lib/orders.ts` | Buyurtma: yaratish (do'kon yoki agent), holatlar, qisman topshirish |
| `src/lib/links.ts` | Distribyutor topish, ulanish so'rovi |
| `src/lib/payments.ts`, `payme.ts`, `click.ts` | To'lovlar: naqd, chek, Payme Merchant API, Click SHOP API |
| `src/lib/subscription.ts`, `src/app/obuna/*` | Obuna: tekin davr, holat, cheklov, saytda to'lash, qo'lda uzaytirish |
| `src/lib/brands.ts` | Tovar egalari: kelishuv, katalogga qo'shish, xarid buyurtmasi, savdo statistikasi |
| `src/lib/otp.ts`, `sms.ts` | SMS kod bilan kirish (TextUP, zaxira Eskiz.uz) |
| `src/lib/push.ts` | Push bildirishnomalar (Expo), har qurilmaga o'z tilida |
| `src/lib/i18n.ts`, `i18n-ru.ts` | Server matnlarining ruscha tarjimasi (xatolar, bildirishnomalar) |
| `src/lib/uploads.ts`, `product-image.ts` | Yuklangan fayllar: to'lov cheklari (yopiq) va tovar rasmlari (katalogda ochiq) |
| `prisma/review.ts` | App Store va Google Play tekshiruvchilari uchun demo hisoblar (`npm run db:review`) |
| `src/lib/price-list*.ts` | Excel prays-list o'qish va qo'llash |
| `src/app/api/shop/*`, `staff/*`, `brand/*` | Mobil ilova API'si (har bir hisob turi uchun) |
| `src/app/api/payments/*` | Payme va Click so'rovlari |
| `src/app/panel/*`, `src/app/admin/*` | Distribyutor paneli, platforma admini |
| `src/app/globals.css` | Web ranglari va tugma/maydon uslubi (mobil ilova bilan bir xil, DESIGN.md) |
| `mobile/` | Mobil ilova (Expo, React Native) |

## Buyruqlar

- `npm test`: unit testlar (bazasiz, sof funksiyalar)
- `npm run test:int`: integratsiya testlari (haqiqiy PostgreSQL'da, pastga qarang)
- `npm run typecheck`: TypeScript tekshiruvi
- `npm run lint`: ESLint (ogohlantirish ham xato hisoblanadi)
- `npm run db:studio`: bazani brauzerda ko'rish
- `npm run db:reset`: lokal bazani tozalab, migratsiya va demo ma'lumotlarni qayta yozish

## Testlar va CI

Integratsiya testlari pul oqimlarini (buyurtma, qarz daftari, naqd, chek, Payme, Click), bir vaqtdagi so'rovlarni (ikki marta bosish, ikki xodimning to'qnashuvi), har rolning ruxsatlarini va ro'yxatdan o'tishni haqiqiy bazada tekshiradi. Ular **alohida test bazasida** ishlaydi: `TEST_DATABASE_URL` nomi `_test` bilan tugashi shart, aks holda testlar ishga tushmaydi. Ishchi bazaga tegmaydi va uni tozalamaydi (har test o'z ma'lumotini yaratadi).

Lokal sozlash (bir marta): PostgreSQL'da `savdo_test` bazasini yarating, `.env` ga `TEST_DATABASE_URL` ni yozing (`.env.example` ga qarang) va migratsiyalarni shu bazaga qo'llang:

```bash
DATABASE_URL="$TEST_DATABASE_URL" DATABASE_URL_UNPOOLED="$TEST_DATABASE_URL" npx prisma migrate deploy
```

GitHub Actions (`.github/workflows/ci.yml`) har push va pull request'da: server uchun typecheck, lint, unit va integratsiya testlari (vaqtinchalik PostgreSQL bilan), `npm audit`, `next build`; mobil ilova uchun typecheck va lint. Biror qadam o'tmasa, commit qizil belgi oladi.
