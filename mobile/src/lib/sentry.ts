import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';

// Xatolarni kuzatish: ilova foydalanuvchi telefonida yiqilsa yoki kutilmagan xato bersa, Sentry'ga yoziladi
// (qaysi ekran, qaysi qator, qaysi versiya va OTA update). Faqat do'konga chiqadigan build'da va
// EXPO_PUBLIC_SENTRY_DSN berilgan bo'lsa ishlaydi (EAS env, README "Xatolarni kuzatish").
// Shaxsiy ma'lumot (telefon, IP) yuborilmaydi: sendDefaultPii o'chiq

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const sentryEnabled = !!dsn && !__DEV__;

if (sentryEnabled) {
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    // preview (sinov APK) va production xatolari Sentry'da alohida ko'rinadi
    environment: Updates.channel || 'production',
  });
  // Xato qaysi OTA update'da bo'lganini ko'rsatadi: build'ga kirgan kodmi yoki keyin kelgan update
  const scope = Sentry.getGlobalScope();
  scope.setTag('expo-update-id', Updates.updateId ?? 'embedded');
  scope.setTag('expo-is-embedded-update', Updates.isEmbeddedLaunch);
  scope.setTag('expo-runtime-version', Updates.runtimeVersion ?? 'unknown');
}

export const wrap = Sentry.wrap;
