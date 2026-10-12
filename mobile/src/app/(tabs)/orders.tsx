import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { Button, Card, ErrorText, Loading, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { formatDate, formatSom } from '@/lib/money';
import { PAYMENT_LABEL, STATUS_LABEL, type OrderStatus, type ShopOrder } from '@/lib/types';
import { useLoad } from '@/lib/use-load';

const STATUS_TONE: Record<OrderStatus, 'hint' | 'accent' | 'ok' | 'danger'> = {
  SENT: 'hint',
  ACCEPTED: 'accent',
  IN_DELIVERY: 'accent',
  DELIVERED: 'ok',
  REJECTED: 'danger',
  CANCELLED: 'hint',
};

export default function OrdersScreen() {
  const c = usePalette();
  const { setQty, api } = useSession();
  const { data, error, refreshing, reload } = useLoad<{ orders: ShopOrder[] }>('/api/shop/orders');
  const [open, setOpen] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Distribyutor hali qabul qilmagan buyurtmani bekor qilish
  async function cancel(o: ShopOrder) {
    setCancelling(o.id);
    setErr(null);
    try {
      await api(`/api/shop/orders/${o.id}/cancel`, { method: 'POST', body: '{}' });
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setCancelling(null);
    }
  }

  if (error && !data) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;

  // Takrorlash: oldingi buyurtmani savatga qaytaradi; narx savatda yangi prays bo'yicha hisoblanadi
  function repeat(o: ShopOrder) {
    for (const it of o.items) setQty(o.distributor.id, it.productId, it.qty);
    router.push('/cart');
  }

  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      data={data.orders}
      keyExtractor={(o) => o.id}
      contentContainerStyle={{ padding: 16, gap: 8 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}
      ListEmptyComponent={<T tone="hint">Hali buyurtma yo'q.</T>}
      renderItem={({ item: o }) => {
        const changed = o.items.some((i) => i.deliveredQty !== null && i.deliveredQty !== i.qty);
        return (
          <Card>
            <Pressable onPress={() => setOpen(open === o.id ? null : o.id)} style={{ gap: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T bold>№{o.number}</T>
                <T size="small" tone={STATUS_TONE[o.status]} bold>
                  {STATUS_LABEL[o.status]}
                </T>
              </View>
              <T size="small" tone="hint">
                {o.distributor.name}
              </T>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T size="small">
                  {formatDate(o.createdAt)} · {PAYMENT_LABEL[o.paymentType]}
                </T>
                <T size="small" bold>
                  {formatSom(o.deliveredTotal ?? o.total)}
                </T>
              </View>
              {changed && (
                <T size="tiny" tone="danger">
                  Distribyutor miqdorni o'zgartirgan
                </T>
              )}
              {o.rejectReason && (
                <T size="tiny" tone="danger">
                  Sabab: {o.rejectReason}
                </T>
              )}
            </Pressable>
            {open === o.id && (
              <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.border, gap: 4 }}>
                {o.items.map((it) => (
                  <View key={it.productId} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <T size="small" numberOfLines={1} style={{ flex: 1 }}>
                      {it.name}
                    </T>
                    <T size="small" tone="hint">
                      {it.deliveredQty !== null && it.deliveredQty !== it.qty ? `${it.deliveredQty}/${it.qty}` : it.qty} dona
                    </T>
                  </View>
                ))}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  {o.status === 'SENT' && (
                    <Button title="Bekor qilish" kind="danger" compact loading={cancelling === o.id} onPress={() => cancel(o)} style={{ flex: 1 }} />
                  )}
                  <Button title="Takrorlash" kind="secondary" compact onPress={() => repeat(o)} style={{ flex: 1 }} />
                </View>
                {err && open === o.id && (
                  <T size="small" tone="danger">
                    {err}
                  </T>
                )}
              </View>
            )}
          </Card>
        );
      }}
    />
  );
}
