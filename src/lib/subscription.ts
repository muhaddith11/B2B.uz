import { Prisma } from "@prisma/client";
import { z } from "zod";
import { clickCheckoutUrl, paymeCheckoutUrl, paymeTestMode, publicUrl } from "./checkout";
import { db } from "./db";
import { L, type TextKey } from "./i18n";
import { formatDate } from "./money";
import { notifyShop, notifyStaff } from "./push";
import { HttpError } from "./session";
import { addMonths, DAY_MS } from "./time";

// Obuna: har bir distribyutor va do'kon (tashkilot) uchun; uning barcha xodimlari bitta obuna bilan ishlaydi.
// Qo'shilgan kundan 12 oy tekin, keyin oylik to'lov (narx so'mda, platforma admini belgilaydi).
// To'lanmasa 7 kun imtiyoz, keyin "faqat ko'rish": yangi buyurtma berish va qabul qilish yopiladi,
// boshlangan yetkazish, qarz daftari va to'lovlar ishlayveradi.
// To'lov saytda (/obuna) Payme yoki Click orqali platforma kassasiga; ilovada faqat holat ko'rinadi.

export const TRIAL_MONTHS = 12;
export const GRACE_DAYS = 7;
// Shuncha kun qolganda ilovada eslatma chiqadi
export const WARN_DAYS = 14;
export const MONTH_OPTIONS = [1, 3, 6, 12] as const;
export const DEFAULT_MONTHLY_PRICE = 100_000;
const PRICE_KEY = "subscription.monthlyPrice";

export type SubscriberKind = "distributor" | "shop";
export type Subscriber = { kind: SubscriberKind; id: string };
export type SubscriptionState = "ACTIVE" | "GRACE" | "EXPIRED";

export const EXPIRED_SHOP = "Obuna muddati tugagan: yangi buyurtma berib bo'lmaydi. Qarzlar va to'lovlar ishlayveradi";
export const EXPIRED_DISTRIBUTOR = "Obuna muddati tugagan: yangi buyurtma olib ham, qabul qilib ham bo'lmaydi. Boshlangan yetkazishlar va to'lovlar ishlayveradi";
export const DISTRIBUTOR_PAUSED = "Bu distribyutor hozir yangi buyurtma qabul qilmayapti";

// Yangi tashkilot uchun tekin davr
export function trialPeriod(now = new Date()) {
  const end = addMonths(now, TRIAL_MONTHS);
  return { trialEndsAt: end, paidUntil: end };
}

// Bitta raqam har yili yangi tashkilot ochib tekin davrni cheksiz cho'za olmasin: shu raqamning boshqa tashkiloti bo'lsa,
// yangisining tekin davri o'sha (eng eski) tashkilotniki bilan bir vaqtda tugaydi, lekin kamida MIN_EXTRA_TRIAL_MONTHS.
// Ikkinchi do'konni ochgan halol egaga ham bir oy bor: distribyutorlarga ulanib, ishni boshlab oladi
export const MIN_EXTRA_TRIAL_MONTHS = 1;
export function boundedTrial(existingTrialEnds: Date[], now = new Date()) {
  const full = trialPeriod(now);
  if (existingTrialEnds.length === 0) return full;
  const earliest = Math.min(...existingTrialEnds.map((d) => d.getTime()));
  const end = new Date(Math.min(full.trialEndsAt.getTime(), Math.max(earliest, addMonths(now, MIN_EXTRA_TRIAL_MONTHS).getTime())));
  return { trialEndsAt: end, paidUntil: end };
}

export function subscriptionState(paidUntil: Date, now = new Date()): SubscriptionState {
  if (now < paidUntil) return "ACTIVE";
  if (now.getTime() < paidUntil.getTime() + GRACE_DAYS * DAY_MS) return "GRACE";
  return "EXPIRED";
}

// Ilova va sayt uchun holat
export function subscriptionInfo(org: { paidUntil: Date; trialEndsAt: Date }, now = new Date()) {
  return {
    state: subscriptionState(org.paidUntil, now),
    paidUntil: org.paidUntil.toISOString(),
    // Hali bir marta ham to'lanmagan: tekin davr
    trial: org.paidUntil.getTime() <= org.trialEndsAt.getTime(),
    daysLeft: Math.ceil((org.paidUntil.getTime() - now.getTime()) / DAY_MS),
    // Shu vaqtdan keyin yangi buyurtmalar yopiladi
    blocksAt: new Date(org.paidUntil.getTime() + GRACE_DAYS * DAY_MS).toISOString(),
  };
}
export type SubscriptionInfo = ReturnType<typeof subscriptionInfo>;

