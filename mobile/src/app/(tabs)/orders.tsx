import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { Banner, Button, Card, Divider, Empty, ErrorState, Loading, Money, Pic, StatusBadge, StatusSteps, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { confirm } from '@/lib/confirm';
import { haptic } from '@/lib/haptics';
import { t } from '@/lib/i18n';
import { formatDate } from '@/lib/money';
import { paymentLabel, type ShopOrder } from '@/lib/types';
import { useLoad } from '@/lib/use-load';

export default function OrdersScreen() {
  const c = usePalette();
  const { setQty, api } = useSession();
  const { data, error, refreshing, reload, retry } = useLoad<{ orders: ShopOrder[] }>('/api/shop/orders');
  const [open, setOpen] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [answering, setAnswering] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Distribyutor hali qabul qilmagan buyurtmani bekor qilish: qaytarib bo'lmaydi, shuning uchun avval so'raladi
  async function cancel(o: ShopOrder) {
    const ok = await confirm({
      title: t('Buyurtma №{n} bekor qilinsinmi?', { n: o.number }),
      message: t("Bekor qilingan buyurtmani qaytarib bo'lmaydi, lekin uni takrorlash mumkin."),
      action: t('Bekor qilish'),
    });
    if (!ok) return;
    setCancelling(o.id);
    setErr(null);
    try {
      await api(`/api/shop/orders/${o.id}/cancel`, { method: 'POST', body: '{}' });
      reload();
    } catch (e) {
      setErr((e as Error).message);
      haptic.error();
    } finally {
      setCancelling(null);
    }
  }

  // Distribyutor xodimi kiritgan buyurtma: do'kon egasi tasdiqlasa jo'natiladi, rad etsa bekor bo'ladi
  async function answer(o: ShopOrder, accept: boolean) {
    if (!accept) {
      const ok = await confirm({
        title: t('Buyurtma №{n} rad etilsinmi?', { n: o.number }),
        message: t("Rad etilgan buyurtma bekor qilinadi va jo'natilmaydi."),
        action: t('Rad etish'),
      });
      if (!ok) return;
    }
    setAnswering(`${o.id}:${accept}`);
    setErr(null);
    try {
      await api(`/api/shop/orders/${o.id}/answer`, { method: 'POST', body: JSON.stringify({ accept }) });
      if (accept) haptic.success();
      reload();
    } catch (e) {
      setErr((e as Error).message);
      haptic.error();
    } finally {
      setAnswering(null);
    }
  }

  if (error && !data) return <ErrorState message={error} onRetry={retry} />;
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
        <Empty icon="receipt-outline" action={<Button title={t('Buyurtma berish')} kind="secondary" onPress={() => router.push('/')} />}>
          {t("Hali buyurtma yo'q")}
        </Empty>
      }
      renderItem={({ item: o }) => {
        const changed = o.items.some((i) => i.deliveredQty !== null && i.deliveredQty !== i.qty);
        const awaiting = o.status === 'AWAITING_SHOP';
        // Tasdiq kutayotgan buyurtma har doim ochiq: egasi nimaga rozilik berayotganini ko'rib turadi
        const isOpen = open === o.id || awaiting;
        return (
          <Card style={{ gap: 12 }}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }} onPress={() => setOpen(isOpen ? null : o.id)} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <T size="h2" num>
                  №{o.number}
                </T>
                <StatusBadge status={o.status} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Pic uri={o.distributor.logoUrl} name={o.distributor.name} size={28} />
                <T tone="hint" numberOfLines={1} style={{ flex: 1 }}>
                  {o.distributor.name}
                </T>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <T size="small" tone="hint" num>
                  {formatDate(o.createdAt)} · {paymentLabel(o.paymentType)}
                </T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Money value={o.deliveredTotal ?? o.total} />
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={c.hint} />
                </View>
              </View>
            </Pressable>
            {awaiting && (
              <Banner tone="warn">{t("Buyurtmani distribyutor kiritdi. Tasdiqlasangiz jo'natiladi, topshirilganda shu summa qarzingizga yoziladi.")}</Banner>
            )}
            {changed && <Banner tone="warn">{t("Distribyutor miqdorni o'zgartirgan")}</Banner>}
            {o.rejectReason && <Banner tone="danger">{t('Sabab: {reason}', { reason: o.rejectReason })}</Banner>}
            {isOpen && (
              <View style={{ gap: 12 }}>
                {/* Tasdiq kutayotganida holat sarlavhadagi belgida bor, bosqichlar hali boshlanmagan */}
                {!awaiting && <StatusSteps status={o.status} times={o} />}
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
                          {diff ? t('{a} / {b} dona', { a: it.deliveredQty ?? 0, b: it.qty }) : t('{n} dona', { n: it.qty })}
                        </T>
                      </View>
                    );
                  })}
                </View>
                {awaiting && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button
                      title={t('Rad etish')}
                      kind="danger"
                      compact
                      loading={answering === `${o.id}:false`}
                      disabled={answering !== null}
                      onPress={() => answer(o, false)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title={t('Tasdiqlash')}
                      icon="checkmark"
                      compact
                      loading={answering === `${o.id}:true`}
                      disabled={answering !== null}
                      onPress={() => answer(o, true)}
                      style={{ flex: 1 }}
                    />
                  </View>
                )}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {o.status === 'SENT' && (
                    <Button title={t('Bekor qilish')} kind="danger" compact loading={cancelling === o.id} onPress={() => cancel(o)} style={{ flex: 1 }} />
                  )}
                  <Button title={t('Takrorlash')} icon="repeat" kind="secondary" compact onPress={() => repeat(o)} style={{ flex: 1 }} />
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
