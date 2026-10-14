import { useState } from 'react';
import { View } from 'react-native';

import { CallLink } from '@/components/staff';
import { Banner, Button, Card, Chip, Empty, ErrorState, Field, Loading, Screen, T } from '@/components/ui';
import { useSession } from '@/context/session';
import { useStaff } from '@/context/staff';
import { confirm } from '@/lib/confirm';
import { haptic } from '@/lib/haptics';
import { t } from '@/lib/i18n';
import { formatDate } from '@/lib/money';
import { useLoad } from '@/lib/use-load';

type Request = {
  linkId: string;
  createdAt: string;
  shop: { name: string; address: string; district: string };
  owner: { name: string; phone: string } | null;
  servesDistrict: boolean;
};

// Ilovada topib, ulanishni so'ragan do'konlar: admin narx guruhi va nasiya bilan tasdiqlaydi
export default function StaffRequests() {
  const { can } = useStaff();
  const { data, error, refreshing, reload, retry } = useLoad<{ requests: Request[] }>('/api/staff/requests');
  if (error && !data) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return <Loading rows={2} />;
  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      {!can('ADMIN') && <Banner>{t("So'rovlarni faqat admin tasdiqlaydi yoki rad etadi.")}</Banner>}
      {data.requests.map((r) => (
        <RequestCard key={r.linkId} r={r} onDone={reload} />
      ))}
      {data.requests.length === 0 && <Empty icon="person-add-outline">{t("Yangi so'rov yo'q")}</Empty>}
    </Screen>
  );
}

function RequestCard({ r, onDone }: { r: Request; onDone: () => void }) {
  const { api } = useSession();
  const { me, can } = useStaff();
  const def = me?.priceGroups.find((g) => g.isDefault)?.id ?? null;
  const [priceGroupId, setPriceGroupId] = useState<string | null>(def);
  const [creditLimit, setCreditLimit] = useState('0');
  const [creditDays, setCreditDays] = useState('14');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function act(action: 'approve' | 'reject') {
    if (action === 'reject') {
      const ok = await confirm({ title: t("{name} so'rovi rad etilsinmi?", { name: r.shop.name }), message: t("Do'konga xabar boradi."), action: t('Rad etish') });
      if (!ok) return;
    }
    setBusy(action);
    setErr(null);
    try {
      await api(`/api/staff/requests/${r.linkId}`, {
        method: 'POST',
        body: JSON.stringify(action === 'approve' ? { action, priceGroupId: priceGroupId ?? def, creditLimit: Number(creditLimit) || 0, creditDays: Number(creditDays) || 14 } : { action }),
      });
      if (action === 'approve') haptic.success();
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
        <T bold style={{ flex: 1 }}>
          {r.shop.name}
        </T>
        <T size="tiny" tone="hint" num>
          {formatDate(r.createdAt)}
        </T>
      </View>
      <T size="small" tone="hint">
        {r.shop.address}
      </T>
      <T size="small" tone={r.servesDistrict ? 'hint' : 'danger'}>
        {r.shop.district}
        {r.servesDistrict ? '' : ` · ${t('hududingizdan tashqarida')}`}
      </T>
      {r.owner && <CallLink phone={r.owner.phone} name={r.owner.name} />}
      {can('ADMIN') && (
        <View style={{ gap: 8, marginTop: 6 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {me?.priceGroups.map((g) => (
              <Chip key={g.id} label={g.name} active={(priceGroupId ?? def) === g.id} onPress={() => setPriceGroupId(g.id)} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 2 }}>
              <Field label={t("Nasiya limiti, so'm")} value={creditLimit} onChangeText={(v) => setCreditLimit(v.replace(/\D/g, ''))} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('Muddat, kun')} value={creditDays} onChangeText={(v) => setCreditDays(v.replace(/\D/g, ''))} keyboardType="number-pad" />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title={t('Tasdiqlash')} style={{ flex: 2 }} loading={busy === 'approve'} onPress={() => act('approve')} />
            <Button title={t('Rad etish')} kind="danger" style={{ flex: 1 }} loading={busy === 'reject'} onPress={() => act('reject')} />
          </View>
          {err && <Banner tone="danger">{err}</Banner>}
        </View>
      )}
    </Card>
  );
}
