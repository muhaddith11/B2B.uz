import { z } from "zod";
import { Prisma, type Distributor, type OrderStatus, type PaymentType, type ShopLink } from "@prisma/client";
import { db } from "./db";
import { L, som, type TextKey } from "./i18n";
import { addDays, checkCredit } from "./ledger";
import { MAX_LINE_QTY, MAX_ORDER_TOTAL } from "./money";
import { notifyShop, notifyStaff } from "./push";
import { assertApproved, HttpError } from "./session";
import { ledgerCalcSelect } from "./shop-summary";
import { assertTrading, DISTRIBUTOR_PAUSED, EXPIRED_DISTRIBUTOR, EXPIRED_SHOP } from "./subscription";

const itemsSchema = z
  .array(z.object({ productId: z.string().min(1), qty: z.number().int().positive().max(MAX_LINE_QTY) }))
  .min(1)
  .max(200);

// Ilova har bir buyurtma uchun bitta kalit yuboradi: internet uzilib so'rov qayta yuborilsa, buyurtma bir marta yaratiladi
const clientKeySchema = z.string().trim().min(8).max(64).optional();

export const createOrderInput = z.object({
  distributorId: z.string().min(1),
  paymentType: z.enum(["CASH", "TRANSFER", "CREDIT"]),
  items: itemsSchema,
  clientKey: clientKeySchema,
});
export type CreateOrderInput = z.infer<typeof createOrderInput>;

// Agent do'kon nomidan buyurtma oladi
export const agentOrderInput = z.object({
  linkId: z.string().min(1),
  paymentType: z.enum(["CASH", "TRANSFER", "CREDIT"]),
  items: itemsSchema,
  clientKey: clientKeySchema,
});

// Do'konga bildirishnoma: buyurtma holati o'zgardi
const STATUS_TEXT = {
  SENT: "Buyurtmangiz yuborildi",
  ACCEPTED: "Buyurtmangiz qabul qilindi",
  REJECTED: "Buyurtmangiz rad etildi",
  IN_DELIVERY: "Buyurtmangiz yo'lga chiqdi",
  DELIVERED: "Buyurtmangiz topshirildi",
  CANCELLED: "Buyurtmangiz bekor qilindi",
} as const satisfies Record<OrderStatus, TextKey>;

// Agent qo'shgan, egasi hali ilovaga kirib raqamini tasdiqlamagan do'kon: uning roziligisiz nomiga qarz yozilmaydi.
// Naqd buyurtma qarz qoldirmaydi (topshirishda to'lanadi), nasiya va o'tkazma esa qarz yozadi
export const unverifiedShopMsg = "Do'kon egasi ilovaga kirib raqamini tasdiqlamaguncha faqat naqd buyurtma olinadi";
export function assertShopConsents(shop: { verifiedAt: Date | null }, paymentType: PaymentType) {
  if (!shop.verifiedAt && paymentType !== "CASH") throw new HttpError(400, unverifiedShopMsg);
}

// Bitta buyurtma summasi bazaga sig'ishi kerak (money.ts): oshsa, aniq xato (server xatosi emas)
export function assertOrderTotal(total: number) {
  if (total > MAX_ORDER_TOTAL) throw new HttpError(400, L("Bitta buyurtma {sum} dan oshmasin. Buyurtmani bir necha qismga bo'ling", { sum: som(MAX_ORDER_TOTAL) }));
}

// Do'kon uchun narx: ulanishdagi narx guruhi, bo'lmasa distribyutorning asosiy guruhi
export async function priceGroupFor(link: { priceGroupId: string | null; distributorId: string }) {
  if (link.priceGroupId) return link.priceGroupId;
  const def = await db.priceGroup.findFirst({ where: { distributorId: link.distributorId, isDefault: true } });
  if (!def) throw new HttpError(500, "Distribyutorda asosiy narx guruhi yo'q");
  return def.id;
}

