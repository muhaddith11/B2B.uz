import { z } from "zod";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { lockRegistration } from "@/lib/registration";
import { handle, HttpError, readJson, requireStaff } from "@/lib/session";
import { shopList } from "@/lib/staff-data";

export const GET = handle(async (req: Request) => {
  const staff = await requireStaff(req, ["ADMIN", "OPERATOR", "ACCOUNTANT", "AGENT"]);
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  return Response.json({ shops: await shopList(staff, q) });
});

const newShopInput = z.object({
  shopName: z.string().trim().min(2).max(100),
  address: z.string().trim().min(5).max(200),
  district: z.string().trim().min(2).max(100),
  ownerName: z.string().trim().min(2).max(100),
  phone: z.string(),
});

// Agent do'konga borib, uni ulaydi. Egasining raqami tizimda bo'lsa, o'sha do'kon ulanadi.
export const POST = handle(async (req: Request) => {
  const staff = await requireStaff(req, ["ADMIN", "OPERATOR", "AGENT"]);
  const input = await readJson(req, newShopInput, "Barcha maydonlarni to'ldiring");
  const phone = normalizePhone(input.phone);
  if (!phone) throw new HttpError(400, "Telefon raqami +998 XX XXX XX XX ko'rinishida bo'lsin");

  const agentId = staff.role === "AGENT" ? staff.id : null;

  const { link, owner } = await db.$transaction(async (tx) => {
    // Bir raqamga ikki xodim (yoki do'konning o'zi) bir vaqtda ro'yxatdan o'tkazsa ham bitta do'kon yaratiladi
    await lockRegistration(tx, phone);
    const owner = await tx.shopUser.findFirst({ where: { phone, role: "OWNER" }, orderBy: { createdAt: "asc" } });
    let shopId = owner?.shopId;
    if (!shopId) {
      const shop = await tx.shop.create({
        data: { name: input.shopName, address: input.address, district: input.district, users: { create: { name: input.ownerName, phone, role: "OWNER" } } },
      });
      shopId = shop.id;
    }
    const existing = await tx.shopLink.findUnique({ where: { shopId_distributorId: { shopId, distributorId: staff.distributorId } } });
    if (existing?.status === "ACTIVE") throw new HttpError(400, "Bu do'kon allaqachon ulangan");
    // Admin bloklagan do'konni agent yoki operator qayta qo'shish orqali ochib yubora olmaydi
    if (existing?.status === "BLOCKED" && staff.role !== "ADMIN") throw new HttpError(403, "Bu do'kon bloklangan. Blokdan faqat admin chiqaradi");
    const data = { status: "ACTIVE" as const, agentId: existing?.agentId ?? agentId, source: existing?.source ?? ("AGENT" as const) };
    const saved = existing
      ? await tx.shopLink.update({ where: { id: existing.id }, data })
      : await tx.shopLink.create({ data: { ...data, shopId, distributorId: staff.distributorId } });
    await tx.auditLog.create({ data: { actor: `staff:${staff.id}`, action: "link.created", entity: "ShopLink", entityId: saved.id, after: { shopId } } });
    return { link: saved, owner };
  });
  return Response.json({ linkId: link.id, existingShop: Boolean(owner) });
});
