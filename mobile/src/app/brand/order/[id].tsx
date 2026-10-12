import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Badge, Button, Card, ErrorText, Field, Loading, Row, Screen, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { formatDate, formatSom } from '@/lib/money';
import { BRAND_ORDER_LABEL, type BrandOrderRow } from '@/lib/staff-types';
import { useLoad } from '@/lib/use-load';

// Xarid buyurtmasi: qabul qilish, rad etish, jo'natish
export default function BrandOrder() {
  const c = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useSession();
  const { data, error, reload } = useLoad<{ order: BrandOrderRow }>(`/api/brand/orders/${id}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);

  if (error && !data) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;
  const o = data.order;

  async function move(to: 'ACCEPTED' | 'REJECTED' | 'SHIPPED') {
    setBusy(to);
    setErr(null);
    try {
      await api(`/api/brand/orders/${id}`, { method: 'POST', body: JSON.stringify({ to, rejectReason: to === 'REJECTED' ? reason : undefined }) });
      setRejecting(false);
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T size="h2">№{o.number}</T>
          <Badge label={BRAND_ORDER_LABEL[o.status]} tone={o.status === 'DELIVERED' ? 'ok' : 'accent'} />
        </View>
        <Row label="Distribyutor" value={o.distributor} />
        <Row label="Sana" value={formatDate(o.createdAt)} />
        {o.note && <Row label="Izoh" value={o.note} />}
        {o.rejectReason && <Row label="Rad etish sababi" value={o.rejectReason} tone="danger" />}
      </Card>
      <Card style={{ gap: 8 }}>
        {o.items.map((i) => (
          <View key={i.name} style={{ gap: 2 }}>
            <Row label={i.name} value={formatSom(i.qty * i.price)} />
            <T size="tiny" tone="hint">
              {i.qty} {i.unit} ({i.qty / i.packSize} yashik) × {formatSom(i.price)}
            </T>
          </View>
        ))}
        <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8 }}>
          <Row label="Jami" value={formatSom(o.total)} />
        </View>
      </Card>

      {o.status === 'SENT' && (
        <View style={{ gap: 8 }}>
          <Button title="Qabul qilish" loading={busy === 'ACCEPTED'} onPress={() => move('ACCEPTED')} />
          {rejecting && <Field label="Rad etish sababi" value={reason} onChangeText={setReason} />}
          <Button title="Rad etish" kind="danger" loading={busy === 'REJECTED'} onPress={() => (rejecting ? move('REJECTED') : setRejecting(true))} />
        </View>
      )}
      {o.status === 'ACCEPTED' && <Button title="Jo'natildi" loading={busy === 'SHIPPED'} onPress={() => move('SHIPPED')} />}
      {o.status === 'SHIPPED' && (
        <T size="small" tone="hint">
          Distribyutor qabul qilib olgach, buyurtma yopiladi.
        </T>
      )}
      {err && (
        <T size="small" tone="danger">
          {err}
        </T>
      )}
    </Screen>
  );
}
