import { describe, expect, it } from 'vitest';

import { compareVersions, isOutdated, RECHECK_AFTER_MS, shouldRecheck } from '@/lib/version';

describe('versiyalar', () => {
  it('raqam bo\'yicha solishtiradi, satr bo\'yicha emas', () => {
    expect(compareVersions('1.10.0', '1.9.2')).toBe(1);
    expect(compareVersions('1.1.0', '1.1.0')).toBe(0);
    expect(compareVersions('1.0.9', '1.1.0')).toBe(-1);
    expect(compareVersions('2.0.0', '1.99.99')).toBe(1);
  });

  it('eng kichik versiyadan eski ilova to\'xtatiladi, teng yoki yangisi ishlayveradi', () => {
    expect(isOutdated('1.0.0', '1.1.0')).toBe(true);
    expect(isOutdated('1.1.0', '1.1.0')).toBe(false);
    expect(isOutdated('1.2.0', '1.1.0')).toBe(false);
  });

  it('versiya noma\'lum yoki buzuq bo\'lsa ilova to\'xtatilmaydi', () => {
    expect(isOutdated(undefined, '1.1.0')).toBe(false);
    expect(isOutdated('1.0.0', undefined)).toBe(false);
    expect(isOutdated('1.0', '1.1.0')).toBe(false);
    expect(isOutdated('1.0.0', 'buzuq')).toBe(false);
  });

  it('orqa fondan qaytganda 30 daqiqada bir martadan ko\'p tekshirmaydi', () => {
    const now = 10 * RECHECK_AFTER_MS;
    expect(shouldRecheck(now - RECHECK_AFTER_MS + 1, now)).toBe(false);
    expect(shouldRecheck(now - RECHECK_AFTER_MS, now)).toBe(true);
    expect(shouldRecheck(0, now)).toBe(true);
  });
});