export async function activeLink(shopId: string, distributorId: string) {
  const link = await db.shopLink.findUnique({
    where: { shopId_distributorId: { shopId, distributorId } },
    include: { distributor: true },
  });
  if (!link || link.status !== "ACTIVE") throw new HttpError(403, "Bu distribyutor bilan ulanish faol emas");
  return link;
}

// Qarz to'lash uchun: bloklangan do'kon ham to'lay oladi (distribyutor odatda aynan qarz uchun bloklaydi,
// to'lovni yopib qo'yish qarzni undirishga xalaqit beradi). So'rov va taklif holatidagi ulanishda qarz bo'lmaydi
export async function payableLink(shopId: string, distributorId: string) {
  const link = await db.shopLink.findUnique({
    where: { shopId_distributorId: { shopId, distributorId } },
    include: { distributor: true },
  });
  if (!link || (link.status !== "ACTIVE" && link.status !== "BLOCKED")) throw new HttpError(403, "Bu distribyutor bilan ulanish faol emas");
  return link;
}

export async function createOrder(shopUser: { id: string; shopId: string }, input: CreateOrderInput) {
  const link = await activeLink(shopUser.shopId, input.distributorId);
  return createOrderForLink(link, { shopUserId: shopUser.id }, input);
}

type Creator = { shopUserId: string } | { staffId: string };