// Sayt va admin sahifasi uchun bir qatorli holat
export function subscriptionLabel(info: SubscriptionInfo): string {
  if (info.state === "EXPIRED") return `Muddati tugagan (${formatDate(info.paidUntil)}): yangi buyurtmalar yopiq`;
  if (info.state === "GRACE") return `Muddati tugadi (${formatDate(info.paidUntil)}). ${formatDate(info.blocksAt)} dan yangi buyurtmalar yopiladi`;
  return `${info.trial ? "Tekin davr" : "To'langan"}: ${formatDate(info.paidUntil)} gacha`;
}

// Yangi buyurtma berish yoki qabul qilishdan oldin: imtiyoz muddati ham o'tgan bo'lsa 402
export function assertTrading(org: { paidUntil: Date }, message: TextKey, now = new Date()) {
  if (subscriptionState(org.paidUntil, now) === "EXPIRED") throw new HttpError(402, message);
}

// Uzaytirish: muddat hali o'tmagan bo'lsa oxiridan, o'tgan bo'lsa bugundan boshlab
export function extendedUntil(paidUntil: Date, months: number, now = new Date()): Date {
  return addMonths(paidUntil > now ? paidUntil : now, months);
}

// Muddatni qulf ostida o'zgartiradi: bir vaqtdagi ikki to'lov bir-birining uzaytirishini yo'qotmaydi
async function updatePaidUntil(tx: Prisma.TransactionClient, who: Subscriber, next: (current: Date) => Date) {
  const table = Prisma.raw(who.kind === "distributor" ? `"Distributor"` : `"Shop"`);
  const [row] = await tx.$queryRaw<{ paidUntil: Date }[]>`SELECT "paidUntil" FROM ${table} WHERE id = ${who.id} FOR UPDATE`;
  if (!row) throw new HttpError(404, "Tashkilot topilmadi");
  const paidUntil = next(row.paidUntil);
  if (who.kind === "distributor") await tx.distributor.update({ where: { id: who.id }, data: { paidUntil } });
  else await tx.shop.update({ where: { id: who.id }, data: { paidUntil } });
  return paidUntil;
}

export function extendSubscription(tx: Prisma.TransactionClient, who: Subscriber, months: number, now = new Date()) {
  return updatePaidUntil(tx, who, (current) => extendedUntil(current, months, now));
}

// To'lov tizimi bajarilgan obuna to'lovini bekor qilsa: uzaytirilgan oylar qaytariladi
export function shortenSubscription(tx: Prisma.TransactionClient, who: Subscriber, months: number) {
  return updatePaidUntil(tx, who, (current) => addMonths(current, -months));
}

// Platforma admini: bank o'tkazmasi kabi saytdan tashqari to'lov uchun qo'lda uzaytirish
export async function extendManually(who: Subscriber, months: number, actor: string) {
  return db.$transaction(async (tx) => {
    const paidUntil = await extendSubscription(tx, who, months);
    await tx.auditLog.create({ data: { actor, action: "subscription.manual", entity: who.kind, entityId: who.id, after: { months, paidUntil } } });
    return paidUntil;
  });
}

export function subscriberOf(p: { subscriberDistributorId: string | null; subscriberShopId: string | null }): Subscriber {
  if (p.subscriberDistributorId) return { kind: "distributor", id: p.subscriberDistributorId };
  if (p.subscriberShopId) return { kind: "shop", id: p.subscriberShopId };
  throw new Error("Obuna to'lovida tashkilot yo'q");
}

// ---- Narx ----

export async function monthlyPrice(): Promise<number> {
  const row = await db.platformSetting.findUnique({ where: { key: PRICE_KEY } });
  const price = Number(row?.value);
  return Number.isInteger(price) && price > 0 ? price : DEFAULT_MONTHLY_PRICE;
}

