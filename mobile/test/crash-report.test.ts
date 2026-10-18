import { describe, expect, it } from 'vitest';

import { buildReport, createDeduper } from '@/lib/crash-report';

describe('ilova xatosi hisoboti', () => {
  it('xato matni va stack: cheklangan uzunlikda, telefon raqamisiz', () => {
    const e = new TypeError('+998901234567 uchun undefined');
    const r = buildReport(e, { screen: '/staff/shop/1', fatal: true });
    expect(r.message).toBe('TypeError: +99890******* uchun undefined');
    expect(r.screen).toBe('/staff/shop/1');
    expect(r.fatal).toBe(true);
    expect(r.stack?.includes('901234567')).toBe(false);
    expect(buildReport(new Error('x'.repeat(2000))).message.length).toBe(500);
    expect(buildReport('satr').message).toBe('Error: satr');
    expect(buildReport({ g: 1 }).message).toBe("Error: Noma'lum xato");
  });

  it('bir xil xato bir marta, jami cheklangan', () => {
    const first = createDeduper(2);
    expect(first({ message: 'a' })).toBe(true);
    expect(first({ message: 'a' })).toBe(false);
    expect(first({ message: 'a', screen: 'b' })).toBe(true);
    expect(first({ message: 'c' })).toBe(false);
  });
});
