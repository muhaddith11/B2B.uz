# Savdo platformasi

Distribyutor, do'kon va tovar egalari uchun B2B savdo platformasi: buyurtma, nasiya, to'lov, distribyutor topish va hamkorlik kelishuvlari.

Uch qism:

| Qism | Kim uchun | Qayerda |
| --- | --- | --- |
| Mobil ilova (Android, iOS) | Do'kon egasi, distribyutor xodimlari, tovar egasi | `mobile/` |
| Server va web | API, distribyutor paneli (Excel prays-list), platforma admini | shu papka (Next.js) |
| Telegram Mini App | Do'kon (ixtiyoriy, eski kirish yo'li) | `src/app/app` |

## Kim nima qila oladi

**Do'kon egasi** (mobil ilova)
- SMS kod bilan kiradi, agentsiz o'zi ro'yxatdan o'tadi
- Hududi, toifa, tovar yoki brend bo'yicha distribyutor topadi va ulanish so'rovini yuboradi
- Bir nechta distribyutordan bitta savatda buyurtma beradi: naqd, o'tkazma yoki nasiya (limit tekshiriladi)
- Qarzini ilovadan to'laydi: Payme yoki Click orqali onlayn, yoki karta/hisobga o'tkazib chek rasmini yuboradi
- Buyurtmalar holatini kuzatadi, qabul qilinmaganini bekor qiladi, oldingi buyurtmani takrorlaydi

**Distribyutor xodimlari** (mobil ilova, rolga qarab)
- Admin: hammasi, shu jumladan nasiya shartlari, xodimlar, to'lov usullari (karta, hisob, Payme, Click), kompaniya sozlamalari, tovar egalari bilan kelishuv
- Operator: buyurtmalarni qabul qilish, rad etish, yetkazuvchiga biriktirib yo'lga chiqarish, tovar va narxlar
- Hisobchi: chek bilan kelgan to'lovlarni tasdiqlash yoki rad etish
- Agent: yangi do'kon qo'shish, do'kon nomidan buyurtma olish (darhol qabul qilingan bo'ladi), naqd pul qabul qilish
- Yetkazuvchi: yo'ldagi buyurtmalar, qisman topshirish, naqd olish

**Tovar egasi** (ishlab chiqaruvchi, mobil ilova)
- Tovarlarini distribyutorlarga narx bilan taklif qiladi
- Distribyutorni hudud va qamrov bo'yicha topib, hamkorlik taklif qiladi (yoki taklifni qabul qiladi): hudud, chegirma, shartlar
- Kelishuv faol bo'lsa, distribyutor tovarni katalogiga qo'shadi va xarid buyurtmasi beradi; tovar egasi qabul qilib jo'natadi
- Tovarlari qaysi distribyutor orqali qancha sotilganini ko'radi

**Web**
- `/panel`: distribyutor paneli. Excel (.xlsx) prays-list yuklash (avval farqni ko'rsatadi), buyurtmalar, ulanish so'rovlari
- `/admin`: platforma admini. Yangi distribyutor va tovar egalarini tekshirib tasdiqlaydi

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

## Vercel

Server Vercel'da: `muhaddith11-7435s-projects/b2b-uz` loyihasi, GitHub `main` branchiga har push avtomatik deploy qilinadi. Baza: Vercel Neon (Frankfurt), migratsiyalar har deployda qo'llanadi (`vercel-build`). Cheklar bazada saqlanadi (Blob ombori ulansa, avtomatik Blob'ga o'tadi).

Vercel → b2b-uz → Settings → Environment Variables bo'limida o'zingiz kiritadigan o'zgaruvchilar (keyin Redeploy):

| O'zgaruvchi | Nima |
| --- | --- |
| `TEXTUP_EMAIL`, `TEXTUP_PASSWORD` | TextUP kabinetiga kirish login va paroli (SMS kod shu orqali boradi). Kiritilmaguncha hech kim kira olmaydi |
| `TEXTUP_NICKNAME_ID` | Ixtiyoriy: TextUP'dagi alfa-nom (jo'natuvchi nomi) ID'si. Bo'lmasa qisqa raqamdan yuboriladi |
| `TEXTUP_TEMPLATE_ID` | Ixtiyoriy: TextUP talab qilsa, tasdiqlangan shablon ID'si |
| `PLATFORM_ADMIN_PHONES` | `/admin` sahifasiga kiradigan raqamlar (vergul bilan), masalan `+998901234567` |

