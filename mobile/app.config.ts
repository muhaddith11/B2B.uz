import type { ConfigContext, ExpoConfig } from 'expo/config';

// Asosiy sozlama app.json da. Bu fayl faqat env'ga bog'liq qismlarni qo'shadi:
// - google-services.json (Firebase, Android push) yo'li: fayl repoga kirmaydi (repo ochiq), shuning uchun EAS build'da
//   u GOOGLE_SERVICES_JSON fayl o'zgaruvchisidan keladi. Lokal yig'ishda mobile/google-services.json ishlatiladi (PUSH_SETUP.md)
// - Sentry plagini: build vaqtida source map'larni Sentry'ga yuklaydi (xato joyi asl kodda ko'rinadi). Faqat EAS'da
//   SENTRY_AUTH_TOKEN bo'lsa qo'shiladi: tokensiz yuklash yiqilib, butun build'ni yiqitadi. Tashkilot, loyiha va
//   Sentry manzili (EU hududi: https://de.sentry.io/) SENTRY_ORG, SENTRY_PROJECT, SENTRY_URL dan (README, "Xatolarni kuzatish")
const sentry = {
  url: process.env.SENTRY_URL || 'https://sentry.io/',
  ...(process.env.SENTRY_ORG ? { organization: process.env.SENTRY_ORG } : {}),
  ...(process.env.SENTRY_PROJECT ? { project: process.env.SENTRY_PROJECT } : {}),
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  android: { ...config.android, googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? config.android?.googleServicesFile },
  plugins: [...(config.plugins ?? []), ...(process.env.SENTRY_AUTH_TOKEN ? [['@sentry/react-native/expo', sentry] as [string, typeof sentry]] : [])],
});
