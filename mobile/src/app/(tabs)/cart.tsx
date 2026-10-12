import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Button, Card, ErrorText, Loading, QtyStepper, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { formatSom } from '@/lib/money';
import { PAYMENT_LABEL, type CatalogData, type HomeData, type LinkSummary, type PaymentType } from '@/lib/types';

type Group = { link: LinkSummary; catalog: CatalogData };
type Result = { ok: true; number: number } | { ok: false; error: string };

// Savatdagi har bir distribyutor uchun alohida buyurtma yuboriladi
export default function CartScreen() {
  const c = usePalette();
  const { api, cart, setQty, clearDistributor } = useSession();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [payment, setPayment] = useState<Record<string, PaymentType>>({});
  const [results, setResults] = useState<Record<string, Result>>({});
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const distKey = Object.keys(cart).sort().join(',');

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const ids = distKey ? distKey.split(',') : [];
          if (ids.length === 0) {
            setGroups([]);
            return;
          }
          const home = await api<HomeData>('/api/shop/home');
          const loaded = await Promise.all(
            ids.map(async (id) => {
              const link = home.links.find((l) => l.distributor.id === id);
              if (!link) return null;
              const catalog = await api<CatalogData>(`/api/shop/catalog?distributorId=${encodeURIComponent(id)}`);
              return { link, catalog };
            }),
          );
          if (alive) setGroups(loaded.filter((g): g is Group => g !== null));
        } catch (e) {
          if (alive) setErr((e as Error).message);
        }
      })();
      return () => {
        alive = false;
      };
    }, [api, distKey]),
  );

  async function submit() {
    if (!groups) return;
    setSending(true);
    const next: Record<string, Result> = {};
    for (const g of groups) {
      const id = g.catalog.distributor.id;
      const items = Object.entries(cart[id] ?? {}).map(([productId, qty]) => ({ productId, qty }));
      if (items.length === 0) continue;
      try {
        const res = await api<{ number: number }>('/api/shop/orders', {
          method: 'POST',
          body: JSON.stringify({ distributorId: id, paymentType: payment[id] ?? 'CASH', items }),
        });
        next[id] = { ok: true, number: res.number };
        clearDistributor(id);
      } catch (e) {
        next[id] = { ok: false, error: (e as Error).message };
      }
    }
    setResults(next);
    setSending(false);
  }

  if (err) return <ErrorText>{err}</ErrorText>;

  const sent = Object.values(results).filter((r): r is { ok: true; number: number } => r.ok);

  if (!distKey)
    return (
      <View style={{ flex: 1, padding: 24, gap: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        {sent.length > 0 ? (
          <>
            <T size="h2">Buyurtma yuborildi</T>
            <T tone="hint">Raqam: {sent.map((r) => `№${r.number}`).join(', ')}</T>
            <Button title="Buyurtmalarimni ko'rish" kind="secondary" onPress={() => router.push('/orders')} />
          </>
        ) : (
          <>
            <T size="h2">Savat bo'sh</T>
            <Button title="Katalogga o'tish" kind="secondary" onPress={() => router.push('/')} />
          </>
        )}
      </View>
    );

  if (!groups) return <Loading />;

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      {sent.length > 0 && (
        <Card>
          <T size="small" tone="ok">
            Yuborildi: {sent.map((r) => `№${r.number}`).join(', ')}
          </T>
        </Card>
      )}

      {groups.map(({ link, catalog }) => {
        const id = catalog.distributor.id;
        const lines = catalog.products.filter((p) => (cart[id]?.[p.id] ?? 0) > 0);
        if (lines.length === 0) return null;
        const total = lines.reduce((s, p) => s + (cart[id][p.id] ?? 0) * p.price, 0);
        const minLeft = Math.max(0, catalog.distributor.minOrder - total);
        // Muddati o'tgan qarz bo'yicha bloklashni server hal qiladi (distribyutor sozlamasiga qarab)
        const creditOk = link.creditLimit > 0 && link.creditAvailable >= total;
        const pay = payment[id] ?? 'CASH';
        const result = results[id];

        return (
          <Card key={id} style={{ gap: 8 }}>
            <T size="h2">{catalog.distributor.name}</T>
            {lines.map((p) => {
              const qty = cart[id][p.id];
              return (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <T size="small" numberOfLines={2}>
                      {p.name}
                    </T>
                    <T size="tiny" tone="hint">
                      {qty} {p.unit} · {formatSom(qty * p.price)}
                    </T>
                  </View>
                  <QtyStepper packs={Math.floor(qty / p.packSize)} onChange={(n) => setQty(id, p.id, Math.max(0, n) * p.packSize)} />
                </View>
              );
            })}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <T bold>Jami</T>
              <T bold>{formatSom(total)}</T>
            </View>
            {minLeft > 0 && (
              <T size="small" tone="danger">
                Minimal buyurtmagacha yana {formatSom(minLeft)}
              </T>
            )}

            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['CASH', 'TRANSFER', 'CREDIT'] as const).map((t) => {
                const disabled = t === 'CREDIT' && !creditOk;
                const active = pay === t;
                return (
                  <Pressable
                    key={t}
                    disabled={disabled}
                    onPress={() => setPayment((s) => ({ ...s, [id]: t }))}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: 'center',
                      backgroundColor: active ? c.accent : c.bg,
                      opacity: disabled ? 0.4 : 1,
                    }}>
                    <T size="small" style={{ color: active ? c.accentText : c.text }}>
                      {PAYMENT_LABEL[t]}
                    </T>
                  </Pressable>
                );
              })}
            </View>
            {link.creditLimit > 0 && (
              <T size="tiny" tone="hint">
                Bo'sh nasiya: {formatSom(link.creditAvailable)}
                {link.overdueAmount > 0 ? " · muddati o'tgan qarz bor" : ''}
              </T>
            )}
            {result && !result.ok && (
              <T size="small" tone="danger">
                {result.error}
              </T>
            )}
          </Card>
        );
      })}

      <Button title="Buyurtma berish" onPress={submit} loading={sending} />
    </ScrollView>
  );
}
