# Push bildirishnomalar: Firebase (Android) va APNs (iOS)

Ilova kodi tayyor: telefon Expo push tokenini oladi va serverga yuboradi, server Expo push xizmati orqali xabar jo'natadi. Haqiqiy telefonlarga yetib borishi uchun ikki kalit kerak:

| Platforma | Nima kerak | Qayerga | Yangi build? |
|---|---|---|---|
| Android | `google-services.json` + FCM V1 service account kaliti | ilovaga + EAS | Ha, yangi `.aab` |
| iOS | APNs push kaliti (`.p8`) | faqat EAS (Expo serveri) | Yo'q, build 5 yetadi |

Hech qaysi kalit repoga commit qilinmaydi: repo ochiq. `google-services.json`, `*firebase-adminsdk*.json` va `*.p8` `.gitignore` da.

Hozirgi holat (2026-10-19): hammasi sozlangan. Firebase loyihasi `captar-118ba`, EAS'da `GOOGLE_SERVICES_JSON` va FCM V1 kaliti bor. iOS'da Zyff bilan umumiy APNs kaliti `FHD3M832VA` (Team `CRLRPGPWL2`) ishlatiladi: uni Apple'da **Revoke** qilsangiz, ikkala ilovada ham push to'xtaydi. Birinchi Firebase'li Android build: versionCode 3. Quyidagi qadamlar kalitni almashtirish yoki yangi kompyuterda sozlash uchun.

## 1. Firebase loyihasi (Android)

Buni o'z Google hisobingizda qilasiz.

1. https://console.firebase.google.com → **Create a project** → nomi `Captar` → Google Analytics shart emas (o'chirib qo'ysangiz bo'ladi) → **Create project**. Zyff'ning `zyff-3b6d2` loyihasiga qo'shmang, Captar alohida bo'lsin.
2. Loyiha bosh sahifasida **Add app** → Android belgisi:
   - **Android package name**: `uz.captar.app` (aynan shunday, keyin o'zgartirib bo'lmaydi)
   - **App nickname**: `Captar` (ixtiyoriy)
   - **Debug signing certificate SHA-1**: bo'sh qoldiring, push uchun kerak emas
   - **Register app**
3. **Download google-services.json** → faylni `F:\projects\B2B\mobile\google-services.json` ga qo'ying (nomi aynan shunday). Keyingi oynalardagi Gradle/SDK qadamlarini o'tkazib yuboring (**Next** → **Continue to console**): Expo buni o'zi qiladi.
4. Service account kaliti (FCM V1): chap yuqoridagi tishli g'ildirak → **Project settings** → **Service accounts** → **Generate new private key** → **Generate key**. `captar-...-firebase-adminsdk-....json` yuklanadi. Uni repoga qo'ymang, `Downloads` da qolsin: faqat EAS'ga yuklanadi.
5. Shu sahifadagi **Cloud Messaging** bo'limida **Firebase Cloud Messaging API (V1)** "Enabled" ekanini ko'ring (yangi loyihalarda odatda yoqilgan).

## 2. Android kalitlarini EAS'ga yuklash

### 2.1. google-services.json → EAS

Fayl repoga kirmagani uchun EAS build serveriga `GOOGLE_SERVICES_JSON` fayl o'zgaruvchisi bo'lib boradi (`app.config.ts` shuni o'qiydi). `mobile/` papkasida bir marta:

```bash
npx eas-cli@latest env:set --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility sensitive --environment production --environment preview --environment development --non-interactive
```

Firebase faylini keyin almashtirsangiz, shu buyruqni qayta ishga tushiring.

### 2.2. Service account kaliti → EAS

**A usul, sayt orqali (oson):**

1. https://expo.dev/accounts/muhaddith/projects/captar/credentials
2. **Android** → `uz.captar.app` (ro'yxatda bo'lmasa **Add application identifier** → `uz.captar.app`)
3. **Service credentials** → **FCM V1 service account key** → **Add a service account key**
4. **Upload new key** → 1-bo'limning 4-qadamidagi JSON → **Save**

**B usul, terminal orqali** (`mobile/` papkasida):

```bash
npx eas-cli@latest credentials --platform android
```

`production` → **Google Service Account** → **Manage your Google Service Account Key for Push Notifications (FCM V1)** → **Set up a Google Service Account Key for Push Notifications (FCM V1)** → **Upload a new service account key** → JSON fayl yo'li (masalan `C:\Users\nout.plus\Downloads\captar-...-firebase-adminsdk-....json`).

## 3. iOS: APNs push kaliti

iOS ilovada push ruxsati allaqachon bor (build 5, `aps-environment`). Yetishmayotgani: Expo serveri Apple'ga xabar yuborishi uchun EAS'dagi APNs kaliti. Bu faqat server tomonida, shuning uchun **yangi iOS build kerak emas**: kalit qo'shilgan zahoti build 5 (review'dagi ham) push qabul qila boshlaydi.

Bilish foydali:

- Bitta APNs kaliti jamoadagi (Team `CRLRPGPWL2`) barcha ilovalar uchun ishlaydi. Apple bitta jamoaga ko'pi bilan 2 ta APNs kaliti beradi.
- Agar Zyff uchun yaratilgan kalit shu EAS hisobida (`muhaddith`) bo'lsa, EAS uni ro'yxatda ko'rsatadi va Captar'ga ham tanlash mumkin. Bu sizning qaroringiz: tanlasangiz, yangi kalit kerak emas; xohlamasangiz, yangisini qo'shing.
- Apple ID parolini va 2FA kodini faqat o'zingiz terminalga kiritasiz. Uni hech kimga (Claude'ga ham) bermang.

