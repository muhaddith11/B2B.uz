import type { Prisma } from "@prisma/client";
import { db } from "./db";
import type { AccountRef } from "./session";
import { releaseImage } from "./uploads";

// Hisobni o'chirish (App Store va Google Play talabi).
// Kishining shaxsiy ma'lumoti (ism, telefon, rasmi, push token) o'chiriladi va u boshqa kira olmaydi.
// Buyurtma, qarz va to'lov yozuvlari distribyutor hisob-kitobi uchun saqlanadi (maxfiylik siyosatida yozilgan).

type Tx = Prisma.TransactionClient;
export type { AccountRef };

// Har biri o'chirilgan odamning avatarini qaytaradi: tranzaksiyadan keyin fayl ombordan ham o'chiriladi
async function deleteShopUser(tx: Tx, id: string) {
  // Buyurtma va xabarlarda kim yuborgani bo'sh qoladi, yozuvning o'zi qoladi
  await tx.order.updateMany({ where: { createdByShopUserId: id }, data: { createdByShopUserId: null } });
  await tx.message.updateMany({ where: { senderShopUserId: id }, data: { senderShopUserId: null } });
  await tx.pushToken.deleteMany({ where: { ownerKind: "SHOP_USER", ownerId: id } });
  return (await tx.shopUser.delete({ where: { id } })).avatarUrl;
}

async function deleteStaff(tx: Tx, id: string) {
  // Xodim buyurtma va yetkazishlar tarixida qoladi, shuning uchun yozuv o'chirilmay, shaxsiy ma'lumoti (rasmi ham) tozalanadi
  const before = await tx.staff.findUniqueOrThrow({ where: { id }, select: { avatarUrl: true } });
  const staff = await tx.staff.update({ where: { id }, data: { name: "O'chirilgan xodim", phone: "", avatarUrl: null, active: false } });
  await tx.pushToken.deleteMany({ where: { ownerKind: "STAFF", ownerId: id } });
  // Faol xodimi qolmagan distribyutor do'konlar qidiruvidan yashiriladi
  const left = await tx.staff.count({ where: { distributorId: staff.distributorId, active: true } });
  if (left === 0) await tx.distributor.update({ where: { id: staff.distributorId }, data: { status: "PENDING" } });
  return before.avatarUrl;
}

async function deleteBrandUser(tx: Tx, id: string) {
  const user = await tx.brandUser.delete({ where: { id } });
  await tx.pushToken.deleteMany({ where: { ownerKind: "BRAND_USER", ownerId: id } });
  // Foydalanuvchisi qolmagan tovar egasi distribyutorlarga ko'rinmaydi
  const left = await tx.brandUser.count({ where: { brandId: user.brandId } });
  if (left === 0) await tx.brand.update({ where: { id: user.brandId }, data: { status: "PENDING" } });
  return user.avatarUrl;
}

async function deleteOne(tx: Tx, ref: AccountRef): Promise<string | null> {
  const avatarUrl = ref.kind === "shop" ? await deleteShopUser(tx, ref.id) : ref.kind === "staff" ? await deleteStaff(tx, ref.id) : await deleteBrandUser(tx, ref.id);
  await tx.auditLog.create({ data: { actor: `${ref.kind}:${ref.id}`, action: "account.delete", entity: ref.kind, entityId: ref.id } });
  return avatarUrl;
}

// Ilovadan: hozir kirgan bitta hisob
export async function deleteAccount(ref: AccountRef): Promise<void> {
  await releaseImage(await db.$transaction((tx) => deleteOne(tx, ref)));
}

// Telefon raqamiga bog'langan hisoblar (saytdagi o'chirish sahifasi uchun)
export async function accountsForPhone(phone: string): Promise<AccountRef[]> {
  const [shop, staff, brand] = await Promise.all([
    db.shopUser.findMany({ where: { phone }, select: { id: true } }),
    db.staff.findMany({ where: { phone, active: true }, select: { id: true } }),
    db.brandUser.findMany({ where: { phone }, select: { id: true } }),
  ]);
  return [
    ...shop.map((u) => ({ kind: "shop" as const, id: u.id })),
    ...staff.map((s) => ({ kind: "staff" as const, id: s.id })),
    ...brand.map((u) => ({ kind: "brand" as const, id: u.id })),
  ];
}

// Raqamdagi barcha hisoblarni o'chiradi; nechta o'chirilganini qaytaradi
export async function deleteAccountsForPhone(phone: string): Promise<number> {
  const refs = await accountsForPhone(phone);
  const avatars = await db.$transaction(async (tx) => {
    const urls: (string | null)[] = [];
    for (const ref of refs) urls.push(await deleteOne(tx, ref));
    await tx.otpCode.deleteMany({ where: { phone } });
    return urls;
  });
  for (const url of avatars) await releaseImage(url);
  return refs.length;
}
