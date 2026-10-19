import type { ConfigContext, ExpoConfig } from 'expo/config';

// Asosiy sozlama app.json da. Bu fayl faqat google-services.json (Firebase, Android push) yo'lini almashtiradi:
// fayl repoga kirmaydi (repo ochiq), shuning uchun EAS build'da u GOOGLE_SERVICES_JSON fayl o'zgaruvchisidan keladi.
// Lokal yig'ishda mobile/google-services.json ishlatiladi (PUSH_SETUP.md)
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  android: { ...config.android, googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? config.android?.googleServicesFile },
});
