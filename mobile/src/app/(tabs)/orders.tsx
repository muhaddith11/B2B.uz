import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { Banner, Button, Card, Divider, Empty, ErrorText, Loading, Money, StatusBadge, StatusSteps, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { formatDate } from '@/lib/money';
import { PAYMENT_LABEL, type ShopOrder } from '@/lib/types';
import { useLoad } from '@/lib/use-load';

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
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={c.accent} colors={[c.accent]} />}
      ListEmptyComponent={
        <Empty icon="receipt-outline" action={<Button title="Buyurtma berish" kind="secondary" onPress={() => router.push('/')} />}>
          Hali buyurtma yo'q
        </Empty>
      }
      renderItem={({ item: o }) => {
        const changed = o.items.some((i) => i.deliveredQty !== null && i.deliveredQty !== i.qty);
        const isOpen = open === o.id;
        return (
          <Card style={{ gap: 12 }}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }} onPress={() => setOpen(isOpen ? null : o.id)} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <T size="h2" num>
                  №{o.number}
                </T>
                <StatusBadge status={o.status} />
              </View>
              <T tone="hint" numberOfLines={1}>
                {o.distributor.name}
              </T>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <T size="small" tone="hint" num>
                  {formatDate(o.createdAt)} · {PAYMENT_LABEL[o.paymentType]}
                </T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Money value={o.deliveredTotal ?? o.total} />
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={c.hint} />
                </View>
              </View>
            </Pressable>
            {changed && <Banner tone="warn">Distribyutor miqdorni o'zgartirgan</Banner>}
            {o.rejectReason && <Banner tone="danger">Sabab: {o.rejectReason}</Banner>}
            {isOpen && (
              <View style={{ gap: 12 }}>
                <StatusSteps status={o.status} />
                <Divider />
                <View style={{ gap: 8 }}>
                  {o.items.map((it) => {
                    const diff = it.deliveredQty !== null && it.deliveredQty !== it.qty;
                    return (
                      <View key={it.productId} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                        <T size="small" numberOfLines={2} style={{ flex: 1 }}>
                          {it.name}
                        </T>
                        <T size="small" tone={diff ? 'warn' : 'hint'} num style={{ fontWeight: '500' }}>
                          {diff ? `${it.deliveredQty} / ${it.qty}` : it.qty} dona
                        </T>
                      </View>
                    );
                  })}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {o.status === 'SENT' && <Button title="Bekor qilish" kind="danger" compact loading={cancelling === o.id} onPress={() => cancel(o)} style={{ flex: 1 }} />}
                  <Button title="Takrorlash" icon="repeat" kind="secondary" compact onPress={() => repeat(o)} style={{ flex: 1 }} />
                </View>
                {err && <Banner tone="danger">{err}</Banner>}
              </View>
            )}
          </Card>
        );
      }}
    />
  );
}
