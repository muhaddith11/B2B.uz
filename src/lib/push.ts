import type { PushOwner, StaffRole } from "@prisma/client";
import { after } from "next/server";
import { db } from "./db";
import { isLang, render, type Text } from "./i18n";

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

// Javob qaytgandan keyin yuboriladi. Vercel'da funksiya javobdan keyin to'xtatilishi mumkin, shuning uchun after()
// platformaga bu ish tugashini kutishni aytadi. So'rovdan tashqarida (skript, test) after() ishlamaydi: unda darhol yuboriladi.
function fire(task: () => Promise<void>) {
  const run = () => task().catch((e) => console.error("push:", e));
  try {
    after(run);
  } catch {
    void run();
  }
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

export async function registerPushToken(token: string, ownerKind: PushOwner, ownerId: string, lang: string = "uz") {
  // Bitta qurilmada boshqa hisob bilan kirilsa, token yangi egaga o'tadi; til o'zgarsa yangilanadi
  await db.pushToken.upsert({ where: { token }, create: { token, ownerKind, ownerId, lang }, update: { ownerKind, ownerId, lang } });
}
