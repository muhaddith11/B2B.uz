import { Prisma, type ShopUserRole, type StaffRole } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { L, som } from "./i18n";
import { addDays } from "./ledger";
import { MAX_PAYMENT } from "./payments";
import { notifyShop, notifyStaff } from "./push";
import { HttpError } from "./session";

// Qarz daftarini tuzatish. Daftar o'zgarmaydi: eski yozuv tahrirlanmaydi, uning o'rniga tuzatish (ADJUSTMENT) yozuvi qo'shiladi.
// - Bekor qilish: xato yozilgan to'lov yoki qarz teskari yozuv bilan yo'qqa chiqariladi (qarz hisobida ikkalasi ham ko'rinmaydi);
// - Tuzatish: qaytarilgan tovar, chegirma, eski (qog'ozdagi) qarz kabi summa qo'lda qo'shiladi yoki ayiriladi.
// Faqat admin va hisobchi; har biri sababi bilan audit jurnaliga yoziladi va do'konga xabar boradi.
// Qarzni oshiradigan tuzatish (qo'shilgan qarz, bekor qilingan to'lov) do'kon egasi ilovada tasdiqlaguncha kutadi (PENDING):
// do'konning roziligisiz qarz yozilmaydi. Qarzni kamaytiradigani darhol kuchga kiradi.

export const CORRECTION_ROLES: StaffRole[] = ["ADMIN", "ACCOUNTANT"];

export const reverseInput = z.object({ reason: z.string().trim().min(3).max(200) });

