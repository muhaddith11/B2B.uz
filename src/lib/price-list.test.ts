import { describe, expect, it } from "vitest";
import { diffPriceList, normalizeHeader, parseAmount, parsePriceList } from "./price-list";

const header = ["Artikul", "Nomi", "Brend", "Toifa", "O'lchov birligi", "Yashikda nechta", "Narx, so'm", "Shtrix-kod", "Qoldiq", "Katta do'kon"];

describe("normalizeHeader", () => {
  it("apostrof va bo'shliqlarni olib tashlaydi", () => {
    expect(normalizeHeader("O‘lchov  birligi")).toBe("olchovbirligi");
    expect(normalizeHeader("Narx, so'm")).toBe("narxsom");
  });
});

describe("parseAmount", () => {
  it("bo'shliqli summalarni o'qiydi", () => {
    expect(parseAmount("9 800")).toBe(9800);
    expect(parseAmount("9 800")).toBe(9800);
    expect(parseAmount(9800.4)).toBe(9800);
    expect(parseAmount("abc")).toBeNull();
  });
});

describe("parsePriceList", () => {
  it("to'g'ri qatorni o'qiydi va qo'shimcha narx guruhini oladi", () => {
    const { items, errors } = parsePriceList(
      header,
      [["GI-1", "Ichimlik 1,5 l", "Salqin", "Ichimliklar", "dona", "6", "9 800", "4780000000017", "bor", "9 500"]],
      ["Oddiy", "Katta do'kon"],
    );
    expect(errors).toEqual([]);
    expect(items[0]).toMatchObject({ sku: "GI-1", packSize: 6, price: 9800, inStock: true, minOrderPacks: 1, extraPrices: { "Katta do'kon": 9500 } });
  });

  it("3 turdagi xatoni topadi: bo'sh majburiy ustun, takror artikul, noto'g'ri narx", () => {
    const { items, errors } = parsePriceList(
      header,
      [
        ["A-1", "Tovar", "B", "T", "dona", "6", "1000", "", "", ""],
        ["A-1", "Tovar 2", "B", "T", "dona", "6", "1000", "", "", ""],
        ["A-2", "", "B", "T", "dona", "6", "1000", "", "", ""],
        ["A-3", "Tovar 3", "B", "T", "dona", "6", "0", "", "", ""],
        ["", "", "", "", "", "", "", "", "", ""],
      ],
      [],
    );
    expect(items.map((i) => i.sku)).toEqual(["A-1"]);
    expect(errors.map((e) => e.row)).toEqual([3, 4, 5]);
  });

  it("majburiy ustun bo'lmasa butun faylni rad etadi", () => {
    const { errors } = parsePriceList(["Artikul", "Nomi"], [["A", "B"]], []);
    expect(errors[0].message).toContain("Majburiy ustun yo'q");
  });

  it("qoldiqni yo'q va son ko'rinishida tushunadi", () => {
    const { items } = parsePriceList(
      header,
      [
        ["A-1", "T", "B", "T", "dona", "6", "1000", "", "yo'q", ""],
        ["A-2", "T", "B", "T", "dona", "6", "1000", "", "0", ""],
        ["A-3", "T", "B", "T", "dona", "6", "1000", "", "120", ""],
      ],
      [],
    );
    expect(items.map((i) => i.inStock)).toEqual([false, false, true]);
  });
});

describe("diffPriceList", () => {
  it("yangi, narxi o'zgargan va yo'qolgan tovarlarni ajratadi", () => {
    const { items } = parsePriceList(
      header,
      [
        ["A-1", "T1", "B", "T", "dona", "6", "1100", "", "", ""],
        ["A-3", "T3", "B", "T", "dona", "6", "500", "", "", ""],
      ],
      [],
    );
    const diff = diffPriceList(
      [
        { sku: "A-1", name: "T1", price: 1000, active: true },
        { sku: "A-2", name: "T2", price: 700, active: true },
      ],
      items,
    );
    expect(diff.added.map((i) => i.sku)).toEqual(["A-3"]);
    expect(diff.priceChanged).toEqual([{ sku: "A-1", name: "T1", oldPrice: 1000, newPrice: 1100 }]);
    expect(diff.removed.map((p) => p.sku)).toEqual(["A-2"]);
  });
});
