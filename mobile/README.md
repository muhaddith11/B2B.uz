# Captar: mobil ilova

Android va iOS uchun bitta ilova (Expo SDK 58, React Native, TypeScript). Kirgan odamning hisobiga qarab uch xil ilova ochiladi:

- **Do'kon egasi**: distribyutor topish, katalog, savat, buyurtmalar, qarzlar va ularni to'lash (Payme, Click, chek bilan o'tkazma)
- **Distribyutor xodimi**: rolga qarab (admin, operator, hisobchi, agent, yetkazuvchi) buyurtmalar, do'konlar, to'lovlar, tovarlar, xodimlar, sozlamalar, tovar egalari
- **Tovar egasi**: tovarlar, distribyutor topish, kelishuvlar, xarid buyurtmalari, savdo statistikasi

Kirish: telefon raqami va SMS kod. Raqamda hisob bo'lmasa, ilova do'kon, distribyutor yoki tovar egasi sifatida ro'yxatdan o'tkazadi. Bitta raqam bir nechta hisobga bog'langan bo'lsa, tanlatadi.

Server: ildizdagi Next.js loyihasi (`/api/shop/*`, `/api/staff/*`, `/api/brand/*`, `/api/auth/*`).

## Lokal ishga tushirish

1. Serverni ishga tushiring (ildiz papkada `npm run dev`).
2. `.env.example` dan `.env.local` yarating va `EXPO_PUBLIC_API_URL` ga server manzilini yozing. Telefonda sinashda `localhost` emas, kompyuterning lokal tarmoqdagi IP manzili kerak (masalan, `http://192.168.1.10:3000`); telefon va kompyuter bitta Wi-Fi'da bo'lsin.
3. Ilovani ishga tushiring:

```bash
npm install
```

```bash
npx expo start
```

Telefonda Expo Go ilovasini o'rnatib, terminaldagi QR kodni skanerlang. Demo raqamlar ildizdagi README'da.

Expo Go'da push bildirishnomalar ishlamaydi (Android, SDK 53 dan beri): ular development build'da ishlaydi. Qolgan hamma narsa Expo Go'da ishlaydi.

## Do'konlarga chiqarish (EAS)

1. Expo hisobi oching va loyihani ulang (push bildirishnomalar uchun ham kerak):

```bash
npx eas-cli@latest init
```

2. `eas.json` da server manzili: `https://b2b-uz.vercel.app` (preview va production). O'z domeningizni ulasangiz, shu yerda ham almashtiring.
3. Sinov uchun Android APK (telefonga to'g'ridan-to'g'ri o'rnatiladi):

```bash
npx eas-cli@latest build --profile preview --platform android
```

4. Google Play va App Store uchun:

```bash
npx eas-cli@latest build --profile production --platform all
```

```bash
npx eas-cli@latest submit --platform all
```

Ilova identifikatori: `uz.captar.app` (`app.json`). Ilova nomi, ikonka va splash `app.json` va `assets/` da.

Push bildirishnomalar haqiqiy telefonlarda ishlashi uchun Firebase (Android) va APNs (iOS) kalitlari kerak: [PUSH_SETUP.md](PUSH_SETUP.md). Android build'ga `google-services.json` kerak (`app.config.ts`), u repoga kirmaydi.

## Yangilanishlar (OTA)

JS, matn, rasm va dizayn o'zgarishlari do'konsiz, EAS Update orqali yetkaziladi: ilova ochilganda (va orqa fondan qaytganda, 30 daqiqada bir) update'ni fonda yuklaydi, keyingi ochilishda ishga tushiradi. Build kanal bilan yig'iladi (`eas.json`: preview -> `preview`, production -> `production`), update ham shu kanalga yuboriladi:

```bash
npx eas-cli@latest update --channel production --environment production --message "Savatdagi xato tuzatildi"
```

- **Native o'zgarish OTA bilan bormaydi.** Yangi native paket, `app.json` plagini yoki ruxsati, Expo SDK yangilanishi bo'lsa, `app.json` dagi `version` ni oshiring (1.1.0 -> 1.2.0) va yangi build qiling. Update faqat aynan shu `version` li build'larga tushadi (`runtimeVersion: appVersion`), shuning uchun eski build'ga mos kelmaydigan kod bormaydi.
- **Server manzili EAS env'da bo'lsin.** `eas.json` dagi build `env` update'ga o'tmaydi: update `--environment` dagi EAS o'zgaruvchilari bilan yig'iladi. Bir marta kiriting (production va preview):

```bash
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_API_URL --value https://b2b-uz.vercel.app --visibility plaintext
```

  U bo'lmasa ham ilova `localhost` ga emas, production serverga ulanadi (`src/lib/api.ts`).
- Ilova 1.0.0 da `expo-updates` yo'q: OTA 1.1.0 build'idan boshlab ishlaydi.

## Majburiy yangilash

Server talab qiladigan eng kichik versiya `/admin` -> Mobil ilova bo'limida. Ilova ochilganda va orqa fondan qaytganda `/api/app/version` ni so'raydi; o'zi eskiroq bo'lsa, yopib bo'lmaydigan "Yangilash" oynasini ko'rsatadi va App Store yoki Google Play sahifasini ochadi (`src/components/update-gate.tsx`). Versiyani faqat yangi build ikkala do'konda chiqqandan keyin oshiring. Internet bo'lmasa ilova to'xtatilmaydi. Bu tekshiruv ham 1.1.0 dan boshlab bor.

## Xatolarni kuzatish (Sentry)

Ilova foydalanuvchi telefonida yiqilsa yoki kutilmagan xato bersa, Sentry'ga yoziladi: qaysi ekran, asl koddagi qator, ilova versiyasi va OTA update. Telefon raqami, ism va IP yuborilmaydi (`src/lib/sentry.ts`). Ulash:

1. [sentry.io](https://sentry.io) da hisob oching (ma'lumot Yevropada saqlansin: EU region) va React Native loyihasi yarating. Loyiha sozlamasida **Security & Privacy -> Prevent Storing of IP Addresses** ni yoqing.
2. EAS'da (production va preview muhitlari) o'zgaruvchilarni yarating: `EXPO_PUBLIC_SENTRY_DSN` (loyiha DSN'i, plaintext), `SENTRY_ORG` va `SENTRY_PROJECT` (plaintext), `SENTRY_AUTH_TOKEN` (Organization Auth Token, secret).
3. Yangi build qiling. Build source map'larni Sentry'ga o'zi yuklaydi (`app.config.ts`). OTA update'dan keyin: `npx sentry-expo-upload-sourcemaps dist` (shu o'zgaruvchilar lokal muhitda ham kerak).

DSN bo'lmasa Sentry o'chiq, token bo'lmasa source map yuklanmaydi; ikkala holda ham build yiqilmaydi. Ulagach, App Store Connect -> App Privacy'da "Crash Data" (Diagnostics, foydalanuvchiga bog'lanmagan, kuzatish uchun emas), Google Play -> Data safety'da "Crash logs" va "Diagnostics" ni belgilang.

## Testlar

- `npm test`: ekranlarning asosiy jarayonlari (Jest + Testing Library, `__tests__/`): SMS kod bilan kirish, savatdan buyurtma (minimal summa, internet uzilsa takroriy buyurtma yozilmasligi), qarzni Payme/Click va chek bilan to'lash, majburiy yangilash oynasi. Server soxta (`__tests__/helpers.tsx`), ekranlar haqiqiy.
- Ildizdagi `npm test`: React Native'ga bog'liq bo'lmagan yordamchilar (`test/`, vitest).

## Buyruqlar

- `npm run typecheck`: TypeScript tekshiruvi
- `npm run lint`: ESLint
- `npm test`: ekran testlari (Jest)
- `npx expo-doctor`: bog'liqliklar va sozlamalarni tekshirish
- `npx expo start --web`: brauzerda tez ko'rish (faqat sinov uchun)

## Tuzilma

| Joy | Nima |
| --- | --- |
| `src/app/_layout.tsx` | Hisob turiga qarab ekranlar (`Stack.Protected`), push |
| `src/app/login.tsx`, `register*.tsx` | SMS kod bilan kirish, ro'yxatdan o'tish (do'kon, distribyutor, tovar egasi) |
| `src/app/(tabs)/*`, `distributor/`, `find.tsx`, `pay/` | Do'kon egasi |
| `src/app/staff/*` | Distribyutor xodimlari (tablar rolga qarab) |
| `src/app/brand/*` | Tovar egasi |
| `src/context/session.tsx` | Kirish (token, hisob turi, rol) va savat |
| `src/context/staff.tsx` | Xodim va uning roli |
| `src/lib/api.ts`, `storage.ts`, `push.ts` | Server bilan aloqa, shifrlangan xotira, push bildirishnomalar |
| `src/components/update-gate.tsx`, `src/lib/version.ts` | Majburiy yangilash oynasi, OTA update'ni fonda yuklash |
| `src/lib/sentry.ts`, `metro.config.js` | Xatolarni kuzatish (Sentry), source map uchun Debug ID |
| `__tests__/` | Ekran testlari (Jest) |
| `src/lib/i18n.ts`, `i18n-ru.ts`, `src/context/language.tsx` | Ikki til: `t("o'zbekcha matn")`, ruschasi lug'atda (yo'q bo'lsa TypeScript xatosi), til tanlash |
| `src/lib/confirm.ts`, `haptics.ts` | Qaytarib bo'lmaydigan amaldan oldin so'rash, teginish javobi |
| `locales/*.json` | Ilova nomi va iOS ruxsat matnlari (kamera, galereya) ikki tilda |
