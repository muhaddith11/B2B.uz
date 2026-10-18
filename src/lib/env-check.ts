// Production sozlamalarini deploydan OLDIN tekshirish (scripts/vercel-build.ts chaqiradi). Xato bo'lsa build to'xtaydi:
// noto'g'ri sozlangan server (masalan, sinov rejimi yoqilgan yoki kalit qisqa) foydalanuvchilarga chiqmaydi.
// Ogohlantirishlar buildni to'xtatmaydi, lekin logda ko'rinadi (ishga chiqishdan oldin hal qilinadigan narsalar).

type Env = Record<string, string | undefined>;
export type EnvReport = { errors: string[]; warnings: string[] };

const secretOk = (v: string | undefined) => Boolean(v && v.length >= 32);

export function checkProductionEnv(env: Env): EnvReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!secretOk(env.SESSION_SECRET)) errors.push("SESSION_SECRET kamida 32 belgili tasodifiy qiymat bo'lishi kerak");
  if (env.SESSION_SECRET_PREVIOUS && !secretOk(env.SESSION_SECRET_PREVIOUS)) errors.push("SESSION_SECRET_PREVIOUS ham kamida 32 belgi bo'lsin (yoki o'chiring)");
  if (env.PAYMENT_KEYS_SECRET && !secretOk(env.PAYMENT_KEYS_SECRET)) errors.push("PAYMENT_KEYS_SECRET kamida 32 belgi bo'lsin");
  // Ikkalasi ham production'da kod darajasida o'chiq (session.ts, sms.ts): bu yerda faqat eslatma
  if (env.DEV_AUTH === "1") warnings.push("DEV_AUTH=1 production'da e'tiborsiz qoldiriladi: o'chirib qo'ying");
  if (env.DEMO_OTP === "1") warnings.push("DEMO_OTP=1 production'da e'tiborsiz qoldiriladi (kod ekranga chiqmaydi): o'chirib qo'ying");
  if (env.PAYME_TEST === "1") warnings.push("PAYME_TEST=1: Payme sinov kassasi ishlatilmoqda");
  if (!env.PUBLIC_URL?.startsWith("https://")) errors.push("PUBLIC_URL https:// bilan boshlanadigan tashqi manzil bo'lishi kerak (Payme/Click qaytish manzili)");
  if (!env.PLATFORM_ADMIN_PHONES) warnings.push("PLATFORM_ADMIN_PHONES bo'sh: /admin ga hech kim kira olmaydi");

  const textup = env.TEXTUP_EMAIL && env.TEXTUP_PASSWORD;
  const eskiz = env.ESKIZ_EMAIL && env.ESKIZ_PASSWORD;
  if (!textup && !eskiz) warnings.push("SMS xizmati sozlanmagan (TEXTUP_EMAIL/TEXTUP_PASSWORD): hech kim kira olmaydi");
  if (!env.PAYMENT_KEYS_SECRET) warnings.push("PAYMENT_KEYS_SECRET yo'q: to'lov kalitlari SESSION_SECRET dan olingan kalit bilan shifrlanmoqda (docs/SECURITY.md)");
  if (!env.BLOB_READ_WRITE_TOKEN) warnings.push("Vercel Blob ulanmagan: cheklar va rasmlar bazada saqlanmoqda (baza hajmi tez to'ladi)");
  if (!env.SENTRY_DSN) warnings.push("SENTRY_DSN yo'q: xatolar faqat Vercel logida");
  if (!env.ALERT_TELEGRAM_BOT_TOKEN || !env.ALERT_TELEGRAM_CHAT_ID) warnings.push("Telegram ogohlantirishi sozlanmagan: to'lov tizimi xatolari haqida darhol xabar kelmaydi");
  if (!env.CRON_SECRET) warnings.push("CRON_SECRET yo'q: kunlik tozalash (eski SMS kodlar, tashlandiq fayllar) ishlamaydi");
  if (!env.SUPPORT_EMAIL && !env.SUPPORT_PHONE) warnings.push("SUPPORT_EMAIL/SUPPORT_PHONE yo'q: maxfiylik siyosatida murojaat manzili ko'rinmaydi (App Store talabi)");
  return { errors, warnings };
}
