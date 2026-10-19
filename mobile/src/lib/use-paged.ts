import { useCallback, useMemo, useState } from 'react';

import { useSession } from '@/context/session';
import { useLoad } from '@/lib/use-load';

// Sahifalangan ro'yxatlar (server javobida nextCursor). Birinchi sahifa yangilansa (pastga tortish, ekranga qaytish),
// keyin qo'shilgan sahifalar tashlanadi: ro'yxat eng yangi holatdan qayta boshlanadi

// Birinchi sahifa allaqachon yuklangan (masalan, do'kon kartasi ichida): more() keyingi sahifalarni `path` dan qo'shadi
export function useMore<B, T extends { id: string }, R extends { nextCursor?: string | null }>(
  base: B | null,
  firstItems: T[] | null,
  firstCursor: string | null | undefined,
  path: string,
  pick: (r: R) => T[],
) {
  const { api } = useSession();
  const [extra, setExtra] = useState<{ base: B | null; items: T[]; cursor: string | null }>({ base: null, items: [], cursor: null });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);

  const fresh = base !== null && extra.base === base;
  const cursor = fresh ? extra.cursor : (firstCursor ?? null);

  const items = useMemo(() => {
    if (!firstItems) return null;
    // Sahifalar orasida yangi yozuv qo'shilsa ham bitta yozuv ikki marta chiqmasin
    const seen = new Set<string>();
    return [...firstItems, ...(fresh ? extra.items : [])].filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
  }, [firstItems, extra, fresh]);

  const more = useCallback(async () => {
    if (!cursor || loadingMore || base === null) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const res = await api<R>(`${path}${path.includes('?') ? '&' : '?'}cursor=${encodeURIComponent(cursor)}`);
      setExtra((prev) => ({ base, items: [...(prev.base === base ? prev.items : []), ...pick(res)], cursor: res.nextCursor ?? null }));
    } catch (e) {
      setMoreError((e as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }, [api, base, cursor, loadingMore, path, pick]);

  return { items, more: cursor ? more : null, loadingMore, moreError };
}

// Butun ekran bitta sahifalangan ro'yxat: birinchi sahifa useLoad kabi yuklanadi va yangilanadi
export function usePaged<R extends { nextCursor?: string | null }, T extends { id: string }>(path: string, pick: (r: R) => T[]) {
  const first = useLoad<R>(path);
  const firstItems = useMemo(() => (first.data ? pick(first.data) : null), [first.data, pick]);
  const paged = useMore<R, T, R>(first.data, firstItems, first.data?.nextCursor, path, pick);
  return { ...first, ...paged };
}
