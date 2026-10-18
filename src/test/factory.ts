// Integratsiya testlari uchun ma'lumot yaratish. Har chaqiruv yangi, noyob yozuvlar yaratadi:
// testlar bir-biriga xalaqit bermaydi va bazani tozalash shart emas.
import type { PaymentType, Prisma, StaffRole } from "@prisma/client";
import { db } from "@/lib/db";
import { trialPeriod } from "@/lib/subscription";
import { signToken } from "@/lib/token";

let seq = 0;
export const uid = () => `${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// Har test o'z raqamini oladi: raqam bo'yicha cheklovlar (SMS, ro'yxatdan o'tish) testlararo aralashmasin
export const phone = () => `+99899${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

const exp = () => Math.floor(Date.now() / 1000) + 3600;
export const tokens = {
  staff: (staffId: string) => signToken({ kind: "staff", staffId, exp: exp() }),
  shop: (shopUserId: string) => signToken({ kind: "shop", shopUserId, exp: exp() }),
  brand: (brandUserId: string) => signToken({ kind: "brand", brandUserId, exp: exp() }),
  phone: (p: string) => signToken({ kind: "phone", phone: p, exp: exp() }),
};

export async function makeDistributor(data: Partial<Prisma.DistributorCreateInput> = {}) {
  const dist = await db.distributor.create({
    data: { name: `Distribyutor ${uid()}`, districts: ["Chilonzor"], categories: ["Ichimlik"], status: "ACTIVE", ...trialPeriod(), ...data },
  });
  const group = await db.priceGroup.create({ data: { distributorId: dist.id, name: "Oddiy", isDefault: true } });
  return { ...dist, defaultGroupId: group.id };
}

export async function makeProduct(distributorId: string, priceGroupId: string, data: Partial<Prisma.ProductUncheckedCreateInput> & { price?: number } = {}) {
  const { price = 1000, ...rest } = data;
  return db.product.create({
    data: { distributorId, sku: `SKU-${uid()}`, name: `Tovar ${uid()}`, brand: "Brend", category: "Ichimlik", ...rest, prices: { create: { priceGroupId, price } } },
  });
}

export async function makeStaff(distributorId: string, role: StaffRole) {
  const staff = await db.staff.create({ data: { distributorId, name: `${role} ${uid()}`, phone: phone(), role } });
  return { ...staff, token: tokens.staff(staff.id) };
}

export async function makeShop(data: Partial<Prisma.ShopCreateInput> = {}) {
  const shop = await db.shop.create({
    data: {
      name: `Do'kon ${uid()}`,
      address: "Bunyodkor ko'chasi 1",
      district: "Chilonzor",
      confirmedAt: new Date(),
      ...trialPeriod(),
      ...data,
      users: { create: { name: "Ega", phone: phone(), role: "OWNER" } },
    },
    include: { users: true },
  });
  const owner = shop.users[0];
  return { ...shop, owner: { ...owner, token: tokens.shop(owner.id) } };
}

export async function makeLink(shopId: string, distributorId: string, data: Partial<Prisma.ShopLinkUncheckedCreateInput> = {}) {
  return db.shopLink.create({ data: { shopId, distributorId, status: "ACTIVE", creditLimit: 0, creditDays: 14, ...data }, include: { distributor: true } });
}

// Distribyutor, barcha rollardagi xodimlar, tovar va unga ulangan do'kon
export async function makeWorld(link: Partial<Prisma.ShopLinkUncheckedCreateInput> = {}) {
  const dist = await makeDistributor();
  const product = await makeProduct(dist.id, dist.defaultGroupId);
  const shop = await makeShop();
  const roles = ["ADMIN", "OPERATOR", "ACCOUNTANT", "AGENT", "COURIER"] as const;
  const [admin, operator, accountant, agent, courier] = await Promise.all(roles.map((r) => makeStaff(dist.id, r)));
  const shopLink = await makeLink(shop.id, dist.id, link);
  return { dist, product, shop, owner: shop.owner, link: shopLink, admin, operator, accountant, agent, courier };
}

export async function makeOrder(
  w: { link: { id: string }; product: { id: string } },
  data: { status?: Prisma.OrderCreateInput["status"]; paymentType?: PaymentType; qty?: number; price?: number; courierId?: string } = {},
) {
  const { qty = 10, price = 1000, paymentType = "CASH", status = "SENT", courierId } = data;
  return db.order.create({
    data: { shopLinkId: w.link.id, paymentType, status, total: qty * price, courierId, items: { create: { productId: w.product.id, qty, price } } },
    include: { items: true },
  });
}

export async function balanceOf(shopLinkId: string) {
  const agg = await db.ledgerEntry.aggregate({ where: { shopLinkId, status: "CONFIRMED" }, _sum: { amount: true } });
  return agg._sum.amount ?? 0;
}

// Route handler'ni chaqirish uchun so'rov
export function req(path: string, opts: { method?: string; token?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  return new Request(`http://test.local${path}`, {
    method: opts.method ?? (opts.body === undefined ? "GET" : "POST"),
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
}

export const ctx = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) });

// Parallel chaqiruvlar natijasi: nechtasi o'tdi va xatolar (status bilan)
export async function settle<T>(tasks: Promise<T>[]) {
  const results = await Promise.allSettled(tasks);
  const ok = results.filter((r): r is PromiseFulfilledResult<Awaited<T>> => r.status === "fulfilled").map((r) => r.value);
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => ({ status: (r.reason as { status?: number }).status, message: (r.reason as Error).message }));
  return { ok, errors };
}
