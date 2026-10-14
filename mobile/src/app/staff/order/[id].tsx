import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { Banner, Button, Card, Chip, Divider, ErrorState, Field, IconButton, Loading, Money, QtyStepper, Row, Screen, SectionTitle, StatusBadge, StatusSteps, T } from '@/components/ui';
import { R, usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useStaff } from '@/context/staff';
import { confirm } from '@/lib/confirm';
import { haptic } from '@/lib/haptics';
import { t, tx } from '@/lib/i18n';
import { formatDate, formatSom } from '@/lib/money';
import type { StaffOrder } from '@/lib/staff-types';
import { paymentLabel } from '@/lib/types';
import { useLoad } from '@/lib/use-load';

// Buyurtma: qabul qilish, rad etish, yo'lga chiqarish (yetkazuvchi bilan), topshirish (qisman ham)
export default function StaffOrderScreen() {
  const c = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useSession();
  const { me, can } = useStaff();
  const { data, error, reload, retry } = useLoad<{ order: StaffOrder }>(`/api/staff/orders/${id}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [courierId, setCourierId] = useState<string | null>(null);
  const [delivered, setDelivered] = useState<Record<string, number>>({});

  const order = data?.order;

  if (error && !data) return <ErrorState message={error} onRetry={retry} />;
  if (!order) return <Loading rows={2} />;

  const manager = can('ADMIN', 'OPERATOR');
  const mayDeliver = order.status === 'IN_DELIVERY' && (manager || (can('COURIER') && (!order.courier || order.courier.id === me?.staff.id)));
  const deliveredTotal = order.items.reduce((s, i) => s + (delivered[i.id] ?? i.qty) * i.price, 0);
  const hasFooter = (order.status === 'SENT' && manager) || (order.status === 'ACCEPTED' && manager) || mayDeliver;
  const cash = order.paymentType === 'CASH';

  async function move(to: string, extra: Record<string, unknown> = {}) {
    setBusy(to);
    setErr(null);
    try {
      await api(`/api/staff/orders/${id}`, { method: 'POST', body: JSON.stringify({ to, ...extra }) });
      setRejecting(false);
      setDelivered({});
      haptic.success();
      await reload();
    } catch (e) {
      setErr((e as Error).message);
      haptic.error();
    } finally {
      setBusy(null);
    }
  }

  // Qabul qilingan buyurtmani bekor qilish va topshirish qaytarib bo'lmaydi: avval so'raladi
  async function cancelAccepted() {
    if (!order) return;
    const ok = await confirm({ title: t('Buyurtma №{n} bekor qilinsinmi?', { n: order.number }), message: t("Do'konga xabar boradi."), action: t('Bekor qilish') });
    if (ok) move('CANCELLED');
  }

  async function deliver() {
    if (!order) return;
    const ok = await confirm({
      title: t('Buyurtma topshirildimi?'),
      message: cash ? t('{sum} naqd olingan deb yoziladi.', { sum: formatSom(deliveredTotal) }) : t('{sum} qarz daftariga yoziladi.', { sum: formatSom(deliveredTotal) }),
      action: t('Ha, topshirildi'),
      destructive: false,
    });
    if (ok) move('DELIVERED', { delivered: order.items.map((i) => ({ itemId: i.id, deliveredQty: delivered[i.id] ?? i.qty })) });
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ title: t('Buyurtma №{n}', { n: order.number }) }} />
      <Screen bottom={hasFooter ? 180 : 32}>
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <Money value={order.deliveredTotal ?? order.total} size="title" />
            <StatusBadge status={order.status} />
          </View>
          <StatusSteps status={order.status} times={order} />
          <Divider />
          <View style={{ gap: 6 }}>
            <Row label={t('Sana')} value={formatDate(order.createdAt)} />
            <Row label={t("To'lov")} value={paymentLabel(order.paymentType)} />
            <Row
              label={t('Manba')}
              value={order.source === 'AGENT' ? t('Agent: {name}', { name: order.createdBy ?? '—' }) : t('Ilova: {name}', { name: order.createdBy ?? '—' })}
            />
            {order.courier && <Row label={t('Yetkazuvchi')} value={order.courier.name} />}
          </View>
          {order.rejectReason && <Banner tone="danger">{t('Rad etish sababi: {reason}', { reason: order.rejectReason })}</Banner>}
        </Card>

        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/staff/shop/${order.shop.linkId}`)}
            style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.8 : 1 })}>
            <View style={{ width: 44, height: 44, borderRadius: R.md, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="storefront-outline" size={22} color={c.accentInk} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T bold numberOfLines={1}>
                {order.shop.name}
              </T>
              <T size="small" tone="hint" numberOfLines={2}>
                {order.shop.address}
              </T>
              {order.shop.owner && (
                <T size="small" tone="hint" numberOfLines={1}>
                  {order.shop.owner}
                </T>
              )}
            </View>
          </Pressable>
          {order.shop.phone ? (
            <IconButton icon="call-outline" label={t("Qo'ng'iroq: {phone}", { phone: order.shop.phone })} tone="accent" onPress={() => Linking.openURL(`tel:${order.shop.phone}`)} />
          ) : null}
        </Card>

        <SectionTitle right={<T size="small" tone="hint">{t('{n} ta', { n: order.items.length })}</T>}>{t('Tovarlar')}</SectionTitle>
        <Card style={{ gap: 12 }}>
          {order.items.map((it, i) => {
            const q = delivered[it.id] ?? it.qty;
            const changed = it.deliveredQty !== null && it.deliveredQty !== it.qty;
            const unit = tx(it.unit);
            return (
              <View key={it.id} style={{ gap: 8 }}>
                {i > 0 && <Divider />}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T size="small" bold>
                      {it.name}
                    </T>
                    <T size="tiny" tone="hint" num>
                      {it.qty} {unit} × {formatSom(it.price)}
                      {changed ? ` · ${t('topshirilgan {n}', { n: it.deliveredQty ?? 0 })}` : ''}
                    </T>
                  </View>
                  <Money value={(it.deliveredQty ?? it.qty) * it.price} size="small" />
                </View>
                {mayDeliver && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <T size="tiny" tone={q !== it.qty ? 'warn' : 'hint'} num style={{ flexShrink: 1 }}>
                      {t('Topshiriladi: {n} {unit}', { n: q, unit })}
                    </T>
                    <QtyStepper packs={Math.floor(q / it.packSize)} onChange={(n) => setDelivered((d) => ({ ...d, [it.id]: Math.min(it.qty, Math.max(0, n) * it.packSize) }))} />
                  </View>
                )}
              </View>
            );
          })}
          <Divider />
          <Row label={t('Jami')} value={formatSom(order.total)} />
          {order.deliveredTotal !== null && <Row label={t('qator|Topshirilgan')} value={formatSom(order.deliveredTotal)} tone="ok" />}
        </Card>

        {order.status === 'SENT' && manager && rejecting && (
          <Card style={{ gap: 12 }}>
            <Field label={t('Rad etish sababi')} value={reason} onChangeText={setReason} placeholder={t('Masalan: tovar tugagan')} autoFocus />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title={t('Ortga')} kind="secondary" onPress={() => setRejecting(false)} style={{ flex: 1 }} />
              <Button title={t('Rad etish')} kind="danger" loading={busy === 'REJECTED'} onPress={() => move('REJECTED', { rejectReason: reason })} style={{ flex: 1 }} />
            </View>
          </Card>
        )}

        {order.status === 'ACCEPTED' && manager && me && me.couriers.length > 0 && (
          <>
            <SectionTitle>{t('Yetkazuvchi')}</SectionTitle>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {me.couriers.map((cr) => (
                <Chip key={cr.id} label={cr.name} active={courierId === cr.id} onPress={() => setCourierId(courierId === cr.id ? null : cr.id)} />
              ))}
            </View>
          </>
        )}

        {err && <Banner tone="danger">{err}</Banner>}
      </Screen>

      {hasFooter && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, gap: 8, backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.border }}>
          {order.status === 'SENT' && manager && !rejecting && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title={t('Rad etish')} kind="danger" onPress={() => setRejecting(true)} style={{ flex: 1 }} />
              <Button title={t('Qabul qilish')} icon="checkmark" loading={busy === 'ACCEPTED'} onPress={() => move('ACCEPTED')} style={{ flex: 2 }} />
            </View>
          )}
          {order.status === 'ACCEPTED' && manager && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title={t('Bekor qilish')} kind="danger" loading={busy === 'CANCELLED'} onPress={cancelAccepted} style={{ flex: 1 }} />
              <Button title={t("Yo'lga chiqarish")} icon="car-outline" loading={busy === 'IN_DELIVERY'} onPress={() => move('IN_DELIVERY', { courierId })} style={{ flex: 2 }} />
            </View>
          )}
          {mayDeliver && (
            <Button
              title={cash ? t('Topshirildi · {sum}, naqd olindi', { sum: formatSom(deliveredTotal) }) : t('Topshirildi · {sum}', { sum: formatSom(deliveredTotal) })}
              icon="checkmark-done"
              loading={busy === 'DELIVERED'}
              onPress={deliver}
            />
          )}
        </View>
      )}
    </View>
  );
}
