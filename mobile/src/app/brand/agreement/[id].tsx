import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Badge, Banner, Button, Card, ErrorState, Loading, Pic, PressCard, Row, Screen, SectionTitle, T } from '@/components/ui';
import { useSession } from '@/context/session';
import { confirm } from '@/lib/confirm';
import { haptic } from '@/lib/haptics';
import { t } from '@/lib/i18n';
import { formatDate, formatSom } from '@/lib/money';
import { agreementLabel, brandOrderLabel, type BrandAgreementDetail } from '@/lib/staff-types';
import { useLoad } from '@/lib/use-load';

// Kelishuv: shartlar, javob berish, distribyutor katalogidagi tovarlarimiz va xarid buyurtmalari
export default function BrandAgreement() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useSession();
  const { data, error, refreshing, reload, retry } = useLoad<BrandAgreementDetail>(`/api/brand/agreements/${id}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (error && !data) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return <Loading rows={2} />;
  const a = data.agreement;

  async function act(action: 'accept' | 'reject' | 'end') {
    if (action === 'end') {
      const ok = await confirm({ title: t('Kelishuv tugatilsinmi?'), message: t('Tovarlaringiz distribyutor katalogidan olinadi.'), action: t('Tugatish') });
      if (!ok) return;
    }
    setBusy(action);
    setErr(null);
    try {
      await api(`/api/brand/agreements/${id}`, { method: 'POST', body: JSON.stringify({ action }) });
      if (action === 'accept') haptic.success();
      await reload();
    } catch (e) {
      setErr((e as Error).message);
      haptic.error();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Card style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Pic uri={data.distributor.logoUrl} name={data.distributor.name} size={44} />
          <T size="h2" style={{ flex: 1 }}>
            {data.distributor.name}
          </T>
          <Badge label={agreementLabel(a.status)} tone={a.status === 'ACTIVE' ? 'ok' : a.status === 'PROPOSED' ? 'accent' : 'hint'} />
        </View>
        <Row label={t('Taklif qilgan')} value={a.initiatedBy === 'BRAND' ? t('Siz') : t('Distribyutor')} />
        <Row label={t('Savdo hududi')} value={a.districts.join(', ')} />
        <Row label={t('Chegirma')} value={`${a.discountPercent}%`} />
        <Row label={t('Sana')} value={formatDate(a.createdAt)} />
        <Row label={t('Distribyutor qamrovi')} value={t("{n} ta do'kon", { n: data.distributor.shops })} />
        {a.terms && <T size="small">{a.terms}</T>}
      </Card>

      {a.status === 'PROPOSED' && a.initiatedBy === 'DISTRIBUTOR' && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title={t('Qabul qilish')} style={{ flex: 2 }} loading={busy === 'accept'} onPress={() => act('accept')} />
          <Button title={t('Rad etish')} kind="danger" style={{ flex: 1 }} loading={busy === 'reject'} onPress={() => act('reject')} />
        </View>
      )}
      {a.status === 'PROPOSED' && a.initiatedBy === 'BRAND' && (
        <T size="small" tone="accent">
          {t('Distribyutor javobi kutilmoqda')}
        </T>
      )}
      {a.status === 'ACTIVE' && <Button title={t('Kelishuvni tugatish')} kind="danger" loading={busy === 'end'} onPress={() => act('end')} />}

      {data.listed.length > 0 && (
        <>
          <SectionTitle>{t('Distribyutor katalogida')}</SectionTitle>
          <Card style={{ gap: 6 }}>
            {data.listed.map((p) => (
              <Row key={p.name} label={`${p.name}${!p.active ? ` ${t('(nofaol)')}` : !p.inStock ? ` ${t('(tugagan)')}` : ''}`} value={p.price ? formatSom(p.price) : '—'} />
            ))}
          </Card>
        </>
      )}

      {data.orders.length > 0 && <SectionTitle>{t('Xarid buyurtmalari')}</SectionTitle>}
      {data.orders.map((o) => (
        <PressCard key={o.id} onPress={() => router.push(`/brand/order/${o.id}`)}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <T bold num>
              №{o.number} · {formatSom(o.total)}
            </T>
            <Badge label={brandOrderLabel(o.status)} tone={o.status === 'DELIVERED' ? 'ok' : o.status === 'SENT' ? 'accent' : 'hint'} />
          </View>
          <T size="tiny" tone="hint" num>
            {formatDate(o.createdAt)}
          </T>
        </PressCard>
      ))}

      {err && <Banner tone="danger">{err}</Banner>}
    </Screen>
  );
}
