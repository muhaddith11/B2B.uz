import { describe, expect, it } from "vitest";
import { sendAllowed } from "./otp";
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
