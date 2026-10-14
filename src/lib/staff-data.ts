import type { Prisma, StaffRole } from "@prisma/client";
import { db } from "./db";
import { HttpError } from "./session";
import { ledgerCalcSelect, PENDING_STATUSES, summarize } from "./shop-summary";

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
    rejectReason: o.rejectReason,
    createdBy: o.source === "AGENT" ? o.createdByStaff?.name ?? null : o.createdByShopUser?.name ?? null,
    courier: o.courier,
    shop: {
      linkId: o.shopLinkId,
      name: o.shopLink.shop.name,
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
// yetkazuvchi o'zi yetkazgan yoki hozir yetkazishi mumkin bo'lgan do'konlarni, qolganlar hammasini
export function linkScope(staff: { id: string; distributorId: string; role: StaffRole }): Prisma.ShopLinkWhereInput {
  const base: Prisma.ShopLinkWhereInput = { distributorId: staff.distributorId };
  if (staff.role === "AGENT") return { ...base, agentId: staff.id };
  if (staff.role === "COURIER") return { ...base, orders: { some: { OR: [{ courierId: staff.id }, { courierId: null, status: "IN_DELIVERY" }] } } };
  return base;
}

export async function staffOrder(staff: { id: string; distributorId: string; role: StaffRole }, orderId: string) {
  const o = await db.order.findFirst({ where: { id: orderId, ...orderScope(staff) }, include: orderInclude });
  if (!o) throw new HttpError(404, "Buyurtma topilmadi");
  return o;
}

// Do'konlar ro'yxati: qarz va muddat bilan
export async function shopList(staff: { id: string; distributorId: string; role: StaffRole }, q = "") {
  const links = await db.shopLink.findMany({
    where: {
      ...linkScope(staff),
      status: { in: ["ACTIVE", "BLOCKED"] },
      ...(q ? { shop: { OR: [{ name: { contains: q, mode: "insensitive" } }, { address: { contains: q, mode: "insensitive" } }] } } : {}),
    },
    include: {
      shop: true,
      agent: { select: { name: true } },
      ledger: { select: ledgerCalcSelect },
      orders: { where: { status: { in: [...PENDING_STATUSES] } }, select: { total: true, paymentType: true } },
    },
    orderBy: { shop: { name: "asc" } },
    take: 500,
  });
  return links.map((l) => ({
    linkId: l.id,
    status: l.status,
    shop: { id: l.shop.id, name: l.shop.name, address: l.shop.address, district: l.shop.district },
    agent: l.agent?.name ?? null,
    ...summarize(l.ledger, l.orders, l.creditLimit),
  }));
}

export async function staffLink(staff: { id: string; distributorId: string; role: StaffRole }, linkId: string) {
  const link = await db.shopLink.findFirst({ where: { id: linkId, ...linkScope(staff) }, include: { distributor: true, shop: true } });
  if (!link) throw new HttpError(404, "Do'kon topilmadi");
  return link;
}
