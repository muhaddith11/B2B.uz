import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Badge, Banner, Button, Card, ErrorState, Field, Loading, Row, Screen, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { haptic } from '@/lib/haptics';
import { t, tx } from '@/lib/i18n';
import { formatDate, formatSom } from '@/lib/money';
import { brandOrderLabel, type BrandOrderRow } from '@/lib/staff-types';
import { useLoad } from '@/lib/use-load';

// Xarid buyurtmasi: qabul qilish, rad etish, jo'natish
export default function BrandOrder() {
  const c = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useSession();
  const { data, error, reload, retry } = useLoad<{ order: BrandOrderRow }>(`/api/brand/orders/${id}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);

  if (error && !data) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return <Loading rows={2} />;
  const o = data.order;

  async function move(to: 'ACCEPTED' | 'REJECTED' | 'SHIPPED') {
    setBusy(to);
    setErr(null);
    try {
      await api(`/api/brand/orders/${id}`, { method: 'POST', body: JSON.stringify({ to, rejectReason: to === 'REJECTED' ? reason : undefined }) });
      setRejecting(false);
      if (to !== 'REJECTED') haptic.success();
      await reload();
    } catch (e) {
      setErr((e as Error).message);
      haptic.error();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <Card style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T size="h2" num>
            №{o.number}
          </T>
          <Badge label={brandOrderLabel(o.status)} tone={o.status === 'DELIVERED' ? 'ok' : o.status === 'REJECTED' || o.status === 'CANCELLED' ? 'danger' : 'accent'} />
        </View>
        <Row label={t('Distribyutor')} value={o.distributor} />
        <Row label={t('Sana')} value={formatDate(o.createdAt)} />
        {o.note && <Row label={t('Izoh')} value={o.note} />}
        {o.rejectReason && <Row label={t('Rad etish sababi')} value={o.rejectReason} tone="danger" />}
      </Card>
      <Card style={{ gap: 8 }}>
        {o.items.map((i) => (
          <View key={i.name} style={{ gap: 2 }}>
            <Row label={i.name} value={formatSom(i.qty * i.price)} />
            <T size="tiny" tone="hint" num>
              {t('{qty} {unit} ({packs} yashik) × {price}', { qty: i.qty, unit: tx(i.unit), packs: i.qty / i.packSize, price: formatSom(i.price) })}
            </T>
          </View>
        ))}
        <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8 }}>
          <Row label={t('Jami')} value={formatSom(o.total)} />
        </View>
      </Card>

      {o.status === 'SENT' && (
        <View style={{ gap: 8 }}>
          {!rejecting && <Button title={t('Qabul qilish')} loading={busy === 'ACCEPTED'} onPress={() => move('ACCEPTED')} />}
          {rejecting && <Field label={t('Rad etish sababi')} value={reason} onChangeText={setReason} autoFocus />}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {rejecting && <Button title={t('Ortga')} kind="secondary" style={{ flex: 1 }} onPress={() => setRejecting(false)} />}
            <Button title={t('Rad etish')} kind="danger" style={{ flex: 1 }} loading={busy === 'REJECTED'} onPress={() => (rejecting ? move('REJECTED') : setRejecting(true))} />
          </View>
        </View>
      )}
      {o.status === 'ACCEPTED' && <Button title={t("tugma|Jo'natildi")} icon="car-outline" loading={busy === 'SHIPPED'} onPress={() => move('SHIPPED')} />}
      {o.status === 'SHIPPED' && (
        <T size="small" tone="hint">
          {t('Distribyutor qabul qilib olgach, buyurtma yopiladi.')}
        </T>
      )}
      {err && <Banner tone="danger">{err}</Banner>}
    </Screen>
  );
}
