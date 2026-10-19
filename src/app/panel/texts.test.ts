import { describe, expect, it } from "vitest";
import { GET } from "./lang/route";
import { PANEL_RU, panelText } from "./texts";

const slots = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

describe("panel tarjimasi", () => {
  it("har ruscha matn bo'sh emas va o'rinlari ({n}, {sum}, ...) o'zbekchasiga teng", () => {
    expect(Object.entries(PANEL_RU).filter(([uz, ru]) => !ru.trim() || slots(uz) !== slots(ru))).toEqual([]);
  });

  it("tanlangan tilda va qiymatlar bilan", () => {
    expect(panelText("uz")("{n} kun", { n: 5 })).toBe("5 kun");
    expect(panelText("ru")("{n} kun", { n: 5 })).toBe("5 дн.");
    expect(panelText("ru")("Buyurtmalar")).toBe("Заказы");
  });
});

describe("panel tilini almashtirish", () => {
  const call = async (q: string) => GET(new Request(`http://test.local/panel/lang?${q}`));

  it("cookie qo'yadi va o'sha sahifaga qaytaradi", async () => {
    const res = await call(`to=ru&back=${encodeURIComponent("/panel/orders?status=SENT")}`);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://test.local/panel/orders?status=SENT");
    expect(res.headers.get("set-cookie")).toMatch(/^panel_lang=ru; Path=\/panel/);
  });

  it("boshqa saytga yoki panel tashqarisiga yo'naltirmaydi", async () => {
    for (const back of ["https://evil.example", "//evil.example", "/admin", "/panel/../admin", "/panelx"]) {
      const res = await call(`to=uz&back=${encodeURIComponent(back)}`);
      expect(res.headers.get("location")).toBe("http://test.local/panel");
    }
  });
});
