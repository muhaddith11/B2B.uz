import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AuthImage } from '@/components/auth-image';
import { Badge, Button, Card, Empty, ErrorText, Field, Loading, Screen, SectionTitle, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useStaff } from '@/context/staff';
import { formatDate, formatSom } from '@/lib/money';
import { CHANNEL_LABEL, type StaffPayment } from '@/lib/staff-types';
import { useLoad } from '@/lib/use-load';

// Chek bilan kelgan to'lovlarni tasdiqlash va oxirgi to'lovlar
export default function StaffPayments() {
  const { data, error, refreshing, reload } = useLoad<{ pending: StaffPayment[]; recent: StaffPayment[] }>('/api/staff/payments');
  if (error && !data) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;
  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <SectionTitle>Tasdiq kutayotganlar</SectionTitle>
      {data.pending.map((p) => (
        <PendingCard key={p.id} p={p} onDone={reload} />
      ))}
      {data.pending.length === 0 && <Empty>Tasdiq kutayotgan to'lov yo'q</Empty>}

      <SectionTitle>Oxirgi to'lovlar</SectionTitle>
      {data.recent.map((p) => (
        <Card key={p.id} style={{ gap: 2, opacity: p.status === 'REJECTED' ? 0.6 : 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <T size="small" bold style={{ flex: 1 }} onPress={() => router.push(`/staff/shop/${p.linkId}`)}>
              {p.shop}
            </T>
            <T size="small" bold tone={p.status === 'REJECTED' ? 'hint' : 'ok'}>
              {formatSom(p.amount)}
            </T>
          </View>
          <T size="tiny" tone="hint">
            {formatDate(p.date)} · {CHANNEL_LABEL[p.channel ?? ''] ?? '—'}
            {p.status === 'REJECTED' ? ' · rad etilgan' : ''}
            {p.note ? ` · ${p.note}` : ''}
          </T>
        </Card>
      ))}
    </Screen>
  );
}

function PendingCard({ p, onDone }: { p: StaffPayment; onDone: () => void }) {
  const c = usePalette();
  const { api } = useSession();
  const { can } = useStaff();
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function act(action: 'confirm' | 'reject') {
    setBusy(action);
    setErr(null);
    try {
      await api(`/api/staff/payments/${p.id}`, { method: 'POST', body: JSON.stringify({ action, reason: reason || undefined }) });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <Card style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <T bold style={{ flex: 1 }} onPress={() => router.push(`/staff/shop/${p.linkId}`)}>
          {p.shop}
        </T>
        <T bold>{formatSom(p.amount)}</T>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Badge label={CHANNEL_LABEL[p.channel ?? ''] ?? "To'lov"} tone="accent" />
        <T size="tiny" tone="hint">
          {formatDate(p.date)}
          {p.method?.number ? ` · ${p.method.number.slice(-4)} ga` : ''}
        </T>
      </View>
      {p.note && <T size="small">{p.note}</T>}
      {p.receiptUrl ? (
        <AuthImage path={p.receiptUrl} style={{ width: '100%', height: 320, borderRadius: 8, backgroundColor: c.bg }} />
      ) : (
        <T size="small" tone="hint">
          Chek rasmi biriktirilmagan
        </T>
      )}
      {can('ADMIN', 'ACCOUNTANT') && (
        <>
          {rejecting && <Field label="Rad etish sababi" value={reason} onChangeText={setReason} placeholder="Masalan: pul tushmagan" />}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {!rejecting && <Button title="Tasdiqlash" style={{ flex: 2 }} loading={busy === 'confirm'} onPress={() => act('confirm')} />}
            <Button title="Rad etish" kind="danger" style={{ flex: 1 }} loading={busy === 'reject'} onPress={() => (rejecting ? act('reject') : setRejecting(true))} />
          </View>
        </>
      )}
      {err && (
        <T size="small" tone="danger">
          {err}
        </T>
      )}
    </Card>
  );
}
