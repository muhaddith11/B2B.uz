# Ishlatish qo'llanmasi (runbook)

Production: Vercel `b2b-uz` loyihasi (fra1), baza Vercel Neon (Frankfurt). Har `main` ga birlashtirish production'ga deploy qiladi.

## 1. Ishga chiqishdan oldin (bir marta)

Production build sozlamalarni tekshiradi va yetishmaganini logda ⚠️ bilan ko'rsatadi (`src/lib/env-check.ts`). Ro'yxat:

| Qadam | Qayerda |
| --- | --- |
| `SESSION_SECRET`, `PAYMENT_KEYS_SECRET`, `CRON_SECRET` (har biri `openssl rand -base64 48`) | Vercel → Settings → Environment Variables (Production) |
| `npm run keys:reencrypt` (production bazasi bilan) | lokal, `.env` da production `DATABASE_URL` va `PAYMENT_KEYS_SECRET` |
| SMS: `TEXTUP_EMAIL`, `TEXTUP_PASSWORD` | Vercel env |
| Vercel Blob ombori: Storage → Create → Blob → loyihaga ulash (`BLOB_READ_WRITE_TOKEN` o'zi qo'shiladi), keyin `npm run files:to-blob` | Vercel |
| Sentry: loyiha yarating (platform: Node), DSN ni `SENTRY_DSN` ga | sentry.io |
| Telegram ogohlantirishi: @BotFather'da bot, guruhga qo'shing, `ALERT_TELEGRAM_BOT_TOKEN` va `ALERT_TELEGRAM_CHAT_ID` | Telegram |
| Uptime: `https://<domen>/api/health` ni har daqiqada tekshirish (UptimeRobot, Better Stack — bepul) | tashqi xizmat |
| `main` himoyasi (CONTRIBUTING.md) | GitHub → Settings → Branches |
| Preview'lar uchun alohida baza: Vercel → Integrations → Neon → "Create a branch for each preview deployment", keyin Preview env'ga `MIGRATE_ON_BUILD=1` | Vercel |
| Vercel tarifi: tijoriy foydalanish uchun Pro | Vercel → Settings → Billing |
| Neon: avtomatik zaxira (point-in-time restore) muddati tarifga bog'liq — kamida 7 kun bo'ladigan tarifni tanlang | Neon console |

## 2. Hodisa yuz berganda

Umumiy tartib: **ta'sirni aniqlash → to'xtatish (rollback) → sababini topish → tuzatish → xulosa (CHANGELOG yoki issue)**.

### Sayt/API ishlamayapti (`/api/health` 503 yoki javob yo'q)

1. Vercel → Deployments: oxirgi deploy qachon? Muammo deploydan keyin boshlangan bo'lsa → oldingi deployni **Promote to Production** (1 daqiqa, kod orqaga qaytadi).
2. `/api/health` → `db: "down"`: Neon console → loyiha holati, ulanishlar soni, hajm chegarasi. Hajm to'lgan bo'lsa — 4-bo'lim.
3. Vercel → Logs: `level":"fatal"` yoki `"error"` bo'yicha filtr; Sentry'da shu vaqt oralig'idagi hodisalar.

### Payme yoki Click to'lovi o'tmayapti

1. Telegram/Sentry'da `area: payme` yoki `area: click` xatosi bormi? Bor bo'lsa — xato matni va `rpcId`/`merchantTransId` bo'yicha `OnlinePayment` yozuvini toping.
2. Xato yo'q, lekin to'lov ilovada ko'rinmayapti: kassa kabinetida (Payme/Click) tranzaksiya holatini tekshiring. Bizda `OnlinePayment.status` (`CREATED`/`PAID`/`CANCELLED`) va `providerState` bilan solishtiring.
3. Distribyutor kassa kalitini kabinetda almashtirgan bo'lsa, ilovada (Ko'proq → To'lov usullari) ham yangilashi kerak — aks holda Payme -32504 (ruxsat yo'q) oladi.
4. Pul yechilgan, lekin qarz daftariga tushmagan bo'lsa: hech narsani qo'lda bazada o'zgartirmang. To'lov tizimi so'rovni qayta yuboradi (Perform/Complete); takroriy so'rov bir marta qo'llanadi. Qayta yubormasa — to'lov tizimi qo'llab-quvvatlashi bilan bog'laning; zarur bo'lsa xodim qarz daftariga tuzatish yozuvi (sababi bilan) qo'shadi.

### Hech kim kira olmayapti (SMS kelmayapti)

1. Logda `area: sms` xatolari: `TextUP login: 404` → email/parol noto'g'ri; `template not found` → SMS matni kabinetdagi shablon bilan bir xil emas (`OTP_SMS_TEXT`).
2. `area: otp`, "soatlik chegara to'ldi" (Telegram'ga keladi): hisobi yo'q raqamlarga ko'p kod so'ralmoqda (hujum yoki reklama oqimi). Mavjud foydalanuvchilar kiraveradi. Haqiqiy talab bo'lsa — `OTP_HOURLY_LIMIT` ni oshiring.
3. Shoshilinch: TextUP ishlamasa, Eskiz.uz zaxirasi (`ESKIZ_EMAIL`, `ESKIZ_PASSWORD`) yoziladi va Redeploy.

### Baza hajmi to'lyapti

1. `/admin` sahifasida hajm ko'rsatkichi (80% dan oshsa ogohlantiradi).
2. Fayllar bazada bo'lsa — Blob ulang va `npm run files:to-blob`.
3. Kunlik tozalash ishlayaptimi: Vercel → Cron Jobs → `/api/cron/cleanup` oxirgi natijasi (`CRON_SECRET` bo'lishi shart).
4. Shundan keyin ham — Neon tarifini oshiring.

### Noto'g'ri migratsiya production'ga chiqdi

1. Kodni oldingi deployga qaytaring (Promote). Migratsiya avtomatik orqaga qaytmaydi.
2. Ma'lumot buzilgan bo'lsa: Neon → Branches → **Restore** (point-in-time) yoki muammodan oldingi vaqtga yangi branch yarating, solishtiring va kerakli jadvallarni ko'chiring. Restore'dan keyingi yozuvlar yo'qolishini unutmang: avval yangi branchga tiklab, tekshirib oling.
3. Tuzatuvchi migratsiyani PR orqali, preview bazasida sinab chiqaring.

### Kalit sizib chiqqan

`docs/SECURITY.md` → "Kalitlarni almashtirish". Distribyutorning Payme/Click kaliti sizgan bo'lsa — kassa kabinetida almashtirib, ilovada yangisini kiritadi.

## 3. Muntazam ishlar

| Qachon | Nima |
| --- | --- |
| Har hafta | Dependabot PR'lari (CI yashil bo'lsa birlashtiring), Sentry'dagi yangi xatolar |
| Har oy | Neon zaxirasidan sinov tiklash (yangi branchga) va ilovani unga ulab ko'rish; `/admin` hajm ko'rsatkichi |
| Har Expo SDK chiqqanda | `cd mobile && npx expo install expo@latest && npx expo install --fix`, keyin to'liq sinov va EAS build |

## 4. Foydali buyruqlar

```bash
npm run keys:reencrypt   # to'lov kalitlarini PAYMENT_KEYS_SECRET ga o'tkazish
npm run files:to-blob    # bazadagi fayllarni Vercel Blob'ga ko'chirish
npm run db:review        # App Store / Play tekshiruvchisi uchun demo hisoblar
npm run test:coverage    # testlar qamrov bilan
```
