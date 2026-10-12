import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useSession } from '@/context/session';

// Ekran ochilganda (va har safar qaytganda) ma'lumotni yangilaydi; pastga tortib yangilash uchun reload
export function useLoad<T>(path: string) {
  const { api } = useSession();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) setRefreshing(true);
      try {
        setData(await api<T>(path));
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setRefreshing(false);
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
