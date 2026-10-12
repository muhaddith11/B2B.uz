import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { CallLink, STATUS_TONE } from '@/components/staff';
import { Badge, Button, Card, Chip, ErrorText, Field, Loading, QtyStepper, Row, Screen, SectionTitle, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useStaff } from '@/context/staff';
import { formatDate, formatSom } from '@/lib/money';
import type { StaffOrder } from '@/lib/staff-types';
import { PAYMENT_LABEL, STATUS_LABEL } from '@/lib/types';
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
    <Screen>
      <Card style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T size="h2">№{order.number}</T>
          <Badge label={STATUS_LABEL[order.status]} tone={STATUS_TONE[order.status]} />
        </View>
        <Row label="Sana" value={formatDate(order.createdAt)} />
        <Row label="To'lov" value={PAYMENT_LABEL[order.paymentType]} />
        <Row label="Manba" value={order.source === 'AGENT' ? `Agent: ${order.createdBy ?? '—'}` : `Ilova: ${order.createdBy ?? '—'}`} />
        {order.courier && <Row label="Yetkazuvchi" value={order.courier.name} />}
        {order.rejectReason && <Row label="Rad etish sababi" value={order.rejectReason} tone="danger" />}
      </Card>

      <Card style={{ gap: 4 }}>
        <T bold onPress={() => router.push(`/staff/shop/${order.shop.linkId}`)}>
          {order.shop.name} ›
        </T>
        <T size="small" tone="hint">
          {order.shop.address}
        </T>
        {order.shop.phone && <CallLink phone={order.shop.phone} name={order.shop.owner} />}
      </Card>

      <SectionTitle>Tovarlar</SectionTitle>
      <Card style={{ gap: 10 }}>
        {order.items.map((it) => {
          const q = delivered[it.id] ?? it.qty;
          return (
            <View key={it.id} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <T size="small" style={{ flex: 1 }}>
                  {it.name}
                </T>
                <T size="small" bold>
                  {formatSom((it.deliveredQty ?? it.qty) * it.price)}
                </T>
              </View>
              <T size="tiny" tone="hint">
                {it.sku} · {it.qty} {it.unit} × {formatSom(it.price)}
                {it.deliveredQty !== null && it.deliveredQty !== it.qty ? ` · topshirilgan: ${it.deliveredQty}` : ''}
              </T>
              {mayDeliver && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <T size="tiny" tone={q !== it.qty ? 'danger' : 'hint'}>
                    Topshiriladi: {q} {it.unit}
                  </T>
                  <QtyStepper packs={Math.floor(q / it.packSize)} onChange={(n) => setDelivered((d) => ({ ...d, [it.id]: Math.min(it.qty, Math.max(0, n) * it.packSize) }))} />
                </View>
              )}
            </View>
          );
        })}
        <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8 }}>
          <Row label="Jami" value={formatSom(order.total)} />
          {order.deliveredTotal !== null && <Row label="Topshirilgan" value={formatSom(order.deliveredTotal)} tone="ok" />}
        </View>
      </Card>

      {order.status === 'SENT' && manager && (
        <View style={{ gap: 8 }}>
          <Button title="Qabul qilish" loading={busy === 'ACCEPTED'} onPress={() => move('ACCEPTED')} />
          {rejecting ? (
            <Card style={{ gap: 8 }}>
              <Field label="Rad etish sababi" value={reason} onChangeText={setReason} placeholder="Masalan: tovar tugagan" />
              <Button title="Rad etish" kind="danger" loading={busy === 'REJECTED'} onPress={() => move('REJECTED', { rejectReason: reason })} />
            </Card>
          ) : (
            <Button title="Rad etish" kind="danger" onPress={() => setRejecting(true)} />
          )}
        </View>
      )}

      {order.status === 'ACCEPTED' && manager && (
        <View style={{ gap: 8 }}>
          {me && me.couriers.length > 0 && (
            <>
              <T size="small" tone="hint">
                Yetkazuvchi
              </T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {me.couriers.map((cr) => (
                  <Chip key={cr.id} label={cr.name} active={courierId === cr.id} onPress={() => setCourierId(courierId === cr.id ? null : cr.id)} />
                ))}
              </View>
            </>
          )}
          <Button title="Yo'lga chiqarish" loading={busy === 'IN_DELIVERY'} onPress={() => move('IN_DELIVERY', { courierId })} />
          <Button title="Bekor qilish" kind="danger" loading={busy === 'CANCELLED'} onPress={() => move('CANCELLED')} />
        </View>
      )}

      {mayDeliver && (
        <Button
          title={`Topshirildi · ${formatSom(deliveredTotal)}${order.paymentType === 'CASH' ? ', naqd olindi' : ''}`}
          loading={busy === 'DELIVERED'}
          onPress={() => move('DELIVERED', { delivered: order.items.map((i) => ({ itemId: i.id, deliveredQty: delivered[i.id] ?? i.qty })) })}
        />
      )}

      {err && (
        <T size="small" tone="danger">
          {err}
        </T>
      )}
    </Screen>
  );
}
