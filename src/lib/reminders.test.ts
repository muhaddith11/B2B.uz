import { describe, expect, it } from "vitest";
import { reminderStage, reminderText, smsName } from "./reminders";

const now = new Date("2026-10-20T05:00:00Z");
const daysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 3600 * 1000);

describe("obuna eslatmasi", () => {
  it("bosqich: 14 kun qolganda, imtiyozda, yopilgach; juda oldin va ancha keyin yo'q", () => {
    expect(reminderStage(daysFromNow(15), now)).toBeNull();
    expect(reminderStage(daysFromNow(14), now)).toBe("SOON");
    expect(reminderStage(daysFromNow(1), now)).toBe("SOON");
    expect(reminderStage(daysFromNow(-1), now)).toBe("GRACE");
    expect(reminderStage(daysFromNow(-7), now)).toBe("EXPIRED");
    expect(reminderStage(daysFromNow(-37), now)).toBe("EXPIRED");
    expect(reminderStage(daysFromNow(-38), now)).toBeNull();
  });

  it("matn TextUP'da tasdiqlangan shablonga aynan mos (Toshkent sanasi)", () => {
    const org = { name: "Baraka do'koni", paidUntil: new Date("2026-11-01T20:00:00Z") };
    expect(reminderText("SOON", org)).toBe("Captar ilovasi: Baraka do'koni obunasi 02.11.2026 da tugaydi. Uzaytirish: b2b-uz.vercel.app/obuna");
    expect(reminderText("GRACE", org)).toBe(
      "Captar ilovasi: Baraka do'koni obunasi muddati tugadi. 09.11.2026 dan yangi buyurtmalar yopiladi. To'lov: b2b-uz.vercel.app/obuna",
    );
    expect(reminderText("EXPIRED", org)).toBe(
      "Captar ilovasi: Baraka do'koni obunasi to'lanmagani uchun yangi buyurtmalar yopildi. To'lov: b2b-uz.vercel.app/obuna",
    );
  });

  it("nom: apostrof oddiy ', uzuni qisqaradi va har bir SMS bitta bo'lakka (160 belgi) sig'adi", () => {
    expect(smsName("  G‘ayrat  ʻO’rikzor’  ")).toBe("G'ayrat 'O'rikzor'");
    const long = "Toshkent Ulgurji Savdo Markazi Mas'uliyati Cheklangan Jamiyati";
    expect(smsName(long)).toBe("Toshkent Ulgurji Savdo Markazi Ma...");
    for (const stage of ["SOON", "GRACE", "EXPIRED"] as const) {
      const text = reminderText(stage, { name: long, paidUntil: now });
      expect(text.length).toBeLessThanOrEqual(160);
      // Faqat GSM-7 belgilar: SMS qimmatroq (70 belgilik) kodlashga o'tib ketmasin
      expect(text).toMatch(/^[\x20-\x7E]+$/);
    }
  });
});
