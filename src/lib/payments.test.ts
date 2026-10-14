import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { clickSign } from "./click";
import { decryptSecret, encryptSecret } from "./crypto";
import { clickCheckoutUrl, paymeCheckoutUrl } from "./checkout";
import { checkPaymeAuth, PAYME_TIMEOUT_MS, paymeTimedOut } from "./payme";

beforeAll(() => {
  process.env.SESSION_SECRET ??= "test-secret-test-secret-test-secret-123";
});

describe("encryptSecret", () => {
  it("shifrlangan kalitni qaytarib ochadi va har safar boshqacha shifrlaydi", () => {
    const a = encryptSecret("payme-kalit");
    const b = encryptSecret("payme-kalit");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("payme-kalit");
  });
  it("o'zgartirilgan shifrni rad etadi", () => {
    const buf = Buffer.from(encryptSecret("kalit"), "base64");
    buf[buf.length - 1] ^= 1;
    expect(() => decryptSecret(buf.toString("base64"))).toThrow();
  });
});

describe("checkPaymeAuth", () => {
  const header = (s: string) => `Basic ${Buffer.from(s).toString("base64")}`;
  it("to'g'ri kalitni qabul qiladi", () => {
    expect(checkPaymeAuth(header("Paycom:abc123"), "abc123")).toBe(true);
  });
  it("noto'g'ri kalit, sarlavhasiz va buzilgan sarlavhani rad etadi", () => {
    expect(checkPaymeAuth(header("Paycom:xyz"), "abc123")).toBe(false);
    expect(checkPaymeAuth(null, "abc123")).toBe(false);
    expect(checkPaymeAuth("Bearer abc", "abc123")).toBe(false);
    expect(checkPaymeAuth(header("abc123"), "abc123")).toBe(false);
  });
});

describe("paymeTimedOut", () => {
  it("12 soatdan keyin tranzaksiya eskiradi", () => {
    const created = 1_000_000;
    expect(paymeTimedOut(created, created + PAYME_TIMEOUT_MS)).toBe(false);
    expect(paymeTimedOut(BigInt(created), created + PAYME_TIMEOUT_MS + 1)).toBe(true);
  });
});

describe("checkout havolalari", () => {
  it("Payme: summa tiyinda, parametrlar base64", () => {
    const url = paymeCheckoutUrl("m1", "p1", 50_000, "https://x.uz/pay/done");
    const decoded = Buffer.from(url.replace("https://checkout.paycom.uz/", ""), "base64").toString();
    expect(decoded).toBe("m=m1;ac.order_id=p1;a=5000000;c=https://x.uz/pay/done");
    expect(paymeCheckoutUrl("m1", "p1", 1, "r", true)).toMatch(/^https:\/\/checkout\.test\.paycom\.uz\//);
  });
  it("Click: summa so'mda", () => {
    const url = new URL(clickCheckoutUrl("s1", "m1", "p1", 50_000, "https://x.uz/pay/done"));
    expect(Object.fromEntries(url.searchParams)).toEqual({ service_id: "s1", merchant_id: "m1", amount: "50000", transaction_param: "p1", return_url: "https://x.uz/pay/done" });
  });
});

describe("clickSign", () => {
  const p = { click_trans_id: "123", service_id: "77", merchant_trans_id: "pay1", merchant_prepare_id: "5", amount: "1000.00", action: "0", sign_time: "2026-10-12 10:00:00" };
  it("prepare imzosi hujjatdagi tartibda", () => {
    const expected = createHash("md5").update("12377SECRETpay11000.0002026-10-12 10:00:00").digest("hex");
    expect(clickSign(p, "SECRET", "prepare")).toBe(expected);
  });
  it("complete imzosiga merchant_prepare_id qo'shiladi", () => {
    const expected = createHash("md5").update("12377SECRETpay151000.0012026-10-12 10:00:00").digest("hex");
    expect(clickSign({ ...p, action: "1" }, "SECRET", "complete")).toBe(expected);
  });
});
