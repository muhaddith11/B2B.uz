# Captar: mobil ilova

Android va iOS uchun bitta ilova (Expo SDK 57, React Native, TypeScript). Kirgan odamning hisobiga qarab uch xil ilova ochiladi:

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

## Buyruqlar

- `npm run typecheck`: TypeScript tekshiruvi
- `npm run lint`: ESLint
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
| `src/lib/i18n.ts`, `i18n-ru.ts`, `src/context/language.tsx` | Ikki til: `t("o'zbekcha matn")`, ruschasi lug'atda (yo'q bo'lsa TypeScript xatosi), til tanlash |
| `src/lib/confirm.ts`, `haptics.ts` | Qaytarib bo'lmaydigan amaldan oldin so'rash, teginish javobi |
| `locales/*.json` | Ilova nomi va iOS ruxsat matnlari (kamera, galereya) ikki tilda |
