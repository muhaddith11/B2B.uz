import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AuthImage } from '@/components/auth-image';
import { Badge, Banner, Button, Card, Empty, ErrorState, Field, Loading, Screen, SectionTitle, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useStaff } from '@/context/staff';
import { confirm } from '@/lib/confirm';
import { haptic } from '@/lib/haptics';
import { t, txNote } from '@/lib/i18n';
import { formatDate, formatSom } from '@/lib/money';
import { channelLabel, type StaffPayment } from '@/lib/staff-types';
import { useLoad } from '@/lib/use-load';

// Chek bilan kelgan to'lovlarni tasdiqlash va oxirgi to'lovlar
export default function StaffPayments() {
  const { data, error, refreshing, reload, retry } = useLoad<{ pending: StaffPayment[]; recent: StaffPayment[] }>('/api/staff/payments');
  if (error && !data) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return <Loading rows={2} />;
  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <SectionTitle>{t('Tasdiq kutayotganlar')}</SectionTitle>
      {data.pending.map((p) => (
        <PendingCard key={p.id} p={p} onDone={reload} />
      ))}
      {data.pending.length === 0 && <Empty icon="document-text-outline">{t("Tasdiq kutayotgan to'lov yo'q")}</Empty>}

      <SectionTitle>{t("Oxirgi to'lovlar")}</SectionTitle>
      {data.recent.map((p) => (
        <Card key={p.id} style={{ gap: 2, opacity: p.status === 'REJECTED' ? 0.6 : 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <T size="small" bold style={{ flex: 1 }} accessibilityRole="link" onPress={() => router.push(`/staff/shop/${p.linkId}`)}>
              {p.shop}
            </T>
            <T size="small" bold num tone={p.status === 'REJECTED' ? 'hint' : 'ok'}>
              {formatSom(p.amount)}
            </T>
          </View>
          <T size="tiny" tone="hint" num>
            {formatDate(p.date)} · {channelLabel(p.channel)}
            {p.status === 'REJECTED' ? ` · ${t('rad etilgan')}` : ''}
            {p.note ? ` · ${txNote(p.note)}` : ''}
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
    if (action === 'reject') {
      const ok = await confirm({ title: t("To'lov rad etilsinmi?"), message: t("Do'kon qarzi o'zgarmaydi, do'konga sabab bilan xabar boradi."), action: t('Rad etish') });
      if (!ok) return;
    }
    setBusy(action);
    setErr(null);
    try {
      await api(`/api/staff/payments/${p.id}`, { method: 'POST', body: JSON.stringify({ action, reason: reason || undefined }) });
      if (action === 'confirm') haptic.success();
      onDone();
    } catch (e) {
      setErr((e as Error).message);
      haptic.error();
      setBusy(null);
    }
  }

  return (
    <Card style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <T bold style={{ flex: 1 }} accessibilityRole="link" onPress={() => router.push(`/staff/shop/${p.linkId}`)}>
          {p.shop}
        </T>
        <T bold num>
          {formatSom(p.amount)}
        </T>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Badge label={p.channel ? channelLabel(p.channel) : t("To'lov")} tone="accent" />
        <T size="tiny" tone="hint" num>
          {formatDate(p.date)}
          {p.method?.number ? ` · ${t('{last4} ga', { last4: p.method.number.slice(-4) })}` : ''}
        </T>
      </View>
      {p.note && <T size="small">{p.note}</T>}
      {p.receiptUrl ? (
        <AuthImage path={p.receiptUrl} style={{ width: '100%', height: 320, borderRadius: 8, backgroundColor: c.bg }} />
      ) : (
        <T size="small" tone="hint">
          {t('Chek rasmi biriktirilmagan')}
        </T>
      )}
      {can('ADMIN', 'ACCOUNTANT') && (
        <>
          {rejecting && <Field label={t('Rad etish sababi')} value={reason} onChangeText={setReason} placeholder={t('Masalan: pul tushmagan')} autoFocus />}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {rejecting ? (
              <Button title={t('Ortga')} kind="secondary" style={{ flex: 1 }} onPress={() => setRejecting(false)} />
            ) : (
              <Button title={t('Tasdiqlash')} style={{ flex: 2 }} loading={busy === 'confirm'} onPress={() => act('confirm')} />
            )}
            <Button title={t('Rad etish')} kind="danger" style={{ flex: 1 }} loading={busy === 'reject'} onPress={() => (rejecting ? act('reject') : setRejecting(true))} />
          </View>
        </>
      )}
      {err && <Banner tone="danger">{err}</Banner>}
    </Card>
  );
}
