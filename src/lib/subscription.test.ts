import { describe, expect, it } from "vitest";
import { boundedTrial, extendedUntil, GRACE_DAYS, MIN_EXTRA_TRIAL_MONTHS, subscriptionInfo, subscriptionLabel, subscriptionState, trialPeriod } from "./subscription";
import { addMonths } from "./time";

const now = new Date("2026-10-14T10:00:00Z");
const daysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 3600 * 1000);

describe("obuna holati", () => {
  it("muddat ichida faol, keyin 7 kun imtiyoz, keyin yopiq", () => {
    expect(subscriptionState(daysFromNow(1), now)).toBe("ACTIVE");
    expect(subscriptionState(daysFromNow(-1), now)).toBe("GRACE");
    expect(subscriptionState(daysFromNow(-GRACE_DAYS + 0.01), now)).toBe("GRACE");
    expect(subscriptionState(daysFromNow(-GRACE_DAYS), now)).toBe("EXPIRED");
  });

  it("yangi tashkilotga 12 oy tekin; tekin davr belgisi to'lovdan keyin yo'qoladi", () => {
    const trial = trialPeriod(now);
    expect(trial.paidUntil.toISOString()).toBe("2027-10-14T10:00:00.000Z");
    expect(subscriptionInfo(trial, now)).toMatchObject({ state: "ACTIVE", trial: true, daysLeft: 365 });
    const paid = { ...trial, paidUntil: extendedUntil(trial.paidUntil, 1, now) };
    expect(subscriptionInfo(paid, now).trial).toBe(false);
  });

  it("uzaytirish: muddat o'tmagan bo'lsa oxiridan, o'tgan bo'lsa bugundan", () => {
    expect(extendedUntil(new Date("2026-12-01T00:00:00Z"), 3, now).toISOString()).toBe("2027-03-01T00:00:00.000Z");
    expect(extendedUntil(new Date("2026-09-01T00:00:00Z"), 1, now).toISOString()).toBe("2026-11-14T10:00:00.000Z");
  });

  it("matnli holat", () => {
    expect(subscriptionLabel(subscriptionInfo(trialPeriod(now), now))).toBe("Tekin davr: 14.10.2027 gacha");
    const expired = { trialEndsAt: daysFromNow(-30), paidUntil: daysFromNow(-30) };
    expect(subscriptionLabel(subscriptionInfo(expired, now))).toContain("yangi buyurtmalar yopiq");
  });
});

describe("takroriy tashkilotning tekin davri", () => {
  const now = new Date("2026-10-18T00:00:00Z");
  it("raqamda boshqa tashkilot bo'lmasa: to'liq 12 oy", () => {
    expect(boundedTrial([], now)).toEqual(trialPeriod(now));
  });
  it("bor bo'lsa: eng eskisi bilan birga tugaydi, lekin kamida 1 oy", () => {
    const first = new Date("2027-04-18T00:00:00Z");
    expect(boundedTrial([first, new Date("2027-09-01T00:00:00Z")], now).trialEndsAt).toEqual(first);
    expect(boundedTrial([new Date("2026-10-20T00:00:00Z")], now).trialEndsAt).toEqual(addMonths(now, MIN_EXTRA_TRIAL_MONTHS));
    expect(boundedTrial([new Date("2025-01-01T00:00:00Z")], now).paidUntil).toEqual(addMonths(now, MIN_EXTRA_TRIAL_MONTHS));
  });
});
