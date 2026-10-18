import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decryptSecret, encryptSecret, isLegacySecret } from "./crypto";

const SESSION = "sessiya-kaliti-0123456789abcdef0123456789";
const PAYMENT = "tolov-kaliti-0123456789abcdef0123456789ab";

describe("to'lov kalitlarini shifrlash", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", SESSION);
    vi.stubEnv("SESSION_SECRET_PREVIOUS", "");
    vi.stubEnv("PAYMENT_KEYS_SECRET", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("PAYMENT_KEYS_SECRET bo'lmasa eski formatda shifrlaydi va ochadi", () => {
    const enc = encryptSecret("payme-kalit");
    expect(isLegacySecret(enc)).toBe(true);
    expect(decryptSecret(enc)).toBe("payme-kalit");
    expect(encryptSecret("payme-kalit")).not.toBe(enc); // har safar yangi IV
  });

  it("PAYMENT_KEYS_SECRET bilan v2: SESSION_SECRET almashsa ham kalit ochiladi", () => {
    vi.stubEnv("PAYMENT_KEYS_SECRET", PAYMENT);
    const enc = encryptSecret("click-kalit");
    expect(enc.startsWith("v2:")).toBe(true);
    vi.stubEnv("SESSION_SECRET", "butunlay-boshqa-kalit-0123456789abcdef");
    expect(decryptSecret(enc)).toBe("click-kalit");
  });

  it("eski format: v2 yoqilgandan keyin ham va SESSION_SECRET almashtirish davrida (PREVIOUS) ochiladi", () => {
    const legacy = encryptSecret("eski");
    vi.stubEnv("PAYMENT_KEYS_SECRET", PAYMENT);
    expect(decryptSecret(legacy)).toBe("eski");
    vi.stubEnv("SESSION_SECRET", "yangi-sessiya-kaliti-0123456789abcdef");
    expect(() => decryptSecret(legacy)).toThrow(/ochilmadi/);
    vi.stubEnv("SESSION_SECRET_PREVIOUS", SESSION);
    expect(decryptSecret(legacy)).toBe("eski");
  });

  it("buzilgan shifr va kalitsiz v2 ochilmaydi", () => {
    vi.stubEnv("PAYMENT_KEYS_SECRET", PAYMENT);
    const enc = encryptSecret("x");
    const tampered = `v2:${Buffer.from(Buffer.from(enc.slice(3), "base64").map((b, i) => (i === 28 ? b ^ 1 : b))).toString("base64")}`;
    expect(() => decryptSecret(tampered)).toThrow();
    vi.stubEnv("PAYMENT_KEYS_SECRET", "");
    expect(() => decryptSecret(enc)).toThrow(/PAYMENT_KEYS_SECRET/);
  });
});
