import { afterEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { issueOtp, MAX_ATTEMPTS, MAX_PER_IP_HOUR, verifyOtp } from "./otp";
import { makeShop, phone, settle, uid } from "@/test/factory";

const ip = () => `10.${uid()}`;

describe("SMS kod", () => {
  afterEach(() => {
    process.env.OTP_HOURLY_LIMIT = "1000000";
  });

  it("to'g'ri kod bir marta ishlaydi", async () => {
    const p = phone();
    const code = await issueOtp(p, ip());
    await expect(verifyOtp(p, code)).resolves.toBeUndefined();
    await expect(verifyOtp(p, code)).rejects.toMatchObject({ status: 400 });
  });

  it("noto'g'ri urinishlar sanaladi va chegaradan keyin to'g'ri kod ham o'tmaydi", async () => {
    const p = phone();
    const code = await issueOtp(p, ip());
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < MAX_ATTEMPTS; i++) await expect(verifyOtp(p, wrong)).rejects.toMatchObject({ status: 400 });
    await expect(verifyOtp(p, code)).rejects.toMatchObject({ status: 429 });
  });

  it("bir vaqtda yuborilgan ko'p noto'g'ri urinish ham chegaradan oshmaydi", async () => {
    const p = phone();
    const code = await issueOtp(p, ip());
    const wrong = code === "000000" ? "111111" : "000000";
    const r = await settle(Array.from({ length: 40 }, () => verifyOtp(p, wrong)));
    // Faqat MAX_ATTEMPTS ta urinish kodni tekshira oldi, qolgani darhol 429
    expect(r.errors.filter((e) => e.status === 400)).toHaveLength(MAX_ATTEMPTS);
    expect(r.errors.filter((e) => e.status === 429)).toHaveLength(40 - MAX_ATTEMPTS);
    await expect(verifyOtp(p, code)).rejects.toMatchObject({ status: 429 });
  });

  it("muddati o'tgan kod ishlamaydi", async () => {
    const p = phone();
    const code = await issueOtp(p, ip(), new Date(Date.now() - 10 * 60 * 1000));
    await expect(verifyOtp(p, code)).rejects.toMatchObject({ status: 400, message: expect.stringContaining("eskirgan") });
  });

  it("bir daqiqa ichida qayta kod berilmaydi, parallel so'rovlardan faqat bittasi o'tadi", async () => {
    const p = phone();
    const r = await settle([1, 2, 3, 4, 5].map(() => issueOtp(p, ip())));
    expect(r.ok).toHaveLength(1);
    expect(r.errors.every((e) => e.status === 429 && /60 soniya/.test(e.message))).toBe(true);
  });

  it("bitta IP'dan soatiga cheklangan miqdorda", async () => {
    const shared = ip();
    const r = await settle(Array.from({ length: MAX_PER_IP_HOUR + 3 }, () => issueOtp(phone(), shared)));
    expect(r.ok).toHaveLength(MAX_PER_IP_HOUR);
    expect(r.errors).toHaveLength(3);
    expect(await db.otpCode.count({ where: { ip: shared } })).toBe(MAX_PER_IP_HOUR);
  });

  it("butun platforma bo'yicha soatlik chegara (hisobi yo'q raqamlarga)", async () => {
    const lastHour = await db.otpCode.count({ where: { newPhone: true, createdAt: { gt: new Date(Date.now() - 3600_000) } } });
    process.env.OTP_HOURLY_LIMIT = String(lastHour + 2);
    const r = await settle([1, 2, 3, 4].map(() => issueOtp(phone(), ip())));
    expect(r.ok).toHaveLength(2);
    expect(r.errors.every((e) => e.status === 429)).toBe(true);
  });

  it("umumiy chegara to'lgan bo'lsa ham hisobi bor raqam kod oladi (hujum foydalanuvchilarni kirishdan to'xtatmaydi)", async () => {
    const shop = await makeShop();
    const lastHour = await db.otpCode.count({ where: { newPhone: true, createdAt: { gt: new Date(Date.now() - 3600_000) } } });
    process.env.OTP_HOURLY_LIMIT = String(lastHour);
    await expect(issueOtp(phone(), ip())).rejects.toMatchObject({ status: 429 });
    await expect(issueOtp(shop.owner.phone, ip())).resolves.toMatch(/^\d{6}$/);
    expect((await db.otpCode.findFirstOrThrow({ where: { phone: shop.owner.phone } })).newPhone).toBe(false);
  });
});
