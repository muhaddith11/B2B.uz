import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';

import { Banner, Button, Chip, Empty, ErrorState, Loading, Money, QtyStepper, SearchInput, T } from '@/components/ui';
import { R, usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { haptic } from '@/lib/haptics';
import { t, tx } from '@/lib/i18n';
import { formatSom } from '@/lib/money';
import { newRequestKey } from '@/lib/net';
import { paymentLabel, type CatalogProduct, type PaymentType } from '@/lib/types';
import { useLoad } from '@/lib/use-load';

type StaffCatalog = {
  shop: { linkId: string; name: string };
  distributor: { id: string; name: string; minOrder: number };
  creditLimit: number;
  // Egasi ilovaga kirib raqamini tasdiqlamagan bo'lsa, server faqat naqd buyurtmani qabul qiladi
  ownerVerified: boolean;
  products: CatalogProduct[];
};

// Agent do'kon nomidan buyurtma oladi: buyurtma darhol "qabul qilingan" bo'ladi
export default function StaffNewOrder() {
  const c = usePalette();
  const { linkId } = useLocalSearchParams<{ linkId: string }>();
  const { api } = useSession();
  const { data, error, retry } = useLoad<StaffCatalog>(`/api/staff/catalog?linkId=${linkId}`);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentType>('CASH');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Buyurtma kaliti: javob yo'lda yo'qolib qayta yuborilsa, server buyurtmani ikki marta yaratmaydi. Tovar o'zgarsa yangisi
  const [orderKey, setOrderKey] = useState(newRequestKey);

  const categories = useMemo(() => [...new Set(data?.products.map((p) => p.category) ?? [])], [data]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.products ?? []).filter((p) => (!category || p.category === category) && (!q || `${p.name} ${p.brand}`.toLowerCase().includes(q)));
  }, [data, category, query]);

  if (error && !data) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return <Loading rows={5} />;

  const total = data.products.reduce((s, p) => s + (qty[p.id] ?? 0) * p.price, 0);
  const packs = data.products.reduce((s, p) => s + Math.floor((qty[p.id] ?? 0) / p.packSize), 0);
  const minLeft = Math.max(0, data.distributor.minOrder - total);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const items = Object.entries(qty)
        .filter(([, q]) => q > 0)
        .map(([productId, q]) => ({ productId, qty: q }));
      const res = await api<{ id: string }>('/api/staff/orders', { method: 'POST', body: JSON.stringify({ linkId, paymentType: payment, items, clientKey: orderKey }) });
      haptic.success();
      router.replace(`/staff/order/${res.id}`);
    } catch (e) {
      setErr((e as Error).message);
      haptic.error();
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ title: data.shop.name }} />
      <FlatList
        data={shown}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: total > 0 ? 250 : 24 }}
        keyboardShouldPersistTaps="handled"
        // Qidiruv va toifalar tepada qoladi: agent uzun ro'yxatda tez topadi
        stickyHeaderIndices={[0]}
        ListHeaderComponent={
          <View style={{ gap: 12, backgroundColor: c.bg, marginHorizontal: -16, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
            <SearchInput value={query} onChangeText={setQuery} placeholder={t('Tovar yoki brend')} />
            {categories.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {[null, ...categories].map((cat) => (
                  <Chip key={cat ?? 'all'} label={cat ?? t('Hammasi')} active={category === cat} onPress={() => setCategory(cat)} />
                ))}
              </ScrollView>
            )}
          </View>
        }
        ListEmptyComponent={<Empty icon="search-outline">{t('Hech narsa topilmadi')}</Empty>}
        renderItem={({ item: p }) => {
          const n = Math.floor((qty[p.id] ?? 0) / p.packSize);
          return (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: c.card,
                borderRadius: R.md,
                paddingVertical: 10,
                paddingLeft: 14,
                paddingRight: 10,
                borderWidth: 1.5,
                borderColor: n > 0 ? c.accent : c.border,
                opacity: p.inStock ? 1 : 0.55,
              }}>
              <View style={{ flex: 1, gap: 2 }}>
                <T size="small" bold numberOfLines={2}>
                  {p.name}
                </T>
                <T size="tiny" tone="hint" num numberOfLines={1}>
                  {t('{price} · yashikda {n} {unit}', { price: formatSom(p.price), n: p.packSize, unit: tx(p.unit) })}
                </T>
              </View>
              {p.inStock ? (
                <QtyStepper
                  packs={n}
                  onChange={(v) => {
                    setQty((q) => ({ ...q, [p.id]: Math.max(0, v) * p.packSize }));
                    setOrderKey(newRequestKey());
                  }}
                  label={false}
                />
              ) : (
                <T size="tiny" tone="hint">
                  {t('Tugagan')}
                </T>
              )}
            </View>
          );
        }}
      />
      {total > 0 && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, gap: 12, backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T tone="hint" num>
              {t('{n} yashik', { n: packs })}
            </T>
            <Money value={total} size="h2" />
          </View>
          {minLeft > 0 && <Banner tone="warn">{t('Minimal buyurtmagacha yana {sum}', { sum: formatSom(minLeft) })}</Banner>}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {(['CASH', 'TRANSFER', 'CREDIT'] as const)
              .filter((type) => (data.ownerVerified ? type !== 'CREDIT' || data.creditLimit > 0 : type === 'CASH'))
              .map((type) => (
                <Chip key={type} label={paymentLabel(type)} active={payment === type} onPress={() => setPayment(type)} />
              ))}
          </View>
          {!data.ownerVerified && <Banner tone="info">{t("Do'kon egasi ilovaga kirib raqamini tasdiqlamaguncha faqat naqd buyurtma olinadi")}</Banner>}
          {err && <Banner tone="danger">{err}</Banner>}
          <Button title={t('Buyurtmani yuborish')} icon="paper-plane-outline" onPress={submit} loading={busy} disabled={minLeft > 0} />
        </View>
      )}
    </View>
  );
}
