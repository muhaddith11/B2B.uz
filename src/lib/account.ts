import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { HttpError, type AccountRef } from "./session";
import { releaseImage } from "./uploads";

// Hisobni o'chirish (App Store va Google Play talabi).
// Kishining shaxsiy ma'lumoti (ism, telefon, rasmi, push token) o'chiriladi va u boshqa kira olmaydi.
// Buyurtma, qarz va to'lov yozuvlari distribyutor hisob-kitobi uchun saqlanadi (maxfiylik siyosatida yozilgan).

type Tx = Prisma.TransactionClient;
export type { AccountRef };

const lastAdminMsg = "Siz yagona adminsiz: avval jamoadan boshqa xodimni admin qiling, keyin hisobni o'chiring";

// Do'kon foydalanuvchisini o'chirish: o'z hisobini o'chirganda yoki egasi sotuvchini olib tashlaganda.
// Har biri o'chirilgan odamning avatarini qaytaradi: tranzaksiyadan keyin fayl ombordan ham o'chiriladi
export async function removeShopUser(tx: Tx, id: string) {
  // Do'kon jamoasi o'zgarishlari navbat bilan: ega va sotuvchi bir vaqtda o'chsa ham do'kon egasiz qolmaydi
  const { shopId } = await tx.shopUser.findUniqueOrThrow({ where: { id }, select: { shopId: true } });
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`shop-team:${shopId}`}))`;
  // Buyurtmalarda kim yuborgani bo'sh qoladi, yozuvning o'zi qoladi
  await tx.order.updateMany({ where: { createdByShopUserId: id }, data: { createdByShopUserId: null } });
  await tx.pushToken.deleteMany({ where: { ownerKind: "SHOP_USER", ownerId: id } });
  const user = await tx.shopUser.delete({ where: { id } });
  const left = await tx.shopUser.findMany({ where: { shopId }, orderBy: { createdAt: "asc" }, select: { id: true, role: true } });
  // Ega ketdi, sotuvchilar qoldi: eng oldin qo'shilgan sotuvchi ega bo'ladi. Aks holda takliflar, jamoa, do'kon surati va
  // obuna to'lovi (faqat egaga ruxsat) hech kimga ochilmay, do'kon tekin davri tugagach buyurtma bera olmay qolardi
  if (left.length > 0 && !left.some((u) => u.role === "OWNER")) {
    await tx.shopUser.update({ where: { id: left[0].id }, data: { role: "OWNER" } });
    await tx.auditLog.create({ data: { actor: "system", action: "shop.owner.promoted", entity: "ShopUser", entityId: left[0].id, after: { shopId, previousOwner: id } } });
  }
  // Foydalanuvchisi qolmagan do'kon: buyurtma beradigan ham, taklifga javob beradigan ham yo'q. Distribyutor qarzni ko'radi
  // va to'lovni yozadi, lekin yangi buyurtma yozilmaydi (ulanish bloklanadi), javobsiz so'rov va takliflar o'chadi
  if (left.length === 0) {
    await tx.shopLink.deleteMany({ where: { shopId: user.shopId, status: { in: ["REQUESTED", "INVITED"] } } });
    const blocked = await tx.shopLink.updateMany({ where: { shopId: user.shopId, status: "ACTIVE" }, data: { status: "BLOCKED" } });
    await tx.auditLog.create({ data: { actor: "system", action: "shop.orphaned", entity: "Shop", entityId: user.shopId, after: { blockedLinks: blocked.count } } });
  }
  return user.avatarUrl;
}

// Yagona faol admin o'z hisobini o'chirsa, jamoa (xodimlar, to'lov usullari, sozlamalar) boshqaruvsiz qolardi.
// Jamoada boshqa hech kim bo'lmasa o'chiraveradi: distribyutor yopiladi (deleteStaff)
async function assertNotLastAdmin(client: Tx | typeof db, staffId: string) {
  const s = await client.staff.findUnique({ where: { id: staffId }, select: { role: true, active: true, distributorId: true } });
  if (!s || s.role !== "ADMIN" || !s.active) return;
  const others = { distributorId: s.distributorId, active: true, id: { not: staffId } };
  const [admins, team] = await Promise.all([client.staff.count({ where: { ...others, role: "ADMIN" } }), client.staff.count({ where: others })]);
  if (admins === 0 && team > 0) throw new HttpError(400, lastAdminMsg);
}

// Saytdagi o'chirish sahifasi: SMS kodni tekshirishdan oldin aytiladi (kod behuda ishlatilmasin)
export async function assertDeletable(refs: AccountRef[]): Promise<void> {
  for (const ref of refs) if (ref.kind === "staff") await assertNotLastAdmin(db, ref.id);
}

async function deleteStaff(tx: Tx, id: string) {
  // Jamoa o'zgarishlari bilan bir navbatda (team/[id] PATCH): bir vaqtda ikki admin bir-birini o'chirib yubormaydi
  const { distributorId } = await tx.staff.findUniqueOrThrow({ where: { id }, select: { distributorId: true } });
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`team:${distributorId}`}))`;
  await assertNotLastAdmin(tx, id);
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
  const avatarUrl = ref.kind === "shop" ? await removeShopUser(tx, ref.id) : ref.kind === "staff" ? await deleteStaff(tx, ref.id) : await deleteBrandUser(tx, ref.id);
  await tx.auditLog.create({ data: { actor: `${ref.kind}:${ref.id}`, action: "account.delete", entity: ref.kind, entityId: ref.id } });
  return avatarUrl;
}

// Hisob bog'langan telefon raqami: o'chirish kodi shu raqamga yuboriladi
export async function accountPhone(ref: AccountRef): Promise<string> {
  const where = { where: { id: ref.id }, select: { phone: true } };
  const row =
    ref.kind === "shop" ? await db.shopUser.findUnique(where) : ref.kind === "staff" ? await db.staff.findUnique(where) : await db.brandUser.findUnique(where);
  if (!row?.phone) throw new HttpError(404, "Foydalanuvchi topilmadi");
  return row.phone;
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
