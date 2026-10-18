import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'ru' }] }));

const { deviceLang, setCurrentLang, t, txNote } = await import('@/lib/i18n');
const { formatAmount, formatDate, formatSom, formatStepTime } = await import('@/lib/money');

// Summada uzilmaydigan bo'sh joy (U+00A0): summa va "so'm" ikki qatorga bo'linmaydi
const nb = (x: string) => x.replace(/ /g, '\u00a0');

describe('summa va til', () => {
  afterEach(() => setCurrentLang('uz'));

  it("summa bo'sh joy bilan guruhlanadi, manfiy belgi alohida, so'm/сум tanlangan tilda", () => {
    expect(formatAmount(1234500)).toBe(nb('1 234 500'));
    expect(formatAmount(-50000)).toBe(nb('−50 000'));
    expect(formatAmount(999.6)).toBe(nb('1 000'));
    expect(formatSom(9800)).toBe(nb("9 800 so'm"));
    setCurrentLang('ru');
    expect(formatSom(9800)).toBe(nb('9 800 сум'));
  });

  it("ruscha son shakllari: 1 коробка, 2 коробки, 5 коробок, 11 коробок, 21 коробка", () => {
    setCurrentLang('ru');
    expect([1, 2, 5, 11, 21, 112].map((n) => t('{n} yashik', { n }))).toEqual(['1 коробка', '2 коробки', '5 коробок', '11 коробок', '21 коробка', '112 коробок']);
    setCurrentLang('uz');
    expect(t('{n} yashik', { n: 5 })).toBe('5 yashik');
  });

  it("telefon tili rus bo'lsa ilova ruscha ochiladi; avtomatik izohlar tarjima qilinadi, odam yozgani o'zgarmaydi", () => {
    expect(deviceLang()).toBe('ru');
    setCurrentLang('ru');
    expect(txNote('Rad etildi: chek o\'qilmaydi')).toBe("Отклонено: chek o'qilmaydi");
  });

  it('sana va holat vaqti', () => {
    expect(formatDate('2026-10-07T09:00:00')).toBe('07.10.2026');
    const now = new Date('2026-10-18T15:00:00');
    expect(formatStepTime(new Date('2026-10-18T09:05:00'), now)).toBe('09:05');
    expect(formatStepTime(new Date('2026-10-17T09:05:00'), now)).toBe('17.10');
  });
});
