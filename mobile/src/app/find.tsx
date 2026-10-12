import { useEffect, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';

import { Button, Card, Chip, Loading, SearchInput, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { formatSom } from '@/lib/money';
import type { DiscoverData } from '@/lib/types';

// Yangi distribyutor topish: hudud, toifa, tovar yoki brend bo'yicha
export default function FindScreen() {
  const c = usePalette();
  const { api } = useSession();
  const [data, setData] = useState<DiscoverData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (category) params.set('category', category);
    const t = setTimeout(() => {
      api<DiscoverData>(`/api/shop/distributors?${params}`)
        .then((d) => {
          setData(d);
          setErr(null);
        })
        .catch((e) => setErr(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [api, query, category]);

  async function request(distributorId: string) {
    setBusyId(distributorId);
    try {
      await api('/api/shop/distributors', { method: 'POST', body: JSON.stringify({ distributorId }) });
      setData((d) => d && { ...d, distributors: d.distributors.map((x) => (x.id === distributorId ? { ...x, requested: true } : x)) });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      data={data?.distributors ?? []}
      keyExtractor={(d) => d.id}
      contentContainerStyle={{ padding: 16, gap: 8 }}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: 8, marginBottom: 4 }}>
          <SearchInput value={query} onChangeText={setQuery} placeholder="Distribyutor, tovar yoki brend" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {[null, ...(data?.categories ?? [])].map((cat) => (
              <Chip key={cat ?? 'all'} label={cat ?? 'Hammasi'} active={category === cat} onPress={() => setCategory(cat)} />
            ))}
          </ScrollView>
          {err && (
            <T size="small" tone="danger">
              {err}
            </T>
          )}
          {!data && !err && <Loading />}
        </View>
      }
      ListEmptyComponent={
        data ? (
          <T size="small" tone="hint" style={{ textAlign: 'center', padding: 16 }}>
            {query || category ? 'Hech narsa topilmadi' : "Hozircha yangi distribyutor yo'q: barchasiga ulangansiz"}
          </T>
        ) : null
      }
      renderItem={({ item: d }) => (
        <Card style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <T bold style={{ flex: 1 }}>
              {d.name}
            </T>
            <T size="tiny" tone={d.servesYou ? 'ok' : 'hint'} bold={d.servesYou}>
              {d.servesYou ? 'Hududingizga yetkazadi' : 'Boshqa hudud'}
            </T>
          </View>
          <T size="small" tone="hint">
            {d.categories.join(', ')}
          </T>
          <T size="small">
            {d.productCount} ta tovar{d.brands.length > 0 ? ` · ${d.brands.join(', ')}` : ''}
          </T>
          <T size="small" tone="hint">
            Minimal buyurtma: {formatSom(d.minOrder)} · yetkazish: {d.deliveryDays.join(', ')}
          </T>
          <T size="small" tone="hint">
            Hududlar: {d.districts.join(', ')}
          </T>
          <View style={{ marginTop: 8 }}>
            {d.requested ? (
              <T size="small" tone="hint" style={{ textAlign: 'center', paddingVertical: 8 }}>
                So'rov yuborilgan · javob kutilmoqda
              </T>
            ) : (
              <Button title="Ulanish so'rovini yuborish" compact loading={busyId === d.id} onPress={() => request(d.id)} />
            )}
          </View>
        </Card>
      )}
    />
  );
}
