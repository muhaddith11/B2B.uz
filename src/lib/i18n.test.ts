import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { L, langOf, render, som } from "./i18n";
import { formatAmount } from "./money";
import { RU } from "./i18n-ru";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.tsx?$/.test(name) && !/\.test\.ts$/.test(name) ? [p] : [];
  });
}

// Mobil ilovaga boradigan matnlar: xato (HttpError, readJson), o'zgaruvchidagi xato matni va bildirishnoma sarlavhasi.
// Distribyutor paneli o'z lug'atida (src/app/panel/texts.ts, TypeScript tekshiradi); admin va obuna sahifasi o'zbekcha.
const APP_DIRS = ["src/lib", "src/app/api"];
const PATTERNS = [
  /new HttpError\(\d+, "([^"]+)"\)/g,
  /readJson\(req, [^;]*?, "([^"]+)"\)/g,
  /(?:Msg|message) = "([^"]+)"/g,
  /\btitle: "([^"]+)"/g,
  /\bbody: "([^"]+)"/g,
  /\.regex\([^,]+, "([^"]+)"\)/g,
];

describe("server tarjimasi", () => {
  it("ilovaga boradigan har bir o'zbekcha matnning ruschasi bor", () => {
    const missing: string[] = [];
    for (const file of APP_DIRS.flatMap((d) => sourceFiles(path.resolve(d)))) {
      const src = readFileSync(file, "utf8");
      for (const re of PATTERNS) {
        for (const m of src.matchAll(re)) {
          if (!(m[1] in RU)) missing.push(`${path.relative(process.cwd(), file)}: ${m[1]}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("tarjimadagi o'rinlar ({sum}, {n}, ...) o'zbekcha matnnikiga teng", () => {
    const slots = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
    const bad = Object.entries(RU).filter(([uz, ru]) => !ru.trim() || slots(uz) !== slots(ru));
    expect(bad).toEqual([]);
  });

  it("satr, shablon va ichki qiymatlarni tarjima qiladi", () => {
    expect(render("Buyurtma topilmadi", "ru")).toBe("Заказ не найден");
    expect(render("Buyurtma topilmadi", "uz")).toBe("Buyurtma topilmadi");
    // Lug'atda yo'q satr (masalan, rad etish sababi) o'zgarmaydi
    expect(render("Tovar tugagan", "ru")).toBe("Tovar tugagan");
    const t = L("Minimal buyurtma {sum}", { sum: som(300000) });
    expect(render(t, "uz")).toBe(`Minimal buyurtma ${formatAmount(300000)} so'm`);
    expect(render(t, "ru")).toBe(`Минимальный заказ ${formatAmount(300000)} сум`);
    expect(render(L("Buyurtmangiz rad etildi: {reason}", { reason: "tovar tugagan" }), "ru")).toBe("Ваш заказ отклонён: tovar tugagan");
  });

  it("tilni x-lang sarlavhasidan oladi", () => {
    expect(langOf(new Request("http://x", { headers: { "x-lang": "ru" } }))).toBe("ru");
    expect(langOf(new Request("http://x", { headers: { "x-lang": "en" } }))).toBe("uz");
    expect(langOf(new Request("http://x"))).toBe("uz");
    expect(langOf(undefined)).toBe("uz");
  });
});
