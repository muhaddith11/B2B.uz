# Xavfsizlik

## Nimani himoya qilamiz

Do'konlarning qarzi va to'lovlari, distribyutorlarning Payme/Click kalitlari, shaxsiy ma'lumot (ism, telefon, rasm), hisobga kirish.

## Asosiy himoyalar

| Xavf | Himoya | Qayerda |
| --- | --- | --- |
| Begona hisobga kirish | SMS kod: HMAC xesh bilan saqlanadi, 5 daqiqa, 5 urinish (urinish solishtirishdan oldin sanaladi), bir martalik, maqsadga bog'langan (login/admin/delete) | `otp.ts` |
| SMS hisobini bo'shatish | Raqam bo'yicha (daqiqada 1, soatda 5), IP bo'yicha (soatda 20), hisobi yo'q raqamlarga umumiy soatlik chegara. Hujumchi chegarani to'ldirsa ham hisobi bor foydalanuvchilar kiraveradi; chegara to'lsa Telegram'ga xabar | `otp.ts` |
| Token boshqa joyda ishlatilishi | Har token `aud` bilan: `app`, `panel`, `admin`, `obuna`. Panelga faqat ADMIN, OPERATOR, ACCOUNTANT | `token.ts`, `session.ts` |
| O'g'irlangan telefon | "Barcha qurilmalardan chiqish": shu vaqtdan oldingi tokenlar bekor (`sessionsValidAfter`) | `session.ts` |
| Rol chegarasidan chiqish | Har route rollari bilan (`requireStaff(req, roles)`), ma'lumot doirasi `linkScope`/`orderScope` (agent faqat o'z do'konlari) | `staff-data.ts` |
| Do'kon roziligisiz qarz yozish | Tizimdagi do'kon faqat egasi taklifni qabul qilsa ulanadi; agent yaratgan yangi do'konga egasi raqamini tasdiqlamaguncha faqat naqd buyurtma | `staff/shops`, `orders.ts` |
| Pulni ikki marta yozish | Shartli holat o'tishlari, `FOR UPDATE`, noyob `clientKey`/`providerTxnId` | `orders.ts`, `payments.ts`, `payme.ts`, `click.ts` |
| Soxta to'lov xabari | Payme: Basic auth kassaning shifrlangan kaliti bilan; Click: MD5 imzo, doimiy vaqtli solishtirish; har kassa faqat o'z to'lovlarini ko'radi | `payme.ts`, `click.ts` |
| Kassa kalitlarining sizishi | AES-256-GCM, alohida kalit (`PAYMENT_KEYS_SECRET`), API hech qachon kalitni qaytarmaydi | `crypto.ts` |
| Zararli fayl | Turi baytlardan (JPEG, PNG, WEBP, HEIC, PDF), 4 MB, tasodifiy nom, `nosniff`; chekni faqat o'sha do'kon va ruxsatli xodim ko'radi | `uploads.ts`, `file-type.ts`, `api/files` |
| SSRF (prays-listdagi rasm havolasi) | Faqat https:443, yo'naltirish yo'q, ichki tarmoq manzillari ulanish paytida tekshiriladi (DNS rebinding) | `remote-image.ts` |
| Clickjacking, MIME sniffing | `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`, HSTS | `next.config.ts` |
| Sinov rejimi production'da | `DEV_AUTH` va `DEMO_OTP` Vercel production'da kod darajasida o'chiq; SMS xizmati yo'q bo'lsa kod logga yozilmaydi; production build sozlamalarni tekshiradi | `sms.ts`, `session.ts`, `env-check.ts` |
| Logda shaxsiy ma'lumot | Monitoring maxfiy maydonlarni va telefon raqamlarini yashiradi | `monitoring.ts` |

## Kalitlar

| O'zgaruvchi | Nima uchun |
| --- | --- |
| `SESSION_SECRET` | Tokenlarni imzolash, SMS kod xeshi (undan hosil qilingan alohida kalit) |
| `SESSION_SECRET_PREVIOUS` | Faqat almashtirish davrida: eski kalit bilan imzolangan tokenlar muddati tugaguncha ishlaydi |
| `PAYMENT_KEYS_SECRET` | Payme/Click kalitlarini shifrlash |
| `CRON_SECRET` | Kunlik tozalashni faqat Vercel Cron chaqiradi |

Har biri kamida 32 tasodifiy belgi: `openssl rand -base64 48`.

### Kalitlarni almashtirish

**`PAYMENT_KEYS_SECRET` ni birinchi marta yoqish** (bir marta, ishga chiqishdan oldin):

1. Vercel'ga `PAYMENT_KEYS_SECRET` yozing, Redeploy.
2. Production bazasi bilan: `npm run keys:reencrypt` (eski formatdagi kalitlarni yangisiga o'tkazadi, qayta ishga tushirsa zarar qilmaydi).

**`SESSION_SECRET` ni almashtirish** (masalan, sizib chiqqan deb gumon bo'lsa):

1. `PAYMENT_KEYS_SECRET` yoqilgan va `keys:reencrypt` bajarilgan bo'lsin (aks holda kassa kalitlari ochilmay qoladi).
2. Eski qiymatni `SESSION_SECRET_PREVIOUS` ga, yangisini `SESSION_SECRET` ga yozing, Redeploy. Foydalanuvchilar chiqib ketmaydi.
3. 30 kundan keyin (ilova tokenlari muddati) `SESSION_SECRET_PREVIOUS` ni o'chiring. Sizib chiqqan bo'lsa — darhol o'chiring: hamma qayta kiradi.

## Ma'lum cheklovlar

- Tekin davrni cho'zish: bir raqam yangi tashkilot ochsa, tekin davri o'sha raqamning birinchi tashkilotiniki bilan tugaydi (kamida 1 oy). Hisobni o'chirib qayta ochish bu cheklovni chetlab o'tadi: raqam o'chirilgandan keyin saqlanmaydi (maxfiylik siyosati).
- `Order.number` butun platforma bo'yicha ketma-ket: do'kon platformadagi umumiy buyurtmalar sonini taxmin qila oladi.
- SMS kodga brute-force: 6 raqam, 5 urinish, kod 5 daqiqa — bitta kodni topish ehtimoli 1/200 000.

## Zaiflik haqida xabar berish

`SUPPORT_EMAIL` manziliga yozing. Ochiq issue ochmang.
