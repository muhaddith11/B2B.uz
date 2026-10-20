import { db } from "./db";
import { HttpError } from "./session";

// Majburiy yangilash: platforma admini ilovaning eng kichik ishlaydigan versiyasini belgilaydi (/admin).
// Ilova ochilganda /api/app/version dan shuni so'raydi: o'zi eskiroq bo'lsa, ishni to'xtatib "Yangilash" ekranini
// ko'rsatadi. Faqat JS o'zgarishi OTA update bilan keladi; bu esa server yangi ilovani talab qilganda
// (native o'zgarish, eski API'ni o'chirish) kerak. Versiya app.json dagi "version" (1.1.0 kabi)

const MIN_VERSION_KEY = "app.minVersion";
// Hech kim to'xtatilmaydi: birinchi chiqqan versiya
export const DEFAULT_MIN_VERSION = "1.0.0";

export const STORE_URLS = {
  ios: "https://apps.apple.com/app/id6824516767",
  android: "https://play.google.com/store/apps/details?id=uz.captar.app",
};

const VERSION_RE = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;

export function isVersion(v: string): boolean {
  return VERSION_RE.test(v);
}

export async function minAppVersion(): Promise<string> {
  const row = await db.platformSetting.findUnique({ where: { key: MIN_VERSION_KEY } });
  return row && isVersion(row.value) ? row.value : DEFAULT_MIN_VERSION;
}

export async function setMinAppVersion(version: string, actor: string) {
  if (!isVersion(version)) throw new HttpError(400, "Versiya 1.2.3 ko'rinishida bo'lsin");
  const before = await minAppVersion();
  await db.$transaction([
    db.platformSetting.upsert({ where: { key: MIN_VERSION_KEY }, create: { key: MIN_VERSION_KEY, value: version }, update: { value: version } }),
    db.auditLog.create({ data: { actor, action: "app.minVersion", entity: "PlatformSetting", entityId: MIN_VERSION_KEY, before: { version: before }, after: { version } } }),
  ]);
}
