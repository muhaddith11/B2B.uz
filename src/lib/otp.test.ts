import { afterEach, describe, expect, it, vi } from "vitest";
import { clientIp, ipKey, otpSmsText, reviewCodeFor, sendAllowed } from "./otp";
import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("turli yozuvlarni +998XXXXXXXXX ko'rinishiga keltiradi", () => {
    expect(normalizePhone("+998 90 123-45-67")).toBe("+998901234567");
    expect(normalizePhone("998901234567")).toBe("+998901234567");
    expect(normalizePhone("(90) 123 45 67")).toBe("+998901234567");
  });
  it("noto'g'ri raqamni rad etadi", () => {
    expect(normalizePhone("+7 900 123 45 67")).toBeNull();
    expect(normalizePhone("12345")).toBeNull();
  });
});

describe("sendAllowed", () => {
  const now = new Date("2026-10-12T10:00:00Z");
  const ago = (sec: number) => new Date(now.getTime() - sec * 1000);

  it("birinchi kodga ruxsat beradi", () => {
    expect(sendAllowed([], now)).toEqual({ ok: true });
  });
  it("bir daqiqa ichida qayta yuborishni to'xtatadi", () => {
    expect(sendAllowed([ago(20)], now)).toEqual({ ok: false, retryInSec: 40 });
  });
  it("bir soatda 5 tadan ortiq kod yubormaydi", () => {
    const res = sendAllowed([ago(3000), ago(2400), ago(1800), ago(1200), ago(600)], now);
    expect(res).toEqual({ ok: false, retryInSec: 600 });
  });
  it("bir soatdan eski kodlarni hisobga olmaydi", () => {
    expect(sendAllowed([ago(4000), ago(3700), ago(120)], now)).toEqual({ ok: true });
  });
});

describe("reviewCodeFor", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("faqat REVIEW_PHONE uchun va kod 6 xonali bo'lsa ishlaydi", () => {
    vi.stubEnv("REVIEW_PHONE", "+998 99 000 00 01");
    vi.stubEnv("REVIEW_CODE", "246810");
    expect(reviewCodeFor("+998990000001")).toBe("246810");
    expect(reviewCodeFor("+998990000002")).toBeNull();
    vi.stubEnv("REVIEW_CODE", "12345");
    expect(reviewCodeFor("+998990000001")).toBeNull();
  });

  it("sozlanmagan bo'lsa hech kimga ishlamaydi", () => {
    vi.stubEnv("REVIEW_PHONE", "");
    vi.stubEnv("REVIEW_CODE", "246810");
    expect(reviewCodeFor("+998990000001")).toBeNull();
  });
});

describe("otpSmsText", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("hisobni o'chirish kodi alohida matn bilan (sozlangan bo'lsa), aks holda umumiy matn", () => {
    vi.stubEnv("OTP_SMS_TEXT", "");
    vi.stubEnv("OTP_DELETE_SMS_TEXT", "");
    expect(otpSmsText("123456", "delete")).toBe(otpSmsText("123456"));
    vi.stubEnv("OTP_DELETE_SMS_TEXT", "Captar: hisobni o'chirish kodi {code}");
    expect(otpSmsText("123456", "delete")).toBe("Captar: hisobni o'chirish kodi 123456");
    expect(otpSmsText("123456", "login")).toContain("kirish kodi 123456");
  });
});

describe("ipKey", () => {
  it("IPv4 o'zgarmaydi, IPv6 /64 tarmoqqa keltiriladi", () => {
    expect(ipKey("203.0.113.7")).toBe("203.0.113.7");
    expect(ipKey("::ffff:203.0.113.7")).toBe("203.0.113.7");
    expect(ipKey("2001:db8:aa:bb:1:2:3:4")).toBe("2001:db8:aa:bb::/64");
    // Bir abonentning /64 tarmog'idagi har xil manzillar bitta kalit: manzilni almashtirib cheklovni aylanib o'tib bo'lmaydi
    expect(ipKey("2001:db8:aa:bb::9")).toBe("2001:db8:aa:bb::/64");
    expect(ipKey("2001:0db8:00aa:00bb:ffff::1")).toBe("2001:db8:aa:bb::/64");
    expect(ipKey("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(ipKey("[2001:db8:aa:bb::1]")).toBe("2001:db8:aa:bb::/64");
    expect(ipKey("fe80::1%eth0")).toBe("fe80:0:0:0::/64");
    expect(ipKey("64:ff9b::203.0.113.7")).toBe("64:ff9b:0:0::/64");
  });

  it("so'rov sarlavhasidan oladi", () => {
    expect(clientIp(new Headers({ "x-real-ip": "2001:db8:aa:bb::5" }))).toBe("2001:db8:aa:bb::/64");
    expect(clientIp(new Headers({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" }))).toBe("198.51.100.1");
    expect(clientIp(new Headers())).toBeNull();
  });
});
