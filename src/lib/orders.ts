import { z } from "zod";
import type { OrderStatus, PaymentType, Prisma, ShopLink, Distributor } from "@prisma/client";
import { db } from "./db";
import { addDays, checkCredit } from "./ledger";
import { formatSom } from "./money";
import { notifyShop, notifyStaff } from "./push";
import { HttpError } from "./session";

const itemsSchema = z
  .array(z.object({ productId: z.string().min(1), qty: z.number().int().positive() }))
  .min(1)
  .max(200);

export const createOrderInput = z.object({
  distributorId: z.string().min(1),
  paymentType: z.enum(["CASH", "TRANSFER", "CREDIT"]),
  items: itemsSchema,
});
export type CreateOrderInput = z.infer<typeof createOrderInput>;

// Agent do'kon nomidan buyurtma oladi
export const agentOrderInput = z.object({
  linkId: z.string().min(1),
  paymentType: z.enum(["CASH", "TRANSFER", "CREDIT"]),
  items: itemsSchema,
});

export const STATUS_LABEL: Record<OrderStatus, string> = {
  SENT: "yuborildi",
  ACCEPTED: "qabul qilindi",
  REJECTED: "rad etildi",
  IN_DELIVERY: "yo'lga chiqdi",
  DELIVERED: "topshirildi",
  CANCELLED: "bekor qilindi",
};

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

export async function createOrder(shopUser: { id: string; shopId: string }, input: CreateOrderInput) {
  const link = await activeLink(shopUser.shopId, input.distributorId);
  return createOrderForLink(link, { shopUserId: shopUser.id }, input);
}

type Creator = { shopUserId: string } | { staffId: string };

export async function createOrderForLink(
  link: ShopLink & { distributor: Distributor },
  creator: Creator,
  input: { paymentType: PaymentType; items: { productId: string; qty: number }[] },
) {
  if (link.status !== "ACTIVE") throw new HttpError(403, "Bu do'kon bilan ulanish faol emas");
  const groupId = await priceGroupFor(link);

  const products = await db.product.findMany({
    where: { id: { in: input.items.map((i) => i.productId) }, distributorId: link.distributorId, active: true },
    include: { prices: { where: { priceGroupId: groupId } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines = input.items.map((item) => {
    const p = byId.get(item.productId);
    if (!p) throw new HttpError(400, "Tovar topilmadi yoki katalogdan olib tashlangan");
    if (!p.inStock) throw new HttpError(400, `"${p.name}" tugagan`);
    if (item.qty % p.packSize !== 0) throw new HttpError(400, `"${p.name}" yashik bo'yicha (${p.packSize} dona) buyurtma qilinadi`);
    if (item.qty < p.minOrderPacks * p.packSize) throw new HttpError(400, `"${p.name}" uchun minimal buyurtma ${p.minOrderPacks} yashik`);
    const price = p.prices[0]?.price;
    if (price === undefined) throw new HttpError(400, `"${p.name}" uchun narx yo'q`);
    return { productId: p.id, qty: item.qty, price };
  });

  const total = lines.reduce((s, l) => s + l.qty * l.price, 0);
  if (total < link.distributor.minOrder) {
    throw new HttpError(400, `Minimal buyurtma ${formatSom(link.distributor.minOrder)}`);
  }

  if (input.paymentType === "CREDIT") {
    const entries = await db.ledgerEntry.findMany({ where: { shopLinkId: link.id } });
    // Qarz topshirilganda yoziladi, shuning uchun hali topshirilmagan nasiyali buyurtmalar ham limitga qo'shiladi
    const pending = await db.order.aggregate({
      where: { shopLinkId: link.id, paymentType: "CREDIT", status: { in: ["SENT", "ACCEPTED", "IN_DELIVERY"] } },
      _sum: { total: true },
    });
    const check = checkCredit(link, entries, total + (pending._sum.total ?? 0), new Date());
    if (!check.ok) {
      const msg =
        check.reason === "CREDIT_OFF"
          ? "Bu distribyutor nasiya bermagan"
          : check.reason === "OVERDUE_BLOCK"
            ? `Muddati ${check.overdueDays} kun o'tgan qarz bor, nasiya vaqtincha yopiq`
            : `Nasiya limiti ${formatSom(check.exceedBy)}ga oshib ketdi. Farqini naqd to'lang yoki buyurtmani kamaytiring`;
      throw new HttpError(400, msg);
    }
  }

  const fromStaff = "staffId" in creator;
  const order = await db.order.create({
    data: {
      shopLinkId: link.id,
      paymentType: input.paymentType,
      total,
      source: fromStaff ? "AGENT" : "APP",
      createdByShopUserId: fromStaff ? null : creator.shopUserId,
      createdByStaffId: fromStaff ? creator.staffId : null,
      // Agent olgan buyurtma darhol qabul qilingan hisoblanadi
      status: fromStaff ? "ACCEPTED" : "SENT",
      items: { create: lines },
    },
    include: { items: true, shopLink: { include: { shop: true } } },
  });

  if (fromStaff) {
    notifyShop(link.shopId, { title: `Buyurtma №${order.number}`, body: `Agent ${formatSom(total)}lik buyurtma oldi`, data: { url: "/orders" } });
  } else {
    notifyStaff(link.distributorId, ["ADMIN", "OPERATOR"], {
      title: `Yangi buyurtma №${order.number}`,
      body: `${order.shopLink.shop.name}: ${formatSom(total)}`,
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
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { shopLink: true, items: true } });
    if (!order || order.shopLink.distributorId !== staff.distributorId) throw new HttpError(404, "Buyurtma topilmadi");
    if (!canTransition(order.status, to)) throw new HttpError(400, "Bu holatga o'tkazib bo'lmaydi");

    const data: Prisma.OrderUpdateInput = { status: to };
    if (to === "REJECTED") data.rejectReason = opts.rejectReason ?? null;

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

  const extra = to === "REJECTED" && updated.rejectReason ? `: ${updated.rejectReason}` : to === "DELIVERED" && updated.deliveredTotal !== null ? `, ${formatSom(updated.deliveredTotal)}` : "";
  notifyShop(updated.shopLink.shopId, { title: `Buyurtma №${updated.number}`, body: `Buyurtmangiz ${STATUS_LABEL[to]}${extra}`, data: { url: "/orders" } });
  if (to === "IN_DELIVERY" && updated.courierId) {
    notifyStaff(staff.distributorId, [], { title: "Yangi yetkazish", body: `Buyurtma №${updated.number}`, data: { url: `/staff/order/${updated.id}` } }, [updated.courierId]);
  }
  return updated;
}

// Do'kon hali qabul qilinmagan buyurtmasini bekor qiladi
export async function cancelOrderByShop(shopId: string, orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { shopLink: { include: { shop: true } } } });
  if (!order || order.shopLink.shopId !== shopId) throw new HttpError(404, "Buyurtma topilmadi");
  if (order.status !== "SENT") throw new HttpError(400, "Qabul qilingan buyurtmani bekor qilish uchun distribyutor bilan bog'laning");
  const updated = await db.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
  await db.auditLog.create({
    data: { actor: `shop:${shopId}`, action: "order.CANCELLED", entity: "Order", entityId: order.id, before: { status: order.status }, after: { status: "CANCELLED" } },
  });
  notifyStaff(order.shopLink.distributorId, ["ADMIN", "OPERATOR"], {
    title: `Buyurtma №${order.number} bekor qilindi`,
    body: order.shopLink.shop.name,
    data: { url: `/staff/order/${order.id}` },
  });
  return updated;
}
