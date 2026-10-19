# Arxitektura

Captar: bitta Next.js server (API, sayt, distribyutor paneli, platforma admini) va bitta Expo ilova (do'kon, distribyutor xodimlari, tovar egasi). Baza PostgreSQL (Vercel Neon, Frankfurt).

```
 Mobil ilova (Expo)            Brauzer                    Payme / Click        Vercel Cron
  do'kon, xodim, tovar egasi    panel, admin, sayt, obuna   (to'lov tizimlari)   (kuniga 1 marta)
        │ Bearer token (aud=app)     │ cookie (aud=panel|admin|obuna)   │ JSON-RPC / form   │ CRON_SECRET
        ▼                            ▼                                  ▼                   ▼
 ┌──────────────────────────────────────────────────────────────────────────────────────────────┐
 │ Next.js (Vercel, fra1)                                                                        │
 │  src/app/api/*      route handler: autentifikatsiya (session.ts), zod bilan kirish, handle() │
 │  src/app/panel,admin,obuna  server komponentlar va server amallari                            │
 │  src/lib/*          biznes qoidalari: orders, ledger, payments, payme, click, links, brands,  │
 │                     subscription, otp, uploads, monitoring                                    │
 └──────────────┬──────────────────────────┬───────────────────────────┬────────────────────────┘
                ▼                          ▼                           ▼
        PostgreSQL (Prisma)        Vercel Blob (fayllar)       Tashqi: TextUP/Eskiz (SMS),
        qarz daftari, buyurtma     yo'q bo'lsa bazada           Expo Push, Sentry, Telegram
```

## Qatlamlar

- **Route handler** (`src/app/api/**/route.ts`) ingichka: kim so'rayapti (`requireShopUser`, `requireStaff(roles)`, `requireBrandUser`), kirish ma'lumoti (`readJson` + zod), keyin `src/lib` dagi funksiya. Xato `handle()` ichida: `HttpError` foydalanuvchiga uning tilida, kutilmagani monitoringga (`reportError`) va umumiy matn.
- **Biznes qoidalari** (`src/lib`): bazaga murojaat qiladigan va qilmaydigan (sof) funksiyalar ajratilgan. Sof hisoblar (`ledger.ts`, `price-list.ts`, `subscription.ts`, `time.ts`) unit testda, bazadagilari integratsiya testida.
- **Mobil ilova** (`mobile/src`): Expo Router, har hisob turi o'z bo'limida (`app/(tabs)`, `app/staff`, `app/brand`). Server bilan faqat `lib/api.ts` orqali (vaqt chegarasi, til sarlavhasi, xato matni).

## Asosiy qarorlar

| Qaror | Nima uchun |
| --- | --- |
| Qarz daftari faqat qo'shiladi (`LedgerEntry`), tuzatish ham yozuv (`reversesId`) | Pulda tarix o'chmaydi, har o'zgarish kim va qachon qilgani bilan ko'rinadi |
| Qoldiq yozuvlardan hisoblanadi (alohida "balans" ustuni yo'q) | Ikki joyda saqlangan qiymat bir-biridan ajralib qolmaydi. 20 000 yozuvli daftar 200 ms dan tez hisoblanadi (`ledger.test.ts`); shundan oshsa — davr boshidagi qoldiqni saqlash |
| Bir vaqtdagi so'rovlar: shartli `updateMany`, `FOR UPDATE`, advisory lock, noyob `clientKey` | Ikki marta bosish, tarmoq qayta yuborishi, ikki xodim to'qnashuvi pulni ikki marta yozmaydi (integratsiya testlarida sinalgan) |
| Summalar butun so'mda (`Int`) | So'mda tiyin amalda ishlatilmaydi; bitta buyurtma 2 mlrd so'mdan oshmaydi (`money.ts`) |
| Token: o'zimizning HMAC imzo, `aud` bilan | Bitta kalit, tashqi kutubxonasiz; ilova, panel, admin va obuna tokenlari bir-birining o'rnida ishlamaydi |
| Payme/Click har distribyutorning o'z kassasiga | Platforma do'kon pulini ushlab turmaydi; obuna esa platformaning o'z kassasiga |
| Fayl turi baytlardan aniqlanadi | Mijoz yuborgan `content-type` ga ishonilmaydi (`file-type.ts`) |
| Ro'yxatlar sahifalanadi (kursor yoki offset) | Jim kesilish yo'q: 501-do'kon ham ko'rinadi (`paging.ts`) |
| Monitoring SDK'siz (Sentry envelope API, Telegram) | Edge va node'da bir xil, qo'shimcha og'ir paket yo'q (`monitoring.ts`) |

## Ma'lumotlar modeli (qisqacha)

- `Distributor` —< `Staff` (rol: ADMIN, OPERATOR, ACCOUNTANT, AGENT, COURIER), `Product` —< `Price` (narx guruhi bo'yicha), `PaymentMethod`.
- `Shop` —< `ShopUser` (OWNER, SELLER). `Shop.verifiedAt`: egasi raqamini SMS bilan tasdiqlagan vaqt.
- `ShopLink` (do'kon × distribyutor): holat, narx guruhi, nasiya limiti va muddati. Markaziy jadval: `Order` va `LedgerEntry` unga bog'langan.
- `Brand` —< `BrandProduct`; `Agreement` (tovar egasi × distribyutor) —< `BrandOrder`.
- `OnlinePayment`: Payme/Click to'lovi (qarz yoki obuna), holatlar to'lov tizimi protokoli bo'yicha.
- Xizmat jadvallari: `OtpCode` (kod xeshi, kunlik tozalanadi), `PushToken`, `StoredFile`, `AuditLog`, `PlatformSetting`.

## Fon ishlari

- **Push bildirishnoma**: javobdan keyin (`after()`), xato asosiy amalni to'xtatmaydi.
- **Kunlik tozalash** (`/api/cron/cleanup`, Vercel Cron): bir kundan eski SMS kodlar, hech kimga biriktirilmagan fayllar.

## Sinov

- `npm test`: sof funksiyalar va mobil yordamchilar (baza kerak emas).
- `npm run test:int`: haqiqiy PostgreSQL'da pul oqimlari, poyga holatlari, har rol ruxsatlari, sahifalash.
- `npm run test:coverage`: ikkalasi qamrov bilan; CI chegarasi `vitest.config.mts` da.
