import type { PushOwner, StaffRole } from "@prisma/client";
import { db } from "./db";

// Mobil ilovaga push bildirishnoma: Expo push xizmati orqali. Token bo'lmasa, hech narsa yuborilmaydi.
// Xabar yuborish asosiy amalni to'xtatmasligi kerak: xato logga yoziladi, xolos.

type Message = { title: string; body: string; data?: Record<string, string> };

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

async function send(tokens: string[], msg: Message) {
  if (tokens.length === 0) return;
  // Expo bir so'rovda 100 tagacha xabar qabul qiladi
  for (let i = 0; i < tokens.length; i += 100) {
    const batch = tokens.slice(i, i + 100).map((to) => ({ to, sound: "default", title: msg.title, body: msg.body, data: msg.data ?? {} }));
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

async function tokensFor(ownerKind: PushOwner, ownerIds: string[]) {
  if (ownerIds.length === 0) return [];
  const rows = await db.pushToken.findMany({ where: { ownerKind, ownerId: { in: ownerIds } }, select: { token: true } });
  return rows.map((r) => r.token);
}

function fire(task: () => Promise<void>) {
  task().catch((e) => console.error("push:", e));
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

export async function registerPushToken(token: string, ownerKind: PushOwner, ownerId: string) {
  // Bitta qurilmada boshqa hisob bilan kirilsa, token yangi egaga o'tadi
  await db.pushToken.upsert({ where: { token }, create: { token, ownerKind, ownerId }, update: { ownerKind, ownerId } });
}
