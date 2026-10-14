import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { Banner, Button, Card, Chip, Divider, ErrorText, Field, IconButton, Loading, Money, QtyStepper, Row, Screen, SectionTitle, StatusBadge, StatusSteps, T } from '@/components/ui';
import { R, usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useStaff } from '@/context/staff';
import { formatDate, formatSom } from '@/lib/money';
import type { StaffOrder } from '@/lib/staff-types';
import { PAYMENT_LABEL } from '@/lib/types';
import { useLoad } from '@/lib/use-load';

// Buyurtma: qabul qilish, rad etish, yo'lga chiqarish (yetkazuvchi bilan), topshirish (qisman ham)
export default function StaffOrderScreen() {
  const c = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useSession();
  const { me, can } = useStaff();
  const { data, error, reload } = useLoad<{ order: StaffOrder }>(`/api/staff/orders/${id}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [courierId, setCourierId] = useState<string | null>(null);
  const [delivered, setDelivered] = useState<Record<string, number>>({});

  const order = data?.order;

  if (error && !data) return <ErrorText>{error}</ErrorText>;
  if (!order) return <Loading />;

  const manager = can('ADMIN', 'OPERATOR');
  const mayDeliver = order.status === 'IN_DELIVERY' && (manager || (can('COURIER') && (!order.courier || order.courier.id === me?.staff.id)));
  const deliveredTotal = order.items.reduce((s, i) => s + (delivered[i.id] ?? i.qty) * i.price, 0);
  const hasFooter = (order.status === 'SENT' && manager) || (order.status === 'ACCEPTED' && manager) || mayDeliver;

  async function move(to: string, extra: Record<string, unknown> = {}) {
    setBusy(to);
    setErr(null);
    try {
      await api(`/api/staff/orders/${id}`, { method: 'POST', body: JSON.stringify({ to, ...extra }) });
      setRejecting(false);
      setDelivered({});
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ title: `Buyurtma №${order.number}` }} />
      <Screen bottom={hasFooter ? 180 : 32}>
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <Money value={order.deliveredTotal ?? order.total} size="title" />
            <StatusBadge status={order.status} />
          </View>
          <StatusSteps status={order.status} />
          <Divider />
          <View style={{ gap: 6 }}>
            <Row label="Sana" value={formatDate(order.createdAt)} />
            <Row label="To'lov" value={PAYMENT_LABEL[order.paymentType]} />
            <Row label="Manba" value={order.source === 'AGENT' ? `Agent: ${order.createdBy ?? '—'}` : `Ilova: ${order.createdBy ?? '—'}`} />
            {order.courier && <Row label="Yetkazuvchi" value={order.courier.name} />}
          </View>
          {order.rejectReason && <Banner tone="danger">Rad etish sababi: {order.rejectReason}</Banner>}
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
          {order.shop.phone ? <IconButton icon="call-outline" label={`Qo'ng'iroq: ${order.shop.phone}`} tone="accent" onPress={() => Linking.openURL(`tel:${order.shop.phone}`)} /> : null}
        </Card>

        <SectionTitle right={<T size="small" tone="hint">{order.items.length} ta</T>}>Tovarlar</SectionTitle>
        <Card style={{ gap: 12 }}>
          {order.items.map((it, i) => {
            const q = delivered[it.id] ?? it.qty;
            const changed = it.deliveredQty !== null && it.deliveredQty !== it.qty;
            return (
              <View key={it.id} style={{ gap: 8 }}>
                {i > 0 && <Divider />}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T size="small" bold>
                      {it.name}
                    </T>
                    <T size="tiny" tone="hint" num>
                      {it.qty} {it.unit} × {formatSom(it.price)}
                      {changed ? ` · topshirilgan ${it.deliveredQty}` : ''}
                    </T>
                  </View>
                  <Money value={(it.deliveredQty ?? it.qty) * it.price} size="small" />
                </View>
                {mayDeliver && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <T size="tiny" tone={q !== it.qty ? 'warn' : 'hint'} num style={{ flexShrink: 1 }}>
                      Topshiriladi: {q} {it.unit}
                    </T>
                    <QtyStepper packs={Math.floor(q / it.packSize)} onChange={(n) => setDelivered((d) => ({ ...d, [it.id]: Math.min(it.qty, Math.max(0, n) * it.packSize) }))} />
                  </View>
                )}
              </View>
            );
          })}
          <Divider />
          <Row label="Jami" value={formatSom(order.total)} />
          {order.deliveredTotal !== null && <Row label="Topshirilgan" value={formatSom(order.deliveredTotal)} tone="ok" />}
        </Card>

        {order.status === 'SENT' && manager && rejecting && (
          <Card style={{ gap: 12 }}>
            <Field label="Rad etish sababi" value={reason} onChangeText={setReason} placeholder="Masalan: tovar tugagan" autoFocus />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="Ortga" kind="secondary" onPress={() => setRejecting(false)} style={{ flex: 1 }} />
              <Button title="Rad etish" kind="danger" loading={busy === 'REJECTED'} onPress={() => move('REJECTED', { rejectReason: reason })} style={{ flex: 1 }} />
            </View>
          </Card>
        )}

        {order.status === 'ACCEPTED' && manager && me && me.couriers.length > 0 && (
          <>
            <SectionTitle>Yetkazuvchi</SectionTitle>
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
              <Button title="Rad etish" kind="danger" onPress={() => setRejecting(true)} style={{ flex: 1 }} />
              <Button title="Qabul qilish" icon="checkmark" loading={busy === 'ACCEPTED'} onPress={() => move('ACCEPTED')} style={{ flex: 2 }} />
            </View>
          )}
          {order.status === 'ACCEPTED' && manager && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="Bekor qilish" kind="danger" loading={busy === 'CANCELLED'} onPress={() => move('CANCELLED')} style={{ flex: 1 }} />
              <Button title="Yo'lga chiqarish" icon="car-outline" loading={busy === 'IN_DELIVERY'} onPress={() => move('IN_DELIVERY', { courierId })} style={{ flex: 2 }} />
            </View>
          )}
          {mayDeliver && (
            <Button
              title={`Topshirildi · ${formatSom(deliveredTotal)}${order.paymentType === 'CASH' ? ', naqd olindi' : ''}`}
              icon="checkmark-done"
              loading={busy === 'DELIVERED'}
              onPress={() => move('DELIVERED', { delivered: order.items.map((i) => ({ itemId: i.id, deliveredQty: delivered[i.id] ?? i.qty })) })}
            />
          )}
        </View>
      )}
    </View>
  );
}
