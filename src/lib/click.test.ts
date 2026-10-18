import { describe, expect, it } from "vitest";
import { clickSign, signMatches } from "./click";

describe("Click imzosi", () => {
  const p = { click_trans_id: "1", service_id: "2", merchant_trans_id: "3", amount: "1000", action: "0", sign_time: "2026-10-18 10:00:00" };
  const sign = clickSign(p, "maxfiy", "prepare");

  it("to'g'ri imzo (katta-kichik harfdan qat'i nazar) o'tadi, boshqasi o'tmaydi", () => {
    expect(signMatches(sign, sign)).toBe(true);
    expect(signMatches(sign.toUpperCase(), sign)).toBe(true);
    expect(signMatches(sign.slice(0, -1) + (sign.endsWith("0") ? "1" : "0"), sign)).toBe(false);
    expect(signMatches(sign.slice(0, 10), sign)).toBe(false);
    expect(signMatches(undefined, sign)).toBe(false);
    expect(signMatches("", sign)).toBe(false);
  });

  it("summa yoki kalit o'zgarsa imzo boshqa", () => {
    expect(clickSign({ ...p, amount: "1" }, "maxfiy", "prepare")).not.toBe(sign);
    expect(clickSign(p, "boshqa", "prepare")).not.toBe(sign);
  });
});