### A usul: EAS kalitni o'zi yaratadi (Apple ID bilan)

`mobile/` papkasida:

```bash
npx eas-cli@latest credentials --platform ios
```

1. **Which build profile do you want to configure?** → `production`
2. **Do you want to log in to your Apple account?** → **Yes** → Apple ID, parol, 2FA kod
3. **Push Notifications: Manage your Apple Push Notifications Key** → **Set up your project to use Push Notifications**
4. EAS hisobida kalit bo'lsa, **Reuse this Push Key?** yoki **Select the Apple Push Key to use for your project:** chiqadi: mavjudini tanlang yoki **[Add a new push key]**
5. Yangi kalit uchun **Generate a new Apple Push Notifications service key?** → **Yes**

### B usul: kalitni brauzerda yaratib, Apple login'siz yuklash

1. https://developer.apple.com/account/resources/authkeys/list → **Keys** yonidagi **+**
2. **Key Name**: `Captar Push` → **Apple Push Notifications service (APNs)** ni belgilang. Muhit (environment) so'ralsa **Sandbox & Production**, cheklov so'ralsa **Team Scoped (All Topics)** → **Continue** → **Register**
3. **Download** → `AuthKey_XXXXXXXXXX.p8`. Bu fayl faqat **bir marta** yuklanadi, yo'qotmang. **Key ID** ni yozib oling.
4. Terminalda:

```bash
npx eas-cli@latest credentials --platform ios
```

   - `production` → **Do you want to log in to your Apple account?** → **No**
   - **Push Notifications: Manage your Apple Push Notifications Key** → **Add a new push key**
   - **Generate a new Apple Push Notifications service key?** → **No**
   - **Path to P8 file:** → `.p8` yo'li, **Key ID:** → 3-qadamdagi ID, **Apple Team ID:** → `CRLRPGPWL2`
   - "Unable to validate push key, you are not authenticated with Apple" ogohlantirishi normal
   - **Do you want captar to use the new Push Key?** → **Yes**

## 4. Yangi Android build

1–2-bo'limlar tugagach, `mobile/` papkasida:

```bash
npx eas-cli@latest build --platform android --profile production
```

`versionCode` avtomatik oshadi (3). Build xatosiz tugasa, `google-services.json` ilovaga tushgan bo'ladi. `.aab` ni Google Play Console'ga yangi relizda yuklaysiz (2-versiya review'dan o'tgach yangilanish sifatida, yoki avval **Internal testing** ga).

Tez sinash uchun to'g'ridan-to'g'ri o'rnatiladigan APK ham bo'ladi (Play'dan o'rnatilgan Captar bo'lsa, avval o'chiring: imzolari boshqa):

```bash
npx eas-cli@latest build --platform android --profile preview
```

iOS uchun yangi build kerak emas.

## 5. Haqiqiy qurilmada sinash

1. Telefonda ilovani oching, hisobga kiring, bildirishnomaga **ruxsat bering**. Ilova har ochilganda tokenni serverga yozadi (`PushToken` jadvali). Android'da token faqat 4-bo'limdagi yangi build'da paydo bo'ladi.
2. **Haqiqiy hodisa bilan:** ikki hisob kerak. Masalan, do'kon hisobidan buyurtma bering: distribyutor xodimining telefoniga push keladi. Yoki distribyutor ulanish so'rovini tasdiqlasa, do'konga "Ulanish tasdiqlandi" keladi. Ilova yopiq yoki orqa fonda bo'lsin: bildirishnoma ekranning tepasida chiqadi, bosilsa tegishli sahifa ochiladi.
3. **To'g'ridan-to'g'ri sinov:**
   - Tokenni bazadan oling (Neon konsoli → SQL Editor):

     ```sql
     select token, "ownerKind", "updatedAt" from "PushToken" order by "updatedAt" desc limit 5;
     ```

   - https://expo.dev/notifications sahifasiga `ExponentPushToken[...]` ni qo'yib, sarlavha va matn yozib yuboring.
   - Yoki Git Bash'da (PowerShell'dagi `curl` boshqa buyruq):

     ```bash
     curl -H "Content-Type: application/json" -X POST https://exp.host/--/api/v2/push/send -d '{"to":"ExponentPushToken[XXXX]","title":"Sinov","body":"Captar push ishlayapti"}'
     ```

     Javobdagi `id` bilan natijani tekshiring (bir necha soniyadan keyin):

     ```bash
     curl -H "Content-Type: application/json" -X POST https://exp.host/--/api/v2/push/getReceipts -d '{"ids":["TICKET_ID"]}'
     ```

4. Xato bo'lsa, receipt'dagi `details.error`:
   - `InvalidCredentials`: EAS'da kalit yo'q yoki noto'g'ri (iOS: 3-bo'lim, Android: 2.2)
   - `MismatchSenderId`: `google-services.json` va service account boshqa-boshqa Firebase loyihalaridan
   - `DeviceNotRegistered`: ilova o'chirilgan yoki token eskirgan (server bunday tokenni o'zi o'chiradi)
   - Token umuman yo'q: ruxsat berilmagan yoki Android build eski (Firebase'siz)

Expo loyiha sozlamalarida **Enhanced Security for Push Notifications** yoqilsa, serverga `EXPO_ACCESS_TOKEN` (Vercel env) kerak bo'ladi: `src/lib/push.ts` uni o'zi ishlatadi. Odatda o'chiq, tegmasangiz bo'ladi.
