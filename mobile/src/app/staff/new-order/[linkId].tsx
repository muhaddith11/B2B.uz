import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';

import { Button, Card, Chip, Empty, ErrorText, Loading, QtyStepper, SearchInput, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { formatSom } from '@/lib/money';
import { PAYMENT_LABEL, type CatalogProduct, type PaymentType } from '@/lib/types';
import { useLoad } from '@/lib/use-load';

type StaffCatalog = {
  shop: { linkId: string; name: string };
  distributor: { id: string; name: string; minOrder: number };
  creditLimit: number;
  products: CatalogProduct[];
};

// Agent do'kon nomidan buyurtma oladi: buyurtma darhol "qabul qilingan" bo'ladi
export default function StaffNewOrder() {
  const c = usePalette();
  const { linkId } = useLocalSearchParams<{ linkId: string }>();
  const { api } = useSession();
  const { data, error } = useLoad<StaffCatalog>(`/api/staff/catalog?linkId=${linkId}`);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentType>('CASH');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const categories = useMemo(() => [...new Set(data?.products.map((p) => p.category) ?? [])], [data]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.products ?? []).filter((p) => (!category || p.category === category) && (!q || `${p.name} ${p.brand}`.toLowerCase().includes(q)));
  }, [data, category, query]);

  if (error && !data) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;

  const total = data.products.reduce((s, p) => s + (qty[p.id] ?? 0) * p.price, 0);
  const minLeft = Math.max(0, data.distributor.minOrder - total);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const items = Object.entries(qty)
        .filter(([, q]) => q > 0)
        .map(([productId, q]) => ({ productId, qty: q }));
      const res = await api<{ id: string }>('/api/staff/orders', { method: 'POST', body: JSON.stringify({ linkId, paymentType: payment, items }) });
      router.replace(`/staff/order/${res.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ title: data.shop.name }} />
      <FlatList
        data={shown}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: total > 0 ? 220 : 16 }}
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
        ListEmptyComponent={<Empty>Hech narsa topilmadi</Empty>}
        renderItem={({ item: p }) => (
          <Card style={{ gap: 2 }}>
            <T bold>{p.name}</T>
            <T size="tiny" tone="hint">
              {p.brand} · yashikda {p.packSize} {p.unit}
            </T>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
              <T bold>{formatSom(p.price)}</T>
              {p.inStock ? (
                <QtyStepper packs={Math.floor((qty[p.id] ?? 0) / p.packSize)} onChange={(n) => setQty((q) => ({ ...q, [p.id]: Math.max(0, n) * p.packSize }))} />
              ) : (
                <T size="small" tone="hint">
                  Tugagan
                </T>
              )}
            </View>
          </Card>
        )}
      />
      {total > 0 && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, gap: 8, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T bold>Jami</T>
            <T bold>{formatSom(total)}</T>
          </View>
          {minLeft > 0 && (
            <T size="small" tone="danger">
              Minimal buyurtmagacha yana {formatSom(minLeft)}
            </T>
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['CASH', 'TRANSFER', 'CREDIT'] as const).map((t) => (
              <Button
                key={t}
                title={PAYMENT_LABEL[t]}
                compact
                kind={payment === t ? 'primary' : 'secondary'}
                disabled={t === 'CREDIT' && data.creditLimit <= 0}
                style={{ flex: 1 }}
                onPress={() => setPayment(t)}
              />
            ))}
          </View>
          {err && (
            <T size="small" tone="danger">
              {err}
            </T>
          )}
          <Button title="Buyurtmani yuborish" onPress={submit} loading={busy} disabled={minLeft > 0} />
        </View>
      )}
    </View>
  );
}
