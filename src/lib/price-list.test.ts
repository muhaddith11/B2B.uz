import { describe, expect, it } from "vitest";
import { render, type Text } from "./i18n";
import { diffPriceList, normalizeHeader, parseAmount, parsePriceList } from "./price-list";

// Xato matni panel tilida: tekshiruv o'zbekcha va ruscha ko'rinishida
const uz = (t: Text) => render(t, "uz");

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

  it("rasm havolasi faqat internet manzili bo'ladi; bo'sh bo'lsa null (tovar rasmi o'zgarmaydi)", () => {
    const withImage = ["Artikul", "Nomi", "Brend", "Toifa", "O'lchov birligi", "Yashikda nechta", "Narx, so'm", "Rasm havolasi"];
    const { items, errors } = parsePriceList(
      withImage,
      [
        ["R-1", "Tovar", "B", "T", "dona", "6", "1000", "https://example.com/r.jpg"],
        ["R-2", "Tovar", "B", "T", "dona", "6", "1000", ""],
        ["R-3", "Tovar", "B", "T", "dona", "6", "1000", "javascript:alert(1)"],
      ],
      ["Oddiy"],
    );
    expect(items.map((i) => i.imageUrl)).toEqual(["https://example.com/r.jpg", null]);
    expect(errors.map((e) => ({ row: e.row, message: uz(e.message) }))).toEqual([{ row: 4, message: expect.stringContaining("Rasm havolasi") }]);
  });

  it("majburiy ustun bo'lmasa butun faylni rad etadi", () => {
    const { errors } = parsePriceList(["Artikul", "Nomi"], [["A", "B"]], []);
    expect(uz(errors[0].message)).toContain("Majburiy ustun yo'q");
    expect(render(errors[0].message, "ru")).toContain("Нет обязательного столбца: ");
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

describe("chegaralar", () => {
  const withImage = ["Artikul", "Nomi", "Brend", "Toifa", "O'lchov birligi", "Yashikda nechta", "Narx, so'm", "Rasm havolasi", "Ulgurji"];
  it("bazaga sig'maydigan son, uzun matn va http havola qator xatosi bo'ladi", () => {
    const { items, errors } = parsePriceList(
      withImage,
      [
        ["A-1", "T", "B", "T", "dona", "6", "5000000000", "", ""],
        ["A-2", "x".repeat(201), "B", "T", "dona", "6", "1000", "", ""],
        ["A-3", "T", "B", "T", "dona", "20000", "1000", "", ""],
        ["A-4", "T", "B", "T", "dona", "6", "1000", "http://example.com/r.jpg", ""],
        ["A-5", "T", "B", "T", "dona", "6", "1000", "", "999999999999"],
        ["A-6", "T", "B", "T", "dona", "6", "100000000", "https://example.com/r.jpg", "90000000"],
      ],
      ["Ulgurji"],
    );
    expect(errors.map((e) => e.row)).toEqual([2, 3, 4, 5, 6]);
    expect(uz(errors[0].message)).toContain("Narx juda katta");
    expect(uz(errors[1].message)).toContain("nomi ≤ 200");
    expect(render(errors[1].message, "ru")).toContain("Слишком длинный текст");
    expect(uz(errors[3].message)).toContain("https://");
    expect(uz(errors[4].message)).toContain("Ulgurji");
    expect(items).toEqual([expect.objectContaining({ sku: "A-6", price: 100_000_000, extraPrices: { Ulgurji: 90_000_000 } })]);
  });
});
