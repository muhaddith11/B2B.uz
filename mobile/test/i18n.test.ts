import { describe, expect, it } from 'vitest';

import { RU } from '@/lib/i18n-ru';

// O'zbekcha kalitdagi {o'rinlar} ruscha tarjimada ham bo'lishi kerak: aks holda ruscha ekranda summa yoki son yo'qolib qoladi
const slots = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('ilova tarjimasi', () => {
  it("har tarjima bo'sh emas va o'rinlari ({n}, {sum}, ...) kalitnikiga teng", () => {
    const bad: string[] = [];
    for (const [key, value] of Object.entries(RU)) {
      const uz = key.slice(key.indexOf('|') + 1);
      const forms = typeof value === 'string' ? [value] : [...value];
      for (const ru of forms) {
        if (!ru.trim()) bad.push(`${key}: bo'sh`);
        else if (JSON.stringify(slots(ru)) !== JSON.stringify(slots(uz))) bad.push(`${key} → ${ru}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("son bilan keladigan so'zning uchala shakli bor", () => {
    for (const value of Object.values(RU)) if (typeof value !== 'string') expect(value).toHaveLength(3);
  });
});
