import { describe, expect, it } from "vitest";
import { canMoveBrandOrder, purchasePrice } from "./brands";
import { canTransition, deliveredLines } from "./orders";

describe("deliveredLines", () => {
  const items = [
    { id: "a", qty: 12, price: 1000 },
    { id: "b", qty: 6, price: 2500 },
  ];
  it("ko'rsatilmagan qator to'liq topshirilgan hisoblanadi", () => {
    expect(deliveredLines(items)).toEqual({
      lines: [
        { id: "a", deliveredQty: 12, sum: 12_000 },
        { id: "b", deliveredQty: 6, sum: 15_000 },
      ],
      total: 27_000,
    });
  });
  it("qisman topshirishda summa topshirilgan miqdor bo'yicha", () => {
    expect(deliveredLines(items, [{ itemId: "b", deliveredQty: 0 }]).total).toBe(12_000);
  });
  it("buyurtmadagidan ko'p yoki begona qatorni rad etadi", () => {
    expect(() => deliveredLines(items, [{ itemId: "a", deliveredQty: 13 }])).toThrow();
    expect(() => deliveredLines(items, [{ itemId: "x", deliveredQty: 1 }])).toThrow();
  });
});

describe("canTransition", () => {
  it("topshirilgan buyurtma boshqa holatga o'tmaydi", () => {
    expect(canTransition("SENT", "ACCEPTED")).toBe(true);
    expect(canTransition("IN_DELIVERY", "DELIVERED")).toBe(true);
    expect(canTransition("DELIVERED", "CANCELLED")).toBe(false);
    expect(canTransition("IN_DELIVERY", "CANCELLED")).toBe(false);
  });
});

describe("purchasePrice", () => {
  it("chegirmani qo'llab, so'mga yaxlitlaydi", () => {
    expect(purchasePrice(10_000, 0)).toBe(10_000);
    expect(purchasePrice(10_000, 15)).toBe(8_500);
    expect(purchasePrice(9_999, 7)).toBe(9_299);
  });
});

describe("canMoveBrandOrder", () => {
  it("har bir tomon faqat o'z amalini bajaradi", () => {
    expect(canMoveBrandOrder("SENT", "ACCEPTED", "BRAND")).toBe(true);
    expect(canMoveBrandOrder("SENT", "ACCEPTED", "DISTRIBUTOR")).toBe(false);
    expect(canMoveBrandOrder("SENT", "CANCELLED", "DISTRIBUTOR")).toBe(true);
    expect(canMoveBrandOrder("ACCEPTED", "SHIPPED", "BRAND")).toBe(true);
    expect(canMoveBrandOrder("SHIPPED", "DELIVERED", "DISTRIBUTOR")).toBe(true);
    expect(canMoveBrandOrder("SHIPPED", "DELIVERED", "BRAND")).toBe(false);
  });
});