export async function createOrderForLink(
  link: ShopLink & { distributor: Distributor },
  creator: Creator,
  input: { paymentType: PaymentType; items: { productId: string; qty: number }[]; clientKey?: string },
) {
  // Shu kalit bilan buyurtma allaqachon yaratilgan bo'lsa (javob yo'lda yo'qolib, ilova qayta yubordi), o'sha qaytadi
  const clientKey = input.clientKey ? `${"staffId" in creator ? `staff:${creator.staffId}` : `shop:${creator.shopUserId}`}:${input.clientKey}` : null;
  const repeated = async () => {
    if (!clientKey) return null;
    const prev = await db.order.findUnique({ where: { clientKey }, include: { items: true, shopLink: { include: { shop: true } } } });
    if (prev && prev.shopLinkId !== link.id) throw new HttpError(409, "Bu so'rov boshqa buyurtma uchun ishlatilgan");
    return prev;
  };
  const prev = await repeated();
  if (prev) return prev;

  if (link.status !== "ACTIVE") throw new HttpError(403, "Bu do'kon bilan ulanish faol emas");
  const shop = await db.shop.findUniqueOrThrow({ where: { id: link.shopId }, select: { paidUntil: true, verifiedAt: true } });
  // Obuna (imtiyoz muddati ham) tugagan bo'lsa yangi buyurtma yo'q: do'kon o'zi bera olmaydi, distribyutor qabul qila olmaydi.
  // Platforma tasdig'i olib qo'yilgan (yoki hali berilmagan) distribyutor ham savdo qilmaydi
  if ("staffId" in creator) {
    assertApproved(link.distributor);
    assertTrading(link.distributor, EXPIRED_DISTRIBUTOR);
  } else {
    assertTrading(shop, EXPIRED_SHOP);
    if (link.distributor.status !== "ACTIVE") throw new HttpError(403, DISTRIBUTOR_PAUSED);
    assertTrading(link.distributor, DISTRIBUTOR_PAUSED);
  }
  assertShopConsents(shop, input.paymentType);
  const groupId = await priceGroupFor(link);

  const products = await db.product.findMany({
    where: { id: { in: input.items.map((i) => i.productId) }, distributorId: link.distributorId, active: true },
    include: { prices: { where: { priceGroupId: groupId } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines = input.items.map((item) => {
    const p = byId.get(item.productId);
    if (!p) throw new HttpError(400, "Tovar topilmadi yoki katalogdan olib tashlangan");
    if (!p.inStock) throw new HttpError(400, L('"{name}" tugagan', { name: p.name }));
    if (item.qty % p.packSize !== 0) throw new HttpError(400, L(`"{name}" yashik bo'yicha ({packSize} dona) buyurtma qilinadi`, { name: p.name, packSize: p.packSize }));
    if (item.qty < p.minOrderPacks * p.packSize) throw new HttpError(400, L('"{name}" uchun minimal buyurtma {packs} yashik', { name: p.name, packs: p.minOrderPacks }));
    const price = p.prices[0]?.price;
    if (price === undefined) throw new HttpError(400, L(`"{name}" uchun narx yo'q`, { name: p.name }));
    return { productId: p.id, qty: item.qty, price };
  });

  const total = lines.reduce((s, l) => s + l.qty * l.price, 0);
  assertOrderTotal(total);
  if (total < link.distributor.minOrder) {
    throw new HttpError(400, L("Minimal buyurtma {sum}", { sum: som(link.distributor.minOrder) }));
  }

  const fromStaff = "staffId" in creator;
  const create = () =>
    db.$transaction(async (tx) => {
      if (input.paymentType === "CREDIT") {
        // Bir do'konning nasiyali buyurtmalari navbat bilan tekshiriladi: bir vaqtda kelgan ikki buyurtma birgalikda limitdan oshmaydi
        await tx.$queryRaw`SELECT id FROM "ShopLink" WHERE id = ${link.id} FOR UPDATE`;
        // Faqat hisob uchun kerakli ustunlar (izoh, chek havolasi va h.k. emas): yillik tarixda ham qulf qisqa turadi
        const entries = await tx.ledgerEntry.findMany({ where: { shopLinkId: link.id }, select: ledgerCalcSelect });
        // Qarz topshirilganda yoziladi, shuning uchun hali topshirilmagan nasiyali buyurtmalar ham limitga qo'shiladi
        const pending = await tx.order.aggregate({
          where: { shopLinkId: link.id, paymentType: "CREDIT", status: { in: ["SENT", "ACCEPTED", "IN_DELIVERY"] } },
          _sum: { total: true },
        });
        const check = checkCredit(link, entries, total + (pending._sum.total ?? 0), new Date());
        if (!check.ok) {
          const msg =
            check.reason === "CREDIT_OFF"
              ? "Bu distribyutor nasiya bermagan"
              : check.reason === "OVERDUE_BLOCK"
                ? L("Muddati {days} kun o'tgan qarz bor, nasiya vaqtincha yopiq", { days: check.overdueDays })
                : L("Nasiya limiti {sum}ga oshib ketdi. Farqini naqd to'lang yoki buyurtmani kamaytiring", { sum: som(check.exceedBy) });
          throw new HttpError(400, msg);
        }
      }

      return tx.order.create({
        data: {
          shopLinkId: link.id,
          clientKey,
          paymentType: input.paymentType,
          total,
          source: "staffId" in creator ? "AGENT" : "APP",
          createdByShopUserId: "staffId" in creator ? null : creator.shopUserId,
          createdByStaffId: "staffId" in creator ? creator.staffId : null,
          // Agent olgan buyurtma darhol qabul qilingan hisoblanadi
          status: fromStaff ? "ACCEPTED" : "SENT",
          acceptedAt: fromStaff ? new Date() : null,
          items: { create: lines },
        },
        include: { items: true, shopLink: { include: { shop: true } } },
      });
    });

  let order;
  try {
    order = await create();
  } catch (e) {
    // Bir xil kalitli ikki so'rov bir vaqtda kelsa: ikkinchisi birinchisi yaratgan buyurtmani oladi
    if (clientKey && e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const first = await repeated();
      if (first) return first;
    }
    throw e;
  }

  if (fromStaff) {
    notifyShop(link.shopId, { title: L("Buyurtma №{n}", { n: order.number }), body: L("Agent {sum}lik buyurtma oldi", { sum: som(total) }), data: { url: "/orders" } });
  } else {
    notifyStaff(link.distributorId, ["ADMIN", "OPERATOR"], {
      title: L("Yangi buyurtma №{n}", { n: order.number }),
      body: L("{name}: {sum}", { name: order.shopLink.shop.name, sum: som(total) }),
      data: { url: `/staff/order/${order.id}` },
    });
  }
  return order;
}

// Holatlar qaysi holatga o'ta oladi
const transitions: Record<OrderStatus, OrderStatus[]> = {
  SENT: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["IN_DELIVERY", "CANCELLED"],
  IN_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  REJECTED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return transitions[from].includes(to);
}

// Qisman topshirish: har bir qator uchun topshirilgan miqdor (ko'rsatilmasa, buyurtmadagicha)
export function deliveredLines(
  items: { id: string; qty: number; price: number }[],
  overrides: { itemId: string; deliveredQty: number }[] = [],
) {
  const byId = new Map(overrides.map((o) => [o.itemId, o.deliveredQty]));
  for (const id of byId.keys()) {
    if (!items.some((i) => i.id === id)) throw new HttpError(400, "Buyurtmada bunday qator yo'q");
  }
  const lines = items.map((it) => {
    const q = byId.get(it.id) ?? it.qty;
    if (!Number.isInteger(q) || q < 0 || q > it.qty) throw new HttpError(400, "Topshirilgan miqdor 0 dan buyurtmadagi miqdorgacha bo'lishi kerak");
    return { id: it.id, deliveredQty: q, sum: q * it.price };
  });
  return { lines, total: lines.reduce((s, l) => s + l.sum, 0) };
}

export type StatusOptions = {
  rejectReason?: string;
  courierId?: string | null;
  delivered?: { itemId: string; deliveredQty: number }[];
};

// Distribyutor tomonidan holatni o'zgartirish. Topshirilganda qarz daftariga yozuv tushadi.
export async function changeOrderStatus(staff: { id: string; distributorId: string }, orderId: string, to: OrderStatus, opts: StatusOptions = {}) {
  const updated = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { shopLink: { include: { distributor: { select: { paidUntil: true, status: true } } } }, items: true },
    });
    if (!order || order.shopLink.distributorId !== staff.distributorId) throw new HttpError(404, "Buyurtma topilmadi");
    if (!canTransition(order.status, to)) throw new HttpError(400, "Bu holatga o'tkazib bo'lmaydi");
    // Obuna tugagan distribyutor yangi buyurtmani qabul qilmaydi; boshlangan yetkazish va topshirish ishlayveradi
    if (to === "ACCEPTED") {
      assertApproved(order.shopLink.distributor);
      assertTrading(order.shopLink.distributor, EXPIRED_DISTRIBUTOR);
    }

    // Holat shart bilan o'zgartiriladi: bir vaqtdagi ikki so'rovdan (ikki marta bosish, operator va yetkazuvchi,
    // do'kon bekor qilishi) faqat bittasi o'tadi, shuning uchun qarz daftariga yozuv ikki marta tushmaydi
    const claimed = await tx.order.updateMany({ where: { id: order.id, status: order.status }, data: { status: to } });
    if (claimed.count === 0) throw new HttpError(409, "Buyurtma holati hozirgina o'zgardi. Sahifani yangilang");

    const data: Prisma.OrderUpdateInput = { status: to };
    if (to === "REJECTED") data.rejectReason = opts.rejectReason ?? null;
    if (to === "ACCEPTED") data.acceptedAt = new Date();
    if (to === "IN_DELIVERY") data.dispatchedAt = new Date();
    if (to === "DELIVERED") data.deliveredAt = new Date();

    if (to === "IN_DELIVERY" && opts.courierId) {
      const courier = await tx.staff.findFirst({ where: { id: opts.courierId, distributorId: staff.distributorId, role: "COURIER", active: true } });
      if (!courier) throw new HttpError(400, "Yetkazuvchi topilmadi");
      data.courier = { connect: { id: courier.id } };
    }

    if (to === "DELIVERED") {
      const { lines, total: deliveredTotal } = deliveredLines(order.items, opts.delivered);
      for (const l of lines) await tx.orderItem.update({ where: { id: l.id }, data: { deliveredQty: l.deliveredQty } });
      data.deliveredTotal = deliveredTotal;
      if (!order.courierId) data.courier = { connect: { id: staff.id } };
      const now = new Date();
      if (deliveredTotal > 0) {
        await tx.ledgerEntry.create({
          data: {
            shopLinkId: order.shopLinkId,
            type: "DEBT",
            amount: deliveredTotal,
            date: now,
            dueDate: order.paymentType === "CREDIT" ? addDays(now, order.shopLink.creditDays) : now,
            orderId: order.id,
            createdBy: "system",
          },
        });
        if (order.paymentType === "CASH") {
          await tx.ledgerEntry.create({
            data: {
              shopLinkId: order.shopLinkId,
              type: "PAYMENT",
              amount: -deliveredTotal,
              date: now,
              channel: "CASH",
              orderId: order.id,
              createdBy: `staff:${staff.id}`,
              note: "Topshirishda naqd olindi",
            },
          });
        }
      }
    }

    await tx.auditLog.create({
      data: { actor: `staff:${staff.id}`, action: `order.${to}`, entity: "Order", entityId: order.id, before: { status: order.status }, after: { status: to } },
    });
    return tx.order.update({ where: { id: order.id }, data, include: { shopLink: true } });
  });

  const body =
    to === "REJECTED" && updated.rejectReason
      ? L("Buyurtmangiz rad etildi: {reason}", { reason: updated.rejectReason })
      : to === "DELIVERED" && updated.deliveredTotal !== null
        ? L("Buyurtmangiz topshirildi, {sum}", { sum: som(updated.deliveredTotal) })
        : L(STATUS_TEXT[to]);
  notifyShop(updated.shopLink.shopId, { title: L("Buyurtma №{n}", { n: updated.number }), body, data: { url: "/orders" } });
  if (to === "IN_DELIVERY" && updated.courierId) {
    notifyStaff(staff.distributorId, [], { title: "Yangi yetkazish", body: L("Buyurtma №{n}", { n: updated.number }), data: { url: `/staff/order/${updated.id}` } }, [updated.courierId]);
  }
  return updated;
}

