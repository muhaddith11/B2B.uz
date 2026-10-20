import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "./db";
import { reminderText, sendSubscriptionReminders } from "./reminders";
import { sendSms } from "./sms";
import { makeDistributor, makeShop, makeStaff, phone } from "@/test/factory";
import * as cronRoute from "@/app/api/cron/subscription-reminders/route";

// SMS yuborilmaydi, faqat yoziladi
vi.mock("./sms", async (original) => ({ ...(await original<typeof import("./sms")>()), sendSms: vi.fn(async () => {}) }));
const sent = vi.mocked(sendSms);

const DAY = 24 * 3600 * 1000;
const inDays = (d: number) => new Date(Date.now() + d * DAY);
// Test bazasida boshqa testlarning tashkilotlari ham bor: faqat shu testdagi raqamlarga ketganlari olinadi
const to = (phone: string) => sent.mock.calls.filter(([p]) => p === phone).map(([, text]) => text);

beforeEach(() => sent.mockClear());
afterEach(() => vi.unstubAllEnvs());

describe("obuna eslatmasi SMS", () => {
  it("distribyutor adminiga muddat tugashidan oldin bir marta; to'lab uzaytirsa, keyingi muddatda yana", async () => {
    const dist = await makeDistributor({ paidUntil: inDays(10) });
    const admin = await makeStaff(dist.id, "ADMIN");
    const agent = await makeStaff(dist.id, "AGENT");

    await sendSubscriptionReminders();
    expect(to(admin.phone)).toEqual([reminderText("SOON", dist)]);
    expect(to(agent.phone)).toEqual([]);

    // Ertasi kuni ham shu bosqich: qayta yuborilmaydi
    sent.mockClear();
    await sendSubscriptionReminders(inDays(1));
    expect(to(admin.phone)).toEqual([]);

    // To'ladi, yangi muddat ham oxiriga yaqinlashdi: yangi muddat uchun yana eslatiladi
    const renewed = await db.distributor.update({ where: { id: dist.id }, data: { paidUntil: inDays(5) } });
    await sendSubscriptionReminders();
    expect(to(admin.phone)).toEqual([reminderText("SOON", renewed)]);
  });

  it("do'kon egasiga imtiyoz davrida va yopilgach; sotuvchiga va ancha oldin yopilganga yo'q", async () => {
    const shop = await makeShop({ paidUntil: inDays(-2) });
    const owner = await db.shopUser.findFirstOrThrow({ where: { shopId: shop.id, role: "OWNER" } });
    const seller = await db.shopUser.create({ data: { shopId: shop.id, name: "Sotuvchi", phone: phone(), role: "SELLER" } });
    const old = await makeShop({ paidUntil: inDays(-60) });
    const oldOwner = await db.shopUser.findFirstOrThrow({ where: { shopId: old.id } });

    await sendSubscriptionReminders();
    expect(to(owner.phone)).toEqual([reminderText("GRACE", shop)]);
    expect(to(seller.phone)).toEqual([]);
    expect(to(oldOwner.phone)).toEqual([]);

    // Imtiyoz ham tugadi
    sent.mockClear();
    await sendSubscriptionReminders(inDays(6));
    expect(to(owner.phone)).toEqual([reminderText("EXPIRED", shop)]);
  });

  it("tasdiqlanmagan distribyutorga va demo (tekshiruvchi) raqamiga yuborilmaydi", async () => {
    const pending = await makeDistributor({ status: "PENDING", paidUntil: inDays(3) });
    const pendingAdmin = await makeStaff(pending.id, "ADMIN");
    const review = await makeShop({ paidUntil: inDays(3) });
    const reviewOwner = await db.shopUser.findFirstOrThrow({ where: { shopId: review.id } });
    vi.stubEnv("REVIEW_PHONE", reviewOwner.phone);

    await sendSubscriptionReminders();
    expect(to(pendingAdmin.phone)).toEqual([]);
    expect(to(reviewOwner.phone)).toEqual([]);
  });

  it("SMS ketmasa (masalan, balans tugagan), ertasi kuni qayta urinadi", async () => {
    const shop = await makeShop({ paidUntil: inDays(7) });
    const owner = await db.shopUser.findFirstOrThrow({ where: { shopId: shop.id } });
    sent.mockImplementation(async (phone) => {
      if (phone === owner.phone) throw new Error("user funds are insufficient");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await sendSubscriptionReminders();
    expect(to(owner.phone)).toHaveLength(1);
    expect(await db.subscriptionReminder.count({ where: { orgId: shop.id } })).toBe(0);

    sent.mockImplementation(async () => {});
    sent.mockClear();
    await sendSubscriptionReminders(inDays(1));
    expect(to(owner.phone)).toEqual([reminderText("SOON", shop)]);
    expect(await db.subscriptionReminder.count({ where: { orgId: shop.id } })).toBe(1);
  });

  it("cron manzili faqat Vercel'ning maxfiy kaliti bilan ishlaydi", async () => {
    const call = (auth?: string) => cronRoute.GET(new Request("http://x/api/cron/subscription-reminders", { headers: auth ? { authorization: auth } : {} }));
    vi.stubEnv("CRON_SECRET", "");
    expect((await call("Bearer ")).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "cron-kalit");
    expect((await call()).status).toBe(401);
    expect((await call("Bearer boshqa")).status).toBe(401);
    const ok = await call("Bearer cron-kalit");
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ sent: expect.any(Number), failed: expect.any(Number) });
  });
});
