import { describe, expect, it } from "vitest";
import { startOfTashkentDay, tashkentDayNumber } from "./time";

describe("startOfTashkentDay", () => {
  it("Toshkent yarim tunini qaytaradi (UTC bo'yicha oldingi kun 19:00)", () => {
    expect(startOfTashkentDay(new Date("2026-10-14T03:00:00Z")).toISOString()).toBe("2026-10-13T19:00:00.000Z");
  });
  it("UTC yarim tunidan oldin, lekin Toshkentda yangi kun boshlangan bo'lsa", () => {
    // UTC 20:00 = Toshkent 01:00, ertasi kun
    expect(startOfTashkentDay(new Date("2026-10-14T20:00:00Z")).toISOString()).toBe("2026-10-14T19:00:00.000Z");
  });
});

describe("tashkentDayNumber", () => {
  it("bir Toshkent kunidagi vaqtlar bir xil raqam oladi", () => {
    expect(tashkentDayNumber(new Date("2026-10-13T19:00:00Z"))).toBe(tashkentDayNumber(new Date("2026-10-14T18:59:59Z")));
    expect(tashkentDayNumber(new Date("2026-10-14T19:00:00Z")) - tashkentDayNumber(new Date("2026-10-14T18:59:59Z"))).toBe(1);
  });
});
