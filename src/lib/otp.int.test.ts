import { afterEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { issueOtp, MAX_ATTEMPTS, MAX_PER_IP_HOUR, verifyOtp } from "./otp";
import { makeDistributor, makeShop, makeStaff, phone, settle, uid } from "@/test/factory";

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

  it("hisobi yo'q raqamlar uchun umumiy soatlik chegara; hisobi bor raqamlar chegara to'lganda ham kod oladi", async () => {
    const lastHour = await db.otpCode.count({ where: { knownPhone: false, createdAt: { gt: new Date(Date.now() - 3600_000) } } });
    process.env.OTP_HOURLY_LIMIT = String(lastHour + 2);
    await issueOtp(phone(), ip());
    await issueOtp(phone(), ip());
    await expect(issueOtp(phone(), ip())).rejects.toMatchObject({ status: 429 });
    // Hujumchi tasodifiy raqamlarga kod so'rab chegarani to'ldirdi: mavjud do'kon egasi va xodim baribir kiradi
    const shop = await makeShop();
    await expect(issueOtp(shop.owner.phone, ip())).resolves.toMatch(/^\d{6}$/);
    const dist = await makeDistributor();
    const staff = await makeStaff(dist.id, "AGENT");
    await expect(issueOtp(staff.phone, ip())).resolves.toMatch(/^\d{6}$/);
    expect(await db.otpCode.findFirst({ where: { phone: shop.owner.phone }, select: { knownPhone: true } })).toEqual({ knownPhone: true });
  });

  it("bir raqamga parallel so'rovlar navbat bilan: bir daqiqada faqat bitta kod", async () => {
    const p = phone();
    const r = await settle([1, 2, 3, 4].map(() => issueOtp(p, ip())));
    expect(r.ok).toHaveLength(1);
    expect(r.errors.every((e) => e.status === 429)).toBe(true);
  });
});
