import { z } from "zod";
import { db } from "@/lib/db";
import { L } from "@/lib/i18n";
import { normalizePhone } from "@/lib/phone";
import { notifyShop } from "@/lib/push";
import { lockRegistration } from "@/lib/registration";
import { assertApproved, handle, HttpError, readJson, requireStaff } from "@/lib/session";
import { trialPeriod } from "@/lib/subscription";
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

// Agent do'konga borib, uni qo'shadi. Faqat platforma tasdiqlagan distribyutor:
// - raqam tizimda yo'q: yangi do'kon yaratiladi va darhol ulanadi (egasi shu raqam bilan SMS orqali kiradi);
// - raqamda do'kon bor: ulanish taklif bo'ladi, do'kon egasi ilovada tasdiqlaydi. Roziligisiz begona do'konning
//   ma'lumotini ko'rib, uning nomidan buyurtma va qarz yozib bo'lmaydi;
// - do'konning o'zi so'rov yuborgan yoki admin blokdan chiqaryapti: rozilik bor, darhol faol.
export const POST = handle(async (req: Request) => {
  const staff = await requireStaff(req, ["ADMIN", "OPERATOR", "AGENT"]);
  assertApproved(staff.distributor);
  const input = await readJson(req, newShopInput, "Barcha maydonlarni to'ldiring");
  const phone = normalizePhone(input.phone);
  if (!phone) throw new HttpError(400, "Telefon raqami +998 XX XXX XX XX ko'rinishida bo'lsin");

  const agentId = staff.role === "AGENT" ? staff.id : null;
  const distributorId = staff.distributorId;

  const { link, invited } = await db.$transaction(async (tx) => {
    // Bir raqamga ikki xodim (yoki do'konning o'zi) bir vaqtda ro'yxatdan o'tkazsa ham bitta do'kon yaratiladi
    await lockRegistration(tx, phone);
    const owner = await tx.shopUser.findFirst({ where: { phone, role: "OWNER" }, orderBy: { createdAt: "asc" } });
    if (!owner) {
      const shop = await tx.shop.create({
        data: { name: input.shopName, address: input.address, district: input.district, ...trialPeriod(), users: { create: { name: input.ownerName, phone, role: "OWNER" } } },
      });
      const created = await tx.shopLink.create({ data: { shopId: shop.id, distributorId, status: "ACTIVE", agentId, source: "AGENT" } });
      await tx.auditLog.create({ data: { actor: `staff:${staff.id}`, action: "link.created", entity: "ShopLink", entityId: created.id, after: { shopId: shop.id } } });
      return { link: created, invited: false };
    }

    const existing = await tx.shopLink.findUnique({ where: { shopId_distributorId: { shopId: owner.shopId, distributorId } } });
    if (existing?.status === "ACTIVE") throw new HttpError(400, "Bu do'kon allaqachon ulangan");
    if (existing?.status === "INVITED") throw new HttpError(400, "Taklif allaqachon yuborilgan: do'kon egasi tasdiqlashini kuting");
    // Admin bloklagan do'konni agent yoki operator qayta qo'shish orqali ochib yubora olmaydi
    if (existing?.status === "BLOCKED" && staff.role !== "ADMIN") throw new HttpError(403, "Bu do'kon bloklangan. Blokdan faqat admin chiqaradi");
    const saved = existing
      ? await tx.shopLink.update({ where: { id: existing.id }, data: { status: "ACTIVE", agentId: existing.agentId ?? agentId } })
      : await tx.shopLink.create({ data: { shopId: owner.shopId, distributorId, status: "INVITED", agentId, source: "AGENT" } });
    await tx.auditLog.create({
      data: { actor: `staff:${staff.id}`, action: existing ? "link.created" : "link.invited", entity: "ShopLink", entityId: saved.id, after: { shopId: owner.shopId, status: saved.status } },
    });
    return { link: saved, invited: !existing };
  });

  if (invited) {
    notifyShop(link.shopId, {
      title: "Ulanish taklifi",
      body: L("{name} sizni o'z do'konlari ro'yxatiga qo'shmoqchi. Tasdiqlang yoki rad eting", { name: staff.distributor.name }),
      data: { url: "/" },
    });
  }
  return Response.json({ linkId: link.id, invited });
});
