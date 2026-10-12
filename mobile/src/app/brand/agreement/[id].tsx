import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Badge, Button, Card, ErrorText, Loading, PressCard, Row, Screen, SectionTitle, T } from '@/components/ui';
import { useSession } from '@/context/session';
import { formatDate, formatSom } from '@/lib/money';
import { AGREEMENT_LABEL, BRAND_ORDER_LABEL, type BrandAgreementDetail } from '@/lib/staff-types';
import { useLoad } from '@/lib/use-load';

// Kelishuv: shartlar, javob berish, distribyutor katalogidagi tovarlarimiz va xarid buyurtmalari
export default function BrandAgreement() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useSession();
  const { data, error, refreshing, reload } = useLoad<BrandAgreementDetail>(`/api/brand/agreements/${id}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (error && !data) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;
  const a = data.agreement;

  async function act(action: 'accept' | 'reject' | 'end') {
    setBusy(action);
    setErr(null);
    try {
      await api(`/api/brand/agreements/${id}`, { method: 'POST', body: JSON.stringify({ action }) });
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Card style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <T size="h2" style={{ flex: 1 }}>
            {data.distributor.name}
          </T>
          <Badge label={AGREEMENT_LABEL[a.status]} tone={a.status === 'ACTIVE' ? 'ok' : a.status === 'PROPOSED' ? 'accent' : 'hint'} />
        </View>
        <Row label="Taklif qilgan" value={a.initiatedBy === 'BRAND' ? 'Siz' : 'Distribyutor'} />
        <Row label="Savdo hududi" value={a.districts.join(', ')} />
        <Row label="Chegirma" value={`${a.discountPercent}%`} />
        <Row label="Sana" value={formatDate(a.createdAt)} />
        <Row label="Distribyutor qamrovi" value={`${data.distributor.shops} ta do'kon`} />
        {a.terms && <T size="small">{a.terms}</T>}
      </Card>

      {a.status === 'PROPOSED' && a.initiatedBy === 'DISTRIBUTOR' && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="Qabul qilish" style={{ flex: 2 }} loading={busy === 'accept'} onPress={() => act('accept')} />
          <Button title="Rad etish" kind="danger" style={{ flex: 1 }} loading={busy === 'reject'} onPress={() => act('reject')} />
        </View>
      )}
      {a.status === 'PROPOSED' && a.initiatedBy === 'BRAND' && (
        <T size="small" tone="accent">
          Distribyutor javobi kutilmoqda
        </T>
      )}
      {a.status === 'ACTIVE' && <Button title="Kelishuvni tugatish" kind="danger" loading={busy === 'end'} onPress={() => act('end')} />}

      {data.listed.length > 0 && (
        <>
          <SectionTitle>Distribyutor katalogida</SectionTitle>
          <Card style={{ gap: 6 }}>
            {data.listed.map((p) => (
              <Row key={p.name} label={`${p.name}${!p.active ? ' (nofaol)' : !p.inStock ? ' (tugagan)' : ''}`} value={p.price ? formatSom(p.price) : '—'} />
            ))}
          </Card>
        </>
      )}

      {data.orders.length > 0 && <SectionTitle>Xarid buyurtmalari</SectionTitle>}
      {data.orders.map((o) => (
        <PressCard key={o.id} onPress={() => router.push(`/brand/order/${o.id}`)}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T bold>
              №{o.number} · {formatSom(o.total)}
            </T>
            <Badge label={BRAND_ORDER_LABEL[o.status]} tone={o.status === 'DELIVERED' ? 'ok' : o.status === 'SENT' ? 'accent' : 'hint'} />
          </View>
          <T size="tiny" tone="hint">
            {formatDate(o.createdAt)}
          </T>
        </PressCard>
      ))}

      {err && (
        <T size="small" tone="danger">
          {err}
        </T>
      )}
    </Screen>
  );
}
