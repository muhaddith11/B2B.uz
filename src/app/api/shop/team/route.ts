import { z } from "zod";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { lockRegistration } from "@/lib/registration";
import { handle, HttpError, readJson, requireShopUser } from "@/lib/session";

// Do'kon jamoasi: egasi sotuvchilarni qo'shadi. Sotuvchi o'z raqami bilan SMS orqali kiradi, buyurtma beradi va qarzni ko'radi;
// ulanish takliflari, do'kon surati va jamoa faqat egasida
const MAX_SELLERS = 20;

async function owner(req: Request) {
  const user = await requireShopUser(req);
  if (user.role !== "OWNER") throw new HttpError(403, "Faqat do'kon egasi");
  return user;
}

export const GET = handle(async (req: Request) => {
  const user = await owner(req);
  const users = await db.shopUser.findMany({ where: { shopId: user.shopId }, orderBy: [{ role: "asc" }, { createdAt: "asc" }] });
  return Response.json({ team: users.map((u) => ({ id: u.id, name: u.name, phone: u.phone, role: u.role, avatarUrl: u.avatarUrl, me: u.id === user.id })) });
});

export const POST = handle(async (req: Request) => {
  const user = await owner(req);
  const input = await readJson(req, z.object({ name: z.string().trim().min(2).max(100), phone: z.string() }), "Ism va telefonni kiriting");
  const phone = normalizePhone(input.phone);
  if (!phone) throw new HttpError(400, "Telefon raqami +998 XX XXX XX XX ko'rinishida bo'lsin");
  const seller = await db.$transaction(async (tx) => {
    // Bir raqam bir vaqtda ikki marta qo'shilmaydi (ikki marta bosish)
    await lockRegistration(tx, phone);
    if (await tx.shopUser.findFirst({ where: { shopId: user.shopId, phone } })) throw new HttpError(400, "Bu raqam do'koningizda allaqachon bor");
    if ((await tx.shopUser.count({ where: { shopId: user.shopId, role: "SELLER" } })) >= MAX_SELLERS) throw new HttpError(400, "Sotuvchilar soni 20 tadan oshmasin");
    const created = await tx.shopUser.create({ data: { shopId: user.shopId, name: input.name, phone, role: "SELLER" } });
    await tx.auditLog.create({ data: { actor: `shop:${user.id}`, action: "shop.seller.added", entity: "ShopUser", entityId: created.id } });
    return created;
  });
  return Response.json({ id: seller.id });
});
