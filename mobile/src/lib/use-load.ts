import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { useSession } from '@/context/session';

// Ekran ochilganda (va har safar qaytganda) ma'lumotni yangilaydi; pastga tortib yangilash uchun reload
export function useLoad<T>(path: string) {
  const { api } = useSession();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Faqat eng oxirgi so'rov javobi olinadi: bo'lim tez almashtirilsa, kech kelgan eski javob yangisining ustiga yozilmaydi
  const lastRequest = useRef(0);

  const load = useCallback(
    async (isRefresh: boolean) => {
      const id = ++lastRequest.current;
      if (isRefresh) setRefreshing(true);
      try {
        const res = await api<T>(path);
        if (id !== lastRequest.current) return;
        setData(res);
        setError(null);
      } catch (e) {
        if (id === lastRequest.current) setError((e as Error).message);
      } finally {
        if (id === lastRequest.current) setRefreshing(false);
      }
    },
    [api, path],
  );

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load]),
  );

  return { data, setData, error, refreshing, reload: () => load(true) };
}