// Do'kon hali qabul qilinmagan buyurtmasini bekor qiladi
export async function cancelOrderByShop(shopId: string, orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { shopLink: { include: { shop: true } } } });
  if (!order || order.shopLink.shopId !== shopId) throw new HttpError(404, "Buyurtma topilmadi");
  const acceptedMsg = "Qabul qilingan buyurtmani bekor qilish uchun distribyutor bilan bog'laning";
  if (order.status !== "SENT") throw new HttpError(400, acceptedMsg);
  const updated = await db.$transaction(async (tx) => {
    // Faqat hali "yuborildi" holatida bo'lsa: shu orada operator qabul qilgan bo'lsa, bekor qilinmaydi
    const res = await tx.order.updateMany({ where: { id: order.id, status: "SENT" }, data: { status: "CANCELLED" } });
    if (res.count === 0) throw new HttpError(400, acceptedMsg);
    await tx.auditLog.create({
      data: { actor: `shop:${shopId}`, action: "order.CANCELLED", entity: "Order", entityId: order.id, before: { status: order.status }, after: { status: "CANCELLED" } },
    });
    return tx.order.findUniqueOrThrow({ where: { id: order.id } });
  });
  notifyStaff(order.shopLink.distributorId, ["ADMIN", "OPERATOR"], {
    title: L("Buyurtma №{n} bekor qilindi", { n: order.number }),
    body: order.shopLink.shop.name,
    data: { url: `/staff/order/${order.id}` },
  });
  return updated;
}
