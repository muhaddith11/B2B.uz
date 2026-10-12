import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Badge, Banner, Button, Card, ErrorText, Field, Loading, QtyStepper, Row, Screen, SectionTitle, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { formatDate, formatSom } from '@/lib/money';
import { AGREEMENT_LABEL, BRAND_ORDER_LABEL, type BrandForStaff } from '@/lib/staff-types';
import { useLoad } from '@/lib/use-load';

// Tovar egasi: kelishuv (taklif, qabul, tugatish), tovarlarini katalogga qo'shish va xarid buyurtmasi
export default function StaffBrand() {
  const c = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useSession();
  const { data, error, refreshing, reload } = useLoad<BrandForStaff>(`/api/staff/brands/${id}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [terms, setTerms] = useState('');
  const [discount, setDiscount] = useState('');
  const [sellPrice, setSellPrice] = useState<Record<string, string>>({});
  const [orderQty, setOrderQty] = useState<Record<string, number>>({});

  if (error && !data) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;
  const a = data.agreement;
  const active = a?.status === 'ACTIVE';
  const orderTotal = data.products.reduce((s, p) => s + (orderQty[p.id] ?? 0) * p.purchasePrice, 0);

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setErr(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const post = (path: string, body: unknown) => api(path, { method: 'POST', body: JSON.stringify(body) });

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Stack.Screen options={{ title: data.brand.name }} />
      <Card style={{ gap: 4 }}>
        <T size="h2">{data.brand.name}</T>
        <T size="small" tone="hint">
          {data.brand.categories.join(', ')}
          {data.brand.inn ? ` · STIR ${data.brand.inn}` : ''}
        </T>
        {data.brand.description && <T size="small">{data.brand.description}</T>}
      </Card>

      <SectionTitle right={a ? <Badge label={AGREEMENT_LABEL[a.status]} tone={active ? 'ok' : a.status === 'PROPOSED' ? 'accent' : 'hint'} /> : undefined}>Kelishuv</SectionTitle>
      {a && (a.status === 'ACTIVE' || a.status === 'PROPOSED') ? (
        <Card style={{ gap: 6 }}>
          <Row label="Chegirma" value={`${a.discountPercent}%`} />
          <Row label="Hudud" value={a.districts.join(', ') || '—'} />
          <Row label="Sana" value={formatDate(a.createdAt)} />
          {a.terms && <T size="small">{a.terms}</T>}
          {a.status === 'PROPOSED' && a.initiatedBy === 'BRAND' && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Button title="Qabul qilish" style={{ flex: 2 }} loading={busy === 'accept'} onPress={() => run('accept', () => post(`/api/staff/agreements/${a.id}`, { action: 'accept' }))} />
              <Button title="Rad etish" kind="danger" style={{ flex: 1 }} loading={busy === 'reject'} onPress={() => run('reject', () => post(`/api/staff/agreements/${a.id}`, { action: 'reject' }))} />
            </View>
          )}
          {a.status === 'PROPOSED' && a.initiatedBy === 'DISTRIBUTOR' && (
            <T size="small" tone="accent">
              Taklifingiz yuborilgan, tovar egasi javobi kutilmoqda
            </T>
          )}
          {active && <Button title="Kelishuvni tugatish" kind="danger" compact loading={busy === 'end'} onPress={() => run('end', () => post(`/api/staff/agreements/${a.id}`, { action: 'end' }))} />}
        </Card>
      ) : (
        <Card style={{ gap: 8 }}>
          {a && (
            <T size="small" tone="hint">
              Oldingi kelishuv: {AGREEMENT_LABEL[a.status].toLowerCase()}
            </T>
          )}
          <Field label="So'raladigan chegirma, % (ixtiyoriy)" value={discount} onChangeText={(v) => setDiscount(v.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" />
          <Field label="Shartlaringiz (ixtiyoriy)" value={terms} onChangeText={setTerms} multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />
          <Button
            title="Hamkorlik taklif qilish"
            loading={busy === 'propose'}
            onPress={() => run('propose', () => post('/api/staff/agreements', { brandId: id, discountPercent: Number(discount) || 0, terms: terms || undefined }))}
          />
        </Card>
      )}

      <SectionTitle>Tovarlari</SectionTitle>
      {active && <Banner tone="accent">Tovarni katalogingizga qo'shing: do'konlarga sotish narxini yozing. Xarid uchun yashik sonini tanlang.</Banner>}
      {data.products.map((p) => (
        <Card key={p.id} style={{ gap: 4 }}>
          <T bold>{p.name}</T>
          <T size="tiny" tone="hint">
            {p.category} · yashikda {p.packSize} {p.unit}
          </T>
          <Row label="Tovar egasi narxi" value={formatSom(p.price)} />
          {active && p.purchasePrice !== p.price && <Row label="Sizga (chegirma bilan)" value={formatSom(p.purchasePrice)} tone="ok" />}
          {p.retailPrice && <Row label="Tavsiya chakana narx" value={formatSom(p.retailPrice)} />}
          {p.inCatalog && <Row label="Katalogingizda" value={p.inCatalog.active ? formatSom(p.inCatalog.price ?? 0) : 'nofaol'} tone="accent" />}
          {active && (
            <View style={{ gap: 8, marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.border }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Do'konlarga sotish narxi, so'm"
                    value={sellPrice[p.id] ?? (p.inCatalog?.price ? String(p.inCatalog.price) : '')}
                    onChangeText={(v) => setSellPrice((s) => ({ ...s, [p.id]: v.replace(/\D/g, '') }))}
                    keyboardType="number-pad"
                  />
                </View>
                <Button
                  title={p.inCatalog ? 'Yangilash' : "Katalogga qo'shish"}
                  compact
                  loading={busy === `imp-${p.id}`}
                  disabled={!Number(sellPrice[p.id] ?? p.inCatalog?.price)}
                  onPress={() => run(`imp-${p.id}`, () => post(`/api/staff/agreements/${a!.id}/import`, { brandProductId: p.id, price: Number(sellPrice[p.id] ?? p.inCatalog?.price) }))}
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <T size="small" tone="hint">
                  Xarid
                </T>
                <QtyStepper packs={Math.floor((orderQty[p.id] ?? 0) / p.packSize)} onChange={(n) => setOrderQty((q) => ({ ...q, [p.id]: Math.max(0, n) * p.packSize }))} />
              </View>
            </View>
          )}
        </Card>
      ))}
      {active && orderTotal > 0 && (
        <Button
          title={`Xarid buyurtmasini yuborish · ${formatSom(orderTotal)}`}
          loading={busy === 'order'}
          onPress={() =>
            run('order', async () => {
              await post('/api/staff/brand-orders', {
                agreementId: a!.id,
                items: Object.entries(orderQty)
                  .filter(([, q]) => q > 0)
                  .map(([brandProductId, qty]) => ({ brandProductId, qty })),
              });
              setOrderQty({});
            })
          }
        />
      )}

      {data.orders.length > 0 && <SectionTitle>Xarid buyurtmalari</SectionTitle>}
      {data.orders.map((o) => (
        <Card key={o.id} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T bold>№{o.number}</T>
            <Badge label={BRAND_ORDER_LABEL[o.status]} tone={o.status === 'DELIVERED' ? 'ok' : o.status === 'REJECTED' || o.status === 'CANCELLED' ? 'danger' : 'accent'} />
          </View>
          <T size="tiny" tone="hint">
            {formatDate(o.createdAt)} · {o.items.map((i) => `${i.name} × ${i.qty}`).join(', ')}
          </T>
          <Row label="Jami" value={formatSom(o.total)} />
          {o.rejectReason && <Row label="Sabab" value={o.rejectReason} tone="danger" />}
          {o.status === 'SHIPPED' && <Button title="Qabul qilib oldim" compact loading={busy === `d-${o.id}`} onPress={() => run(`d-${o.id}`, () => post(`/api/staff/brand-orders/${o.id}`, { to: 'DELIVERED' }))} />}
          {o.status === 'SENT' && <Button title="Bekor qilish" kind="danger" compact loading={busy === `c-${o.id}`} onPress={() => run(`c-${o.id}`, () => post(`/api/staff/brand-orders/${o.id}`, { to: 'CANCELLED' }))} />}
        </Card>
      ))}

      {err && (
        <T size="small" tone="danger">
          {err}
        </T>
      )}
    </Screen>
  );
}
