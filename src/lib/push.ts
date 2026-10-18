import type { PushOwner, StaffRole } from "@prisma/client";
import { runAfterResponse } from "./background";
import { db } from "./db";
import { isLang, render, type Text } from "./i18n";
import { reportError } from "./monitoring";
import type { AccountRef } from "./session";

// Mobil ilovaga push bildirishnoma: Expo push xizmati orqali. Token bo'lmasa, hech narsa yuborilmaydi.
// Xabar yuborish asosiy amalni to'xtatmasligi kerak: xato logga yoziladi, xolos.
// Matn har qurilmaga o'sha qurilmada tanlangan tilda boradi (o'zbek yoki rus).

type Message = { title: Text; body: Text; data?: Record<string, string> };
type Device = { token: string; lang: string };

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

async function send(devices: Device[], msg: Message) {
  if (devices.length === 0) return;
  const all = devices.map((d) => {
    const lang = isLang(d.lang) ? d.lang : "uz";
    return { to: d.token, sound: "default", title: render(msg.title, lang), body: render(msg.body, lang), data: msg.data ?? {} };
  });
  // Expo bir so'rovda 100 tagacha xabar qabul qiladi
  for (let i = 0; i < all.length; i += 100) {
    const batch = all.slice(i, i + 100);
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        ...(process.env.EXPO_ACCESS_TOKEN ? { authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) throw new Error(`Expo push: ${res.status}`);
    const json = (await res.json().catch(() => ({}))) as { data?: { status: string; details?: { error?: string } }[] };
    // Ilova o'chirilgan qurilmalar tokenini tozalash
    const dead = (json.data ?? [])
      .map((r, idx) => (r.status === "error" && r.details?.error === "DeviceNotRegistered" ? batch[idx].to : null))
      .filter((t): t is string => t !== null);
    if (dead.length) await db.pushToken.deleteMany({ where: { token: { in: dead } } });
  }
}

async function tokensFor(ownerKind: PushOwner, ownerIds: string[]): Promise<Device[]> {
  if (ownerIds.length === 0) return [];
  return db.pushToken.findMany({ where: { ownerKind, ownerId: { in: ownerIds } }, select: { token: true, lang: true } });
}

// Javob qaytgandan keyin yuboriladi (background.ts): bildirishnoma kechiksa yoki ketmasa ham asosiy amal bajarilgan bo'ladi
function fire(task: () => Promise<void>) {
  runAfterResponse(task, (e) => reportError(e, { area: "push" }, "warning"));
}

export function notifyShop(shopId: string, msg: Message) {
  fire(async () => {
    const users = await db.shopUser.findMany({ where: { shopId }, select: { id: true } });
    await send(await tokensFor("SHOP_USER", users.map((u) => u.id)), msg);
  });
}

export function notifyStaff(distributorId: string, roles: StaffRole[], msg: Message, extraStaffIds: string[] = []) {
  fire(async () => {
    const staff = await db.staff.findMany({
      where: { distributorId, active: true, OR: [{ role: { in: roles } }, { id: { in: extraStaffIds } }] },
      select: { id: true },
    });
    await send(await tokensFor("STAFF", staff.map((s) => s.id)), msg);
  });
}

export function notifyBrand(brandId: string, msg: Message) {
  fire(async () => {
    const users = await db.brandUser.findMany({ where: { brandId }, select: { id: true } });
    await send(await tokensFor("BRAND_USER", users.map((u) => u.id)), msg);
  });
}

const OWNER_KIND: Record<AccountRef["kind"], PushOwner> = { shop: "SHOP_USER", staff: "STAFF", brand: "BRAND_USER" };

export async function registerPushToken(token: string, account: AccountRef, lang: string = "uz") {
  const ownerKind = OWNER_KIND[account.kind];
  // Bitta qurilmada boshqa hisob bilan kirilsa, token yangi egaga o'tadi; til o'zgarsa yangilanadi
  await db.pushToken.upsert({ where: { token }, create: { token, ownerKind, ownerId: account.id, lang }, update: { ownerKind, ownerId: account.id, lang } });
}

// Hisobdan chiqishda: shu qurilmaga (token berilsa) yoki hisobning barcha qurilmalariga bildirishnoma boshqa bormaydi.
// Faqat shu hisobga yozilgan token o'chiriladi: boshqa hisobniki tegilmaydi
export async function removePushTokens(account: AccountRef, token?: string) {
  await db.pushToken.deleteMany({ where: { ownerKind: OWNER_KIND[account.kind], ownerId: account.id, ...(token ? { token } : {}) } });
}