export async function setMonthlyPrice(price: number, actor: string) {
  if (!Number.isInteger(price) || price < 1_000 || price > 100_000_000) throw new HttpError(400, "Narx 1 000 so'mdan 100 000 000 so'mgacha bo'lsin");
  await db.$transaction([
    db.platformSetting.upsert({ where: { key: PRICE_KEY }, create: { key: PRICE_KEY, value: String(price) }, update: { value: String(price) } }),
    db.auditLog.create({ data: { actor, action: "subscription.price", entity: "PlatformSetting", entityId: PRICE_KEY, after: { price } } }),
  ]);
}

// ---- Platforma kassalari (env) ----

export function platformPayme() {
  const merchantId = process.env.PLATFORM_PAYME_MERCHANT_ID;
  const key = process.env.PLATFORM_PAYME_KEY;
  return merchantId && key ? { merchantId, key } : null;
}

export function platformClick() {
  const serviceId = process.env.PLATFORM_CLICK_SERVICE_ID;
  const merchantId = process.env.PLATFORM_CLICK_MERCHANT_ID;
  const secretKey = process.env.PLATFORM_CLICK_SECRET_KEY;
  return serviceId && merchantId && secretKey ? { serviceId, merchantId, secretKey } : null;
}

// ---- Saytda to'lash (/obuna) ----

// Raqam egasi to'lay oladigan tashkilotlar: distribyutor admini va do'kon egasi
export async function payableOrgs(phone: string, now = new Date()) {
  const [admins, owners] = await Promise.all([
    db.staff.findMany({ where: { phone, active: true, role: "ADMIN" }, include: { distributor: true }, orderBy: { createdAt: "asc" } }),
    db.shopUser.findMany({ where: { phone, role: "OWNER" }, include: { shop: true }, orderBy: { createdAt: "asc" } }),
  ]);
  return [
    ...admins.map((s) => ({ kind: "distributor" as const, id: s.distributor.id, name: s.distributor.name, ...subscriptionInfo(s.distributor, now) })),
    ...owners.map((u) => ({ kind: "shop" as const, id: u.shop.id, name: u.shop.name, ...subscriptionInfo(u.shop, now) })),
  ];
}

export const subscriptionPaymentInput = z.object({
  kind: z.enum(["distributor", "shop"]),
  id: z.string().min(1),
  months: z.coerce.number().refine((m): m is (typeof MONTH_OPTIONS)[number] => (MONTH_OPTIONS as readonly number[]).includes(m)),
  provider: z.enum(["PAYME", "CLICK"]),
});

export async function createSubscriptionPayment(phone: string, input: z.infer<typeof subscriptionPaymentInput>) {
  const orgs = await payableOrgs(phone);
  if (!orgs.some((o) => o.kind === input.kind && o.id === input.id)) throw new HttpError(403, "Bu tashkilot uchun to'lay olmaysiz");
  const payme = platformPayme();
  const click = platformClick();
  if ((input.provider === "PAYME" && !payme) || (input.provider === "CLICK" && !click)) {
    throw new HttpError(400, L("{provider} orqali to'lov hozircha ulanmagan", { provider: input.provider === "PAYME" ? "Payme" : "Click" }));
  }
  const amount = (await monthlyPrice()) * input.months;
  const payment = await db.onlinePayment.create({
    data: {
      purpose: "SUBSCRIPTION",
      provider: input.provider,
      amount,
      months: input.months,
      ...(input.kind === "distributor" ? { subscriberDistributorId: input.id } : { subscriberShopId: input.id }),
    },
  });
  const returnUrl = `${publicUrl()}/obuna?qaytdi=1`;
  const url = payme && input.provider === "PAYME" ? paymeCheckoutUrl(payme.merchantId, payment.id, amount, returnUrl, paymeTestMode()) : clickCheckoutUrl(click!.serviceId, click!.merchantId, payment.id, amount, returnUrl);
  return { id: payment.id, url };
}

// To'lov tasdiqlangach tashkilotdagi kerakli odamlarga xabar
export async function notifySubscriptionPaid(who: Subscriber) {
  const org = who.kind === "distributor" ? await db.distributor.findUnique({ where: { id: who.id } }) : await db.shop.findUnique({ where: { id: who.id } });
  if (!org) return;
  const msg = { title: "Obuna to'landi", body: L("{date} gacha", { date: formatDate(org.paidUntil) }), data: { url: who.kind === "distributor" ? "/staff/more" : "/" } };
  if (who.kind === "distributor") notifyStaff(who.id, ["ADMIN"], msg);
  else notifyShop(who.id, msg);
}
