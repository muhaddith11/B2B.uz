import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';

import { CartBar, Chip, Empty, ErrorText, Loading, Money, QtyStepper, SearchInput, T, Thumb } from '@/components/ui';
import { R, usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { formatSom } from '@/lib/money';
import type { CatalogData, CatalogProduct } from '@/lib/types';
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
    return (data?.products ?? []).filter((p) => (!category || p.category === category) && (!q || `${p.name} ${p.brand}`.toLowerCase().includes(q)));
  }, [data, category, query]);

  if (error && !data) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;

  const inCart = cart[id] ?? {};
  const cartTotal = data.products.reduce((s, p) => s + (inCart[p.id] ?? 0) * p.price, 0);
  const cartPacks = data.products.reduce((s, p) => s + Math.floor((inCart[p.id] ?? 0) / p.packSize), 0);
  const minLeft = Math.max(0, data.distributor.minOrder - cartTotal);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen
        options={{
          title: data.distributor.name,
          headerTitle: () => (
            <View style={{ maxWidth: 260 }}>
              <T bold numberOfLines={1}>
                {data.distributor.name}
              </T>
              {data.distributor.deliveryDays?.length ? (
                <T size="tiny" tone="hint" numberOfLines={1}>
                  Yetkazish: {data.distributor.deliveryDays.join(', ')}
                </T>
              ) : null}
            </View>
          ),
        }}
      />
      <FlatList
        data={shown}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: cartTotal > 0 ? 128 : 24 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <SearchInput value={query} onChangeText={setQuery} placeholder="Tovar yoki brend" />
            {categories.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {[null, ...categories].map((cat) => (
                  <Chip key={cat ?? 'all'} label={cat ?? 'Hammasi'} active={category === cat} onPress={() => setCategory(cat)} />
                ))}
              </ScrollView>
            )}
            {data.distributor.minOrder > 0 && (
              <T size="small" tone="hint" num>
                Minimal buyurtma {formatSom(data.distributor.minOrder)}
              </T>
            )}
          </View>
        }
        ListEmptyComponent={<Empty icon="search-outline">{query ? `"${query}" bo'yicha tovar topilmadi` : "Bu distribyutorda hozircha tovar yo'q"}</Empty>}
        renderItem={({ item }) => (
          <ProductCard p={item} packs={Math.floor((inCart[item.id] ?? 0) / item.packSize)} onChange={(n) => setQty(id, item.id, Math.max(0, n) * item.packSize)} />
        )}
      />
      {cartTotal > 0 && (
        <CartBar
          label={`Savat · ${cartPacks} yashik`}
          sub={minLeft > 0 ? `Yana ${formatSom(minLeft)} qo'shing` : null}
          total={cartTotal}
          onPress={() => router.push('/cart')}
        />
      )}
    </View>
  );
}

// Tovar kartochkasi: tanlanganda chegarasi ko'k, pastki qatorda "+" yoki to'liq kenglikdagi hisoblagich
function ProductCard({ p, packs, onChange }: { p: CatalogProduct; packs: number; onChange: (packs: number) => void }) {
  const c = usePalette();
  return (
    <View
      style={{
        flex: 1,
        maxWidth: '50%',
        backgroundColor: c.card,
        borderRadius: R.lg,
        padding: 10,
        gap: 8,
        borderWidth: 1.5,
        borderColor: packs > 0 ? c.accent : c.border,
        opacity: p.inStock ? 1 : 0.6,
      }}>
      {p.imageUrl ? <Thumb uri={p.imageUrl} name={p.name} size="100%" /> : null}
      <View style={{ gap: 2, minHeight: 56 }}>
        <T size="small" bold numberOfLines={2}>
          {p.name}
        </T>
        <T size="tiny" tone="hint" numberOfLines={1}>
          Yashikda {p.packSize} {p.unit}
          {p.marked ? ' · markirovka' : ''}
        </T>
      </View>
      <View style={{ gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <Money value={p.price} size="body" />
          <T size="tiny" tone="hint">
            / {p.unit}
          </T>
        </View>
        <T size="tiny" tone="hint" num numberOfLines={1}>
          Yashik: {formatSom(p.price * p.packSize)}
        </T>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', minHeight: 44 }}>
        {!p.inStock ? (
          <T size="small" tone="hint" style={{ flex: 1 }}>
            Tugagan
          </T>
        ) : packs > 0 ? (
          <QtyStepper packs={packs} onChange={onChange} full />
        ) : (
          <QtyStepper packs={0} onChange={onChange} />
        )}
      </View>
    </View>
  );
}