`SESSION_SECRET`, `PUBLIC_URL` va baza o'zgaruvchilari allaqachon kiritilgan.

## Ishga chiqarish uchun kerak

Kod tayyor; quyidagilar sizning hisoblaringiz va qarorlaringiz:

1. **Server va domen.** Server Vercel'da (yuqoriga qarang). O'z domeningizni ulasangiz (Vercel → Domains), `PUBLIC_URL` ni ham o'zgartiring. Boshqa serverda: `.env` da `DEV_AUTH` ni o'chiring, `PUBLIC_URL` va `PLATFORM_ADMIN_PHONES` ni yozing, cheklar `UPLOAD_DIR` papkasida saqlanadi.
2. **SMS: TextUP hisobi.** `TEXTUP_EMAIL`, `TEXTUP_PASSWORD` (yuqoridagi jadval). Matn: `Savdo ilovasiga kirish kodi: …`; TextUP shablon talab qilsa, uni kabinetda tasdiqlatib `TEXTUP_TEMPLATE_ID` ga yozing. Zaxira sifatida Eskiz.uz ham ishlaydi (`ESKIZ_EMAIL`, `ESKIZ_PASSWORD`).
3. **Payme va Click.** Har bir distribyutor o'z kassasini ochadi va ilovada (Ko'proq → To'lov usullari) kassa ID va kalitni kiritadi. Ilova ko'rsatgan manzilni Payme/Click kabinetiga yozadi. Payme hisob maydoni: `order_id`. Ishga tushirishdan oldin Payme sinov kassasi (`PAYME_TEST=1`) va Click sinov muhitida tekshiring.
4. **Mobil ilova do'konlarga.** Expo hisobi, `npx eas-cli@latest init` (push bildirishnomalar ham shundan keyin ishlaydi), Google Play va App Store dasturchi hisoblari. Batafsil: [mobile/README.md](mobile/README.md).

## Tuzilma

| Joy | Nima |
| --- | --- |
| `prisma/schema.prisma` | Ma'lumotlar modeli |
| `prisma/seed.ts` | Demo ma'lumotlar |
| `src/lib/ledger.ts` | Qarz daftari: qoldiq, eng eski qarzdan yopish, muddat, nasiya tekshiruvi |
| `src/lib/orders.ts` | Buyurtma: yaratish (do'kon yoki agent), holatlar, qisman topshirish |
| `src/lib/links.ts` | Distribyutor topish, ulanish so'rovi |
| `src/lib/payments.ts`, `payme.ts`, `click.ts` | To'lovlar: naqd, chek, Payme Merchant API, Click SHOP API |
| `src/lib/brands.ts` | Tovar egalari: kelishuv, katalogga qo'shish, xarid buyurtmasi, savdo statistikasi |
| `src/lib/otp.ts`, `sms.ts` | SMS kod bilan kirish (TextUP, zaxira Eskiz.uz) |
| `src/lib/push.ts` | Push bildirishnomalar (Expo) |
| `src/lib/price-list*.ts` | Excel prays-list o'qish va qo'llash |
| `src/app/api/shop/*`, `staff/*`, `brand/*` | Mobil ilova API'si (har bir hisob turi uchun) |
| `src/app/api/payments/*` | Payme va Click so'rovlari |
| `src/app/panel/*`, `src/app/admin/*` | Distribyutor paneli, platforma admini |
| `mobile/` | Mobil ilova (Expo, React Native) |

## Buyruqlar

- `npm test`: testlar
- `npm run typecheck`: TypeScript tekshiruvi
- `npm run db:studio`: bazani brauzerda ko'rish
- `npm run db:reset`: bazani tozalab, qayta yaratish
