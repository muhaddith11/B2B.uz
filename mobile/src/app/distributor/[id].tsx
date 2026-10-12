import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';

import { Card, Chip, ErrorText, Loading, QtyStepper, SearchInput, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { formatSom } from '@/lib/money';
import type { CatalogData } from '@/lib/types';
import { useLoad } from '@/lib/use-load';

export default function CatalogScreen() {
  const c = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cart, setQty } = useSession();
  const { data, error } = useLoad<CatalogData>(`/api/shop/catalog?distributorId=${encodeURIComponent(id)}`);
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const categories = useMemo(() => [...new Set(data?.products.map((p) => p.category) ?? [])], [data]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.products ?? []).filter(
      (p) => (!category || p.category === category) && (!q || `${p.name} ${p.brand}`.toLowerCase().includes(q)),
    );
  }, [data, category, query]);

  if (error && !data) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;

  const inCart = cart[id] ?? {};
  const cartTotal = data.products.reduce((s, p) => s + (inCart[p.id] ?? 0) * p.price, 0);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ title: data.distributor.name }} />
      <FlatList
        data={shown}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: cartTotal > 0 ? 96 : 16 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: 8, marginBottom: 4 }}>
            <SearchInput value={query} onChangeText={setQuery} placeholder="Tovar qidirish" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {[null, ...categories].map((cat) => (
                <Chip key={cat ?? 'all'} label={cat ?? 'Hammasi'} active={category === cat} onPress={() => setCategory(cat)} />
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <T size="small" tone="hint" style={{ textAlign: 'center', padding: 16 }}>
            Hech narsa topilmadi
          </T>
        }
        renderItem={({ item: p }) => {
          const packs = Math.floor((inCart[p.id] ?? 0) / p.packSize);
          return (
            <Card style={{ gap: 2 }}>
              <T bold>{p.name}</T>
              <T size="tiny" tone="hint">
                {p.brand} · yashikda {p.packSize} {p.unit}
                {p.marked ? ' · markirovkali' : ''}
              </T>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8 }}>
                <View>
                  <T bold>{formatSom(p.price)}</T>
                  <T size="tiny" tone="hint">
                    yashik: {formatSom(p.price * p.packSize)}
                  </T>
                </View>
                {p.inStock ? (
                  <QtyStepper packs={packs} onChange={(n) => setQty(id, p.id, Math.max(0, n) * p.packSize)} />
                ) : (
                  <T size="small" tone="hint">
                    Tugagan
                  </T>
                )}
              </View>
            </Card>
          );
        }}
      />
      {cartTotal > 0 && (
        <Pressable
          onPress={() => router.push('/cart')}
          style={{ position: 'absolute', left: 16, right: 16, bottom: 24, backgroundColor: c.accent, borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}>
          <T bold style={{ color: c.accentText }}>
            Savatga o'tish · {formatSom(cartTotal)}
          </T>
        </Pressable>
      )}
    </View>
  );
}