export async function reverseEntry(staff: { id: string; distributorId: string }, entryId: string, reason: string) {
  const entry = await db.ledgerEntry.findUnique({ where: { id: entryId }, include: { shopLink: true, reversedBy: { select: { id: true, status: true } } } });
  if (!entry || entry.shopLink.distributorId !== staff.distributorId) throw new HttpError(404, "Yozuv topilmadi");
  if (entry.status !== "CONFIRMED") throw new HttpError(400, "Faqat tasdiqlangan yozuvni bekor qilish mumkin. Chekni tasdiqlash yoki rad etish kifoya");
  if (entry.reversesId) throw new HttpError(400, "Bu yozuvning o'zi tuzatish: kerak bo'lsa yangi tuzatish yozing");
  // Payme va Click to'lovini to'lov tizimi bekor qiladi: unda teskari yozuv avtomatik tushadi
  if (entry.channel === "PAYME" || entry.channel === "CLICK") throw new HttpError(400, "Onlayn to'lovni faqat to'lov tizimi bekor qiladi");
  const alreadyMsg = "Bu yozuv allaqachon bekor qilingan";
  if (entry.reversedBy?.status === "PENDING") throw new HttpError(409, "Bekor qilish do'kon tasdig'ini kutmoqda");
  if (entry.reversedBy) throw new HttpError(409, alreadyMsg);
  // To'lovni bekor qilish qarzni oshiradi: do'kon tasdiqlaguncha kutadi
  const needsShop = -entry.amount > 0;

  let reversal;
  try {
    reversal = await db.$transaction(async (tx) => {
      // reversesId noyob: bir vaqtda ikki xodim bekor qilsa ham, teskari yozuv bitta bo'ladi
      const created = await tx.ledgerEntry.create({
        data: {
          shopLinkId: entry.shopLinkId,
          type: "ADJUSTMENT",
          amount: -entry.amount,
          reversesId: entry.id,
          orderId: entry.orderId,
          status: needsShop ? "PENDING" : "CONFIRMED",
          createdBy: `staff:${staff.id}`,
          note: `Bekor qilindi: ${reason}`,
        },
      });
      await tx.auditLog.create({
        data: {
          actor: `staff:${staff.id}`,
          action: "ledger.reversed",
          entity: "LedgerEntry",
          entityId: entry.id,
          before: { amount: entry.amount, type: entry.type },
          after: { reversalId: created.id, reason },
        },
      });
      return created;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new HttpError(409, alreadyMsg);
    throw e;
  }
  notifyShop(
    entry.shopLink.shopId,
    needsShop
      ? { title: "Qarz qo'shish so'rovi", body: L("To'lov bekor qilinmoqchi, {sum}: {reason}. Tasdiqlang yoki rad eting", { sum: som(-entry.amount), reason }), data: { url: "/debts" } }
      : { title: "Qarz daftari tuzatildi", body: L("{sum}: {reason}", { sum: som(Math.abs(entry.amount)), reason }), data: { url: "/debts" } },
  );
  return reversal;
}

export const adjustInput = z.object({
  linkId: z.string().min(1),
  // Musbat: qarz oshadi (masalan, eski qarz). Manfiy: qarz kamayadi (qaytarilgan tovar, chegirma)
  amount: z.coerce
    .number()
    .int()
    .refine((n) => n !== 0 && Math.abs(n) <= MAX_PAYMENT),
  note: z.string().trim().min(3).max(200),
  // Takroriy so'rov (ikki marta bosish, tarmoq uzilishi) tuzatishni ikki marta yozmasligi uchun
  clientKey: z.string().trim().min(8).max(64).optional(),
});

export async function adjustLedger(staff: { id: string; distributorId: string }, input: z.infer<typeof adjustInput>) {
  const link = await db.shopLink.findFirst({ where: { id: input.linkId, distributorId: staff.distributorId, status: { in: ["ACTIVE", "BLOCKED"] } } });
  if (!link) throw new HttpError(404, "Do'kon topilmadi");
  const clientKey = input.clientKey ? `${staff.id}:${input.clientKey}` : null;
  const already = async () => {
    const prev = clientKey ? await db.ledgerEntry.findUnique({ where: { clientKey } }) : null;
    if (prev && (prev.shopLinkId !== link.id || prev.amount !== input.amount)) throw new HttpError(409, "Bu so'rov boshqa yozuv uchun ishlatilgan");
    return prev;
  };
  const prev = await already();
  if (prev) return prev;

  const now = new Date();
  // Qo'shilgan qarz do'kon tasdiqlaguncha kutadi; kamaytirish darhol
  const needsShop = input.amount > 0;
  let entry;
  try {
    entry = await db.$transaction(async (tx) => {
      const created = await tx.ledgerEntry.create({
        data: {
          shopLinkId: link.id,
          type: "ADJUSTMENT",
          amount: input.amount,
          status: needsShop ? "PENDING" : "CONFIRMED",
          date: now,
          // Qo'shilgan qarz oddiy nasiya muddati bilan to'lanadi (muddat do'kon tasdiqlagan kundan qayta hisoblanadi)
          dueDate: needsShop ? addDays(now, link.creditDays) : null,
          createdBy: `staff:${staff.id}`,
          note: input.note,
          clientKey,
        },
      });
      await tx.auditLog.create({
        data: { actor: `staff:${staff.id}`, action: "ledger.adjusted", entity: "LedgerEntry", entityId: created.id, after: { amount: input.amount, note: input.note } },
      });
      return created;
    });
  } catch (e) {
    if (clientKey && e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const first = await already();
      if (first) return first;
    }
    throw e;
  }
  notifyShop(
    link.shopId,
    needsShop
      ? { title: "Qarz qo'shish so'rovi", body: L("{sum}: {reason}. Tasdiqlang yoki rad eting", { sum: som(input.amount), reason: input.note }), data: { url: "/debts" } }
      : { title: "Qarz daftari tuzatildi", body: L("{sum}: {reason}", { sum: som(input.amount), reason: input.note }), data: { url: "/debts" } },
  );
  return entry;
}

// Do'kon egasi distribyutor qo'shmoqchi bo'lgan qarzga (tuzatish yoki bekor qilingan to'lov) javob beradi.
// Tasdiq: qarz daftariga kiradi, qo'shilgan qarzning muddati shu kundan boshlanadi. Rad etish: yozuv kuchsiz qoladi;
// bekor qilinmoqchi bo'lgan to'lov esa kuchda qoladi, distribyutor kerak bo'lsa yangi so'rov yuboradi
export async function answerLedgerByShop(user: { id: string; shopId: string; role: ShopUserRole }, entryId: string, accept: boolean) {
  if (user.role !== "OWNER") throw new HttpError(403, "Qarzni faqat do'kon egasi tasdiqlaydi");
  const entry = await db.ledgerEntry.findUnique({ where: { id: entryId }, include: { shopLink: { include: { shop: { select: { name: true } } } } } });
  // Faqat distribyutor qo'shmoqchi bo'lgan qarz: chekli to'lovni do'kon emas, distribyutor tasdiqlaydi
  if (!entry || entry.shopLink.shopId !== user.shopId || entry.type !== "ADJUSTMENT" || entry.amount <= 0) throw new HttpError(404, "Yozuv topilmadi");
  const answeredMsg = "Bu so'rov allaqachon ko'rib chiqilgan";
  if (entry.status !== "PENDING") throw new HttpError(400, answeredMsg);
  const now = new Date();
  const data: Prisma.LedgerEntryUncheckedUpdateManyInput = accept
    ? // Bekor qilingan to'lov asl qarzlarning muddatini qaytaradi; qo'shilgan qarzning muddati tasdiq kunidan
      { status: "CONFIRMED", ...(entry.reversesId ? {} : { date: now, dueDate: addDays(now, entry.shopLink.creditDays) }) }
    : // Rad etilgan bekor qilish yozuvi asl to'lovni band qilib turmaydi
      { status: "REJECTED", reversesId: null, note: `${entry.note ?? ""}. Do'kon rad etdi` };
  const updated = await db.$transaction(async (tx) => {
    const res = await tx.ledgerEntry.updateMany({ where: { id: entry.id, status: "PENDING" }, data });
    if (res.count === 0) throw new HttpError(409, answeredMsg);
    await tx.auditLog.create({
      data: {
        actor: `shop:${user.shopId}`,
        action: accept ? "ledger.shop_confirmed" : "ledger.shop_declined",
        entity: "LedgerEntry",
        entityId: entry.id,
        before: { status: "PENDING", amount: entry.amount },
        after: { status: accept ? "CONFIRMED" : "REJECTED", shopUserId: user.id },
      },
    });
    return tx.ledgerEntry.findUniqueOrThrow({ where: { id: entry.id } });
  });
  const creator = entry.createdBy.startsWith("staff:") ? [entry.createdBy.slice("staff:".length)] : [];
  notifyStaff(
    entry.shopLink.distributorId,
    ["ADMIN", "ACCOUNTANT"],
    {
      title: accept ? "Qarz tasdiqlandi" : "Qarz rad etildi",
      body: L("{name}: {sum}", { name: entry.shopLink.shop.name, sum: som(entry.amount) }),
      data: { url: `/staff/shop/${entry.shopLinkId}` },
    },
    creator,
  );
  return updated;
}
