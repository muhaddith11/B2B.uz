# O'zgarishlar tarixi

Format: har reliz uchun nima qo'shildi, o'zgardi va tuzatildi. Mobil ilova versiyasi `mobile/app.json` da.

## 0.2.0 — 2026-10-18

Sifat bo'yicha to'liq tekshiruvdan keyingi tuzatishlar: xavfsizlik, mahsulot qoidalari, kengayish, monitoring, ish jarayoni.

### Xavfsizlik
- Tokenlar joyiga bog'landi (`aud`: ilova, panel, admin, obuna): agent yoki yetkazuvchi ilova tokenini cookie'ga qo'yib panelga kira olmaydi; panelga faqat admin, operator, hisobchi. **Panel va admin bir marta qayta kirishni so'raydi.**
- Kalitlarni almashtirish: `SESSION_SECRET_PREVIOUS` (foydalanuvchilar chiqib ketmaydi), to'lov kalitlari uchun alohida `PAYMENT_KEYS_SECRET` va `npm run keys:reencrypt`.
- `DEMO_OTP` va `DEV_AUTH` Vercel production'da kod darajasida o'chiq; SMS xizmati sozlanmagan production'da kod logga yozilmaydi.
- Yuklangan fayl turi baytlardan aniqlanadi (soxta `content-type` bilan HTML/SVG yuklab bo'lmaydi).
- Click imzosi doimiy vaqtda solishtiriladi; SMS xizmatiga so'rovlarda vaqt chegarasi.
- SMS chegarasi: umumiy soatlik chegara faqat hisobi yo'q raqamlarga — hujumchi uni to'ldirsa ham mavjud foydalanuvchilar kiraveradi; qulflar raqam va IP bo'yicha (butun platforma bitta navbatda kutmaydi).

### Mahsulot
- Agent qo'shgan yangi do'konga egasi ilovaga kirib raqamini tasdiqlamaguncha faqat naqd buyurtma (nasiya, o'tkazma va qarz oshiruvchi tuzatish yopiq). Ilovada agentga sababi ko'rsatiladi. Mavjud do'konlar tasdiqlangan hisoblanadi.
- Bir raqam yangi do'kon yoki distribyutor ochib tekin davrni cho'za olmaydi: keyingi tashkilot birinchisi bilan birga tugaydi (kamida 1 oy).
- Distribyutor paneli ikki tilda (o'zbek / rus), prays-list xatolari ham.
- Mobil ilova: Expo SDK 58 barqaror versiyasi (58.0.14) va mos paketlar; keraksiz shablon fayllari olib tashlandi.
- Android: reklama identifikatori ruxsati (`AD_ID`) kutubxonalar orqali ham kirmaydi — ilova reklama va kuzatuv ishlatmaydi (Play Console: Advertising ID — No).

### Tuzatildi
- Xodimning to'lovlar ekranida 100 dan ortiq tasdiqlangan to'lov bo'lsa, tasdiq kutayotgan cheklar ro'yxatdan tushib qolardi.
- Ro'yxatlar jim kesilardi (100 buyurtma, 500 do'kon, 200 qarz yozuvi): endi sahifalanadi (ilovada "Yana ko'rsatish", panelda "Keyingi sahifa"); do'konlar soni va umumiy qarz butun ro'yxat bo'yicha.
- Vercel Blob keyin ulansa, undan oldin bazaga yozilgan cheklar va rasmlar ko'rinmay qolardi: endi bazadan o'qiladi, `npm run files:to-blob` ko'chiradi.
- Katta qarz daftarida (buyurtmaga bog'langan ko'p naqd to'lov) hisob kvadratik sekinlashardi: chiziqli.

### Ishlatish
- Monitoring: JSON log, Sentry (`SENTRY_DSN`), jiddiy hodisalar Telegram'ga, mobil ilova xatolari serverga, `/api/health`.
- Kunlik tozalash (Vercel Cron): bir kundan eski SMS kodlar, tashlandiq fayllar.
- Build muhitga qarab: production'da sozlamalar tekshiriladi, preview'da migratsiya faqat `MIGRATE_ON_BUILD=1` bilan.
- Sayt shriftlari repoda (`src/app/fonts`): Google Fonts ishlamay qolsa ham build to'xtamaydi.
- CI: migratsiyalar sxemaga mosligi, qamrov chegarasi, Expo paketlari mosligi; Dependabot; PR shabloni, CONTRIBUTING, docs/ (arxitektura, xavfsizlik, runbook).

## 0.1.0 — 2026-10-16

Birinchi versiya: server, distribyutor paneli, platforma admini, mobil ilova (do'kon, distribyutor xodimlari, tovar egasi), Payme/Click, obuna.
