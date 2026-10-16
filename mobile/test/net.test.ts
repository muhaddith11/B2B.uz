import { describe, expect, it, vi } from 'vitest';

import { fetchWithTimeout, fitWithin, needsRefresh, newRequestKey, REFRESH_AFTER_MS, TimeoutError } from '@/lib/net';

describe('fetchWithTimeout', () => {
  it('javob kelmasa belgilangan vaqtda to\'xtatadi', async () => {
    vi.useFakeTimers();
    const hanging = ((_url: string, init?: RequestInit) =>
      new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))))) as unknown as typeof fetch;
    const p = fetchWithTimeout(hanging, 'https://x', {}, 20_000);
    const check = expect(p).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(20_000);
    await check;
    vi.useRealTimers();
  });

  it('o\'z vaqtida kelgan javobni qaytaradi, tarmoq xatosini o\'zgartirmaydi', async () => {
    const ok = (async () => new Response('{}')) as unknown as typeof fetch;
    expect((await fetchWithTimeout(ok, 'https://x', {}, 1000)).status).toBe(200);
    const offline = (async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    await expect(fetchWithTimeout(offline, 'https://x', {}, 1000)).rejects.toBeInstanceOf(TypeError);
  });
});

describe('newRequestKey', () => {
  it('server talab qilgan uzunlikda (8-64) va har safar boshqa', () => {
    const keys = new Set(Array.from({ length: 1000 }, () => newRequestKey()));
    expect(keys.size).toBe(1000);
    for (const k of keys) expect(k.length).toBeGreaterThanOrEqual(8);
    for (const k of keys) expect(k.length).toBeLessThanOrEqual(64);
  });
});

describe('needsRefresh', () => {
  it('hech yangilanmagan yoki 3 kundan eski sessiya yangilanadi', () => {
    const now = 1_000_000_000_000;
    expect(needsRefresh(undefined, now)).toBe(true);
    expect(needsRefresh(now - 1000, now)).toBe(false);
    expect(needsRefresh(now - REFRESH_AFTER_MS - 1, now)).toBe(true);
  });
});

describe('fitWithin', () => {
  it('katta rasmni uzun tomoni bo\'yicha kichraytiradi, kichigiga tegmaydi', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1600 });
    expect(fitWithin(3024, 4032)).toEqual({ height: 1600 });
    expect(fitWithin(1200, 900)).toBeNull();
    expect(fitWithin(0, 0)).toBeNull();
  });
});
