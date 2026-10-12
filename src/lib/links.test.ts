import { describe, expect, it } from "vitest";
import { brandStats, rankByDistrict } from "./links";

describe("rankByDistrict", () => {
  it("do'kon hududiga yetkazadiganlarni birinchi qo'yadi, keyin nomi bo'yicha", () => {
    const ranked = rankByDistrict(
      [
        { name: "B", districts: ["Farg'ona shahri"] },
        { name: "C", districts: ["Qo'qon shahri"] },
        { name: "A", districts: ["Qo'qon shahri", "Farg'ona shahri"] },
      ],
      "Qo'qon shahri",
    );
    expect(ranked.map((d) => [d.name, d.servesYou])).toEqual([
      ["A", true],
      ["C", true],
      ["B", false],
    ]);
  });
});

describe("brandStats", () => {
  it("tovarlarni sanaydi va brendlarni tovar soni bo'yicha tartiblaydi", () => {
    const stats = brandStats(
      [
        { distributorId: "d1", brand: "Salqin", count: 2 },
        { distributorId: "d1", brand: "Bog'dan", count: 5 },
        { distributorId: "d1", brand: "Aql", count: 2 },
        { distributorId: "d2", brand: "Sutli", count: 7 },
      ],
      2,
    );
    expect(stats.get("d1")).toEqual({ productCount: 9, brands: ["Bog'dan", "Aql"] });
    expect(stats.get("d2")).toEqual({ productCount: 7, brands: ["Sutli"] });
  });
});
