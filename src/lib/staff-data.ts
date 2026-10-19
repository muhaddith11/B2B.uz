import type { Prisma, StaffRole } from "@prisma/client";
import { db } from "./db";
import { HttpError } from "./session";
import { cursorArgs, pageOf, type OffsetPage, type Page } from "./paging";
import { ledgerFacts, PENDING_STATUSES, summarize } from "./shop-summary";

// Mobil ilovadagi xodim ekranlari uchun umumiy so'rovlar va javob shakllari

export const orderInclude = {
  shopLink: { include: { shop: { include: { users: { where: { role: "OWNER" }, take: 1 } } } } },
  items: { include: { product: { select: { name: true, sku: true, packSize: true, unit: true } } } },
  createdByShopUser: { select: { name: true } },
  createdByStaff: { select: { name: true } },
  courier: { select: { id: true, name: true } },
} satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export function serializeOrder(o: OrderRow) {
  const owner = o.shopLink.shop.users[0];
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    paymentType: o.paymentType,
    total: o.total,
    deliveredTotal: o.deliveredTotal,
    source: o.source,
    createdAt: o.createdAt,
    acceptedAt: o.acceptedAt,
    dispatchedAt: o.dispatchedAt,
    deliveredAt: o.deliveredAt,
    rejectReason: o.rejectReason,
    createdBy: o.source === "AGENT" ? o.createdByStaff?.name ?? null : o.createdByShopUser?.name ?? null,
    courier: o.courier,
    shop: {
      linkId: o.shopLinkId,
      name: o.shopLink.shop.name,
      imageUrl: o.shopLink.shop.imageUrl,
      address: o.shopLink.shop.address,
      district: o.shopLink.shop.district,
      phone: owner?.phone ?? null,
      owner: owner?.name ?? null,
    },
    items: o.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      name: i.product.name,
      sku: i.product.sku,
      packSize: i.product.packSize,
      unit: i.product.unit,
      qty: i.qty,
      deliveredQty: i.deliveredQty,
      price: i.price,
    })),
  };
}

// Qaysi buyurtmalarni ko'radi: agent o'zi olganlarini, yetkazuvchi o'ziga biriktirilgan yoki biriktirilmagan yo'ldagilarni
export function orderScope(staff: { id: string; distributorId: string; role: StaffRole }): Prisma.OrderWhereInput {
  const base: Prisma.OrderWhereInput = { shopLink: { distributorId: staff.distributorId } };
  if (staff.role === "AGENT") return { ...base, createdByStaffId: staff.id };
  if (staff.role === "COURIER") return { ...base, OR: [{ courierId: staff.id }, { courierId: null, status: "IN_DELIVERY" }] };
  return base;
}

// Qaysi do'konlarni (qarz daftari bilan) ko'radi: agent o'ziga biriktirilganlarini,
// yetkazuvchi o'zi yetkazgan yoki hozir yetkazishi mumkin bo'lgan do'konlarni, qolganlar hammasini.
// Taklif qilingan (do'kon egasi hali tasdiqlamagan) do'kon hech kimga ko'rinmaydi
export function linkScope(staff: { id: string; distributorId: string; role: StaffRole }): Prisma.ShopLinkWhereInput {
  const base: Prisma.ShopLinkWhereInput = { distributorId: staff.distributorId, status: { not: "INVITED" } };
  if (staff.role === "AGENT") return { ...base, agentId: staff.id };
  if (staff.role === "COURIER") return { ...base, orders: { some: { OR: [{ courierId: staff.id }, { courierId: null, status: "IN_DELIVERY" }] } } };
  return base;
}

export async function staffOrder(staff: { id: string; distributorId: string; role: StaffRole }, orderId: string) {
  const o = await db.order.findFirst({ where: { id: orderId, ...orderScope(staff) }, include: orderInclude });
  if (!o) throw new HttpError(404, "Buyurtma topilmadi");
  return o;
}

// Do'konlar ro'yxati: qarz va muddat bilan, nom bo'yicha sahifalab. Jami soni va umumiy qarz butun ro'yxat bo'yicha
// (faqat ko'rinib turgan sahifa emas)
export async function shopList(staff: { id: string; distributorId: string; role: StaffRole }, q = "", page: OffsetPage = { limit: 500, offset: 0 }) {
  const where: Prisma.ShopLinkWhereInput = {
    ...linkScope(staff),
    status: { in: ["ACTIVE", "BLOCKED"] },
    ...(q ? { shop: { OR: [{ name: { contains: q, mode: "insensitive" } }, { address: { contains: q, mode: "insensitive" } }] } } : {}),
  };
  const [links, total, debt] = await Promise.all([
    db.shopLink.findMany({
      where,
      include: {
        shop: true,
        agent: { select: { name: true } },
        orders: { where: { status: { in: [...PENDING_STATUSES] } }, select: { total: true, paymentType: true } },
      },
      orderBy: [{ shop: { name: "asc" } }, { id: "asc" }],
      skip: page.offset,
      take: page.limit,
    }),
    db.shopLink.count({ where }),
    db.ledgerEntry.aggregate({ where: { status: "CONFIRMED", shopLink: where }, _sum: { amount: true } }),
  ]);
  const facts = await ledgerFacts(links.map((l) => l.id));
  const next = page.offset + links.length;
  return {
    total,
    totalDebt: debt._sum.amount ?? 0,
    nextOffset: next < total ? next : null,
    shops: links.map((l) => ({
    linkId: l.id,
    status: l.status,
    shop: { id: l.shop.id, name: l.shop.name, imageUrl: l.shop.imageUrl, address: l.shop.address, district: l.shop.district },
    agent: l.agent?.name ?? null,
    ...summarize(facts.get(l.id)!, l.orders, l.creditLimit),
    })),
  };
}

export async function staffLink(staff: { id: string; distributorId: string; role: StaffRole }, linkId: string) {
  const link = await db.shopLink.findFirst({ where: { id: linkId, ...linkScope(staff) }, include: { distributor: true, shop: true } });
  if (!link) throw new HttpError(404, "Do'kon topilmadi");
  return link;
}

// Do'kon kartasidagi qarz daftari: eng yangisidan, sahifalab (karta birinchi sahifani, "Yana" keyingisini oladi)
export const ledgerRowInclude = { order: { select: { number: true } }, reversedBy: { select: { id: true } } } satisfies Prisma.LedgerEntryInclude;

export async function ledgerPage(shopLinkId: string, page: Page) {
  const rows = await db.ledgerEntry.findMany({ where: { shopLinkId }, include: ledgerRowInclude, orderBy: [{ date: "desc" }, { id: "desc" }], ...cursorArgs(page) });
  const { items, nextCursor } = pageOf(rows, page);
  return {
    nextCursor,
    entries: items.map((e) => ({
      id: e.id,
      type: e.type,
      amount: e.amount,
      date: e.date,
      dueDate: e.dueDate,
      status: e.status,
      channel: e.channel,
      note: e.note,
      receiptUrl: e.receiptUrl,
      orderNumber: e.order?.number ?? null,
      // Tuzatish: bu yozuv qaysi yozuvni bekor qilgan va o'zi bekor qilinganmi
      reversesId: e.reversesId,
      reversed: e.reversedBy !== null,
    })),
  };
}
