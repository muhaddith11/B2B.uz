import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Badge, Banner, Button, Card, ErrorState, Field, Loading, Pic, QtyStepper, Row, Screen, SectionTitle, T, Thumb } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { confirm } from '@/lib/confirm';
import { haptic } from '@/lib/haptics';
import { t, tx } from '@/lib/i18n';
import { formatDate, formatSom } from '@/lib/money';
import { agreementLabel, brandOrderLabel, type BrandForStaff } from '@/lib/staff-types';
import { useLoad } from '@/lib/use-load';

// Tovar egasi: kelishuv (taklif, qabul, tugatish), tovarlarini katalogga qo'shish va xarid buyurtmasi
export default function StaffBrand() {
  const c = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useSession();
  const { data, error, refreshing, reload, retry } = useLoad<BrandForStaff>(`/api/staff/brands/${id}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [terms, setTerms] = useState('');
  const [discount, setDiscount] = useState('');
  const [sellPrice, setSellPrice] = useState<Record<string, string>>({});
  const [orderQty, setOrderQty] = useState<Record<string, number>>({});

  if (error && !data) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return <Loading rows={3} />;
  const a = data.agreement;
  const active = a?.status === 'ACTIVE';
  const orderTotal = data.products.reduce((s, p) => s + (orderQty[p.id] ?? 0) * p.purchasePrice, 0);

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setErr(null);
    try {
      await fn();
      haptic.success();
      await reload();
    } catch (e) {
      setErr((e as Error).message);
      haptic.error();
    } finally {
      setBusy(null);
    }
  }

  const post = (path: string, body: unknown) => api(path, { method: 'POST', body: JSON.stringify(body) });

  async function endAgreement(agreementId: string) {
    const ok = await confirm({ title: t('Kelishuv tugatilsinmi?'), message: t('Tovar egasining tovarlari katalogingizdan olinadi.'), action: t('Tugatish') });
    if (ok) run('end', () => post(`/api/staff/agreements/${agreementId}`, { action: 'end' }));
  }

  async function cancelOrder(orderId: string) {
    const ok = await confirm({ title: t('Xarid buyurtmasi bekor qilinsinmi?'), action: t('Bekor qilish') });
    if (ok) run(`c-${orderId}`, () => post(`/api/staff/brand-orders/${orderId}`, { to: 'CANCELLED' }));
  }

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Stack.Screen options={{ title: data.brand.name }} />
      <Card style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <Pic uri={data.brand.logoUrl} name={data.brand.name} size={52} />
          <T size="h2" style={{ flex: 1 }}>
            {data.brand.name}
          </T>
        </View>
        <T size="small" tone="hint">
          {data.brand.categories.join(', ')}
          {data.brand.inn ? ` · ${t('STIR {inn}', { inn: data.brand.inn })}` : ''}
        </T>
        {data.brand.description && <T size="small">{data.brand.description}</T>}
      </Card>

      <SectionTitle right={a ? <Badge label={agreementLabel(a.status)} tone={active ? 'ok' : a.status === 'PROPOSED' ? 'accent' : 'hint'} /> : undefined}>{t('Kelishuv')}</SectionTitle>
      {a && (a.status === 'ACTIVE' || a.status === 'PROPOSED') ? (
        <Card style={{ gap: 6 }}>
          <Row label={t('Chegirma')} value={`${a.discountPercent}%`} />
          <Row label={t('Hudud')} value={a.districts.join(', ') || '—'} />
          <Row label={t('Sana')} value={formatDate(a.createdAt)} />
          {a.terms && <T size="small">{a.terms}</T>}
          {a.status === 'PROPOSED' && a.initiatedBy === 'BRAND' && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Button title={t('Qabul qilish')} style={{ flex: 2 }} loading={busy === 'accept'} onPress={() => run('accept', () => post(`/api/staff/agreements/${a.id}`, { action: 'accept' }))} />
              <Button title={t('Rad etish')} kind="danger" style={{ flex: 1 }} loading={busy === 'reject'} onPress={() => run('reject', () => post(`/api/staff/agreements/${a.id}`, { action: 'reject' }))} />
            </View>
          )}
          {a.status === 'PROPOSED' && a.initiatedBy === 'DISTRIBUTOR' && (
            <T size="small" tone="accent">
              {t('Taklifingiz yuborilgan, tovar egasi javobi kutilmoqda')}
            </T>
          )}
          {active && <Button title={t('Kelishuvni tugatish')} kind="danger" compact loading={busy === 'end'} onPress={() => endAgreement(a.id)} />}
        </Card>
      ) : (
        <Card style={{ gap: 8 }}>
          {a && (
            <T size="small" tone="hint">
              {t('Oldingi kelishuv: {status}', { status: agreementLabel(a.status).toLowerCase() })}
            </T>
          )}
          <Field label={t("So'raladigan chegirma, % (ixtiyoriy)")} value={discount} onChangeText={(v) => setDiscount(v.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" />
          <Field label={t('Shartlaringiz (ixtiyoriy)')} value={terms} onChangeText={setTerms} multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />
          <Button
            title={t('Hamkorlik taklif qilish')}
            loading={busy === 'propose'}
            onPress={() => run('propose', () => post('/api/staff/agreements', { brandId: id, discountPercent: Number(discount) || 0, terms: terms || undefined }))}
          />
        </Card>
      )}

      <SectionTitle>{t('Tovarlari')}</SectionTitle>
      {active && <Banner tone="accent">{t("Tovarni katalogingizga qo'shing: do'konlarga sotish narxini yozing. Xarid uchun yashik sonini tanlang.")}</Banner>}
      {data.products.map((p) => (
        <Card key={p.id} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {p.imageUrl ? <Thumb uri={p.imageUrl} name={p.name} size={56} /> : null}
            <View style={{ flex: 1, gap: 2 }}>
              <T bold>{p.name}</T>
              <T size="tiny" tone="hint">
                {p.category} · {t('yashikda {n} {unit}', { n: p.packSize, unit: tx(p.unit) })}
              </T>
            </View>
          </View>
          <Row label={t('Tovar egasi narxi')} value={formatSom(p.price)} />
          {active && p.purchasePrice !== p.price && <Row label={t('Sizga (chegirma bilan)')} value={formatSom(p.purchasePrice)} tone="ok" />}
          {p.retailPrice && <Row label={t('Tavsiya chakana narx')} value={formatSom(p.retailPrice)} />}
          {p.inCatalog && <Row label={t('Katalogingizda')} value={p.inCatalog.active ? formatSom(p.inCatalog.price ?? 0) : t('nofaol')} tone="accent" />}
          {active && (
            <View style={{ gap: 8, marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.border }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <Field
                    label={t("Do'konlarga sotish narxi, so'm")}
                    value={sellPrice[p.id] ?? (p.inCatalog?.price ? String(p.inCatalog.price) : '')}
                    onChangeText={(v) => setSellPrice((s) => ({ ...s, [p.id]: v.replace(/\D/g, '') }))}
                    keyboardType="number-pad"
                  />
                </View>
                <Button
                  title={p.inCatalog ? t('Yangilash') : t("Katalogga qo'shish")}
                  compact
                  loading={busy === `imp-${p.id}`}
                  disabled={!Number(sellPrice[p.id] ?? p.inCatalog?.price)}
                  onPress={() => run(`imp-${p.id}`, () => post(`/api/staff/agreements/${a.id}/import`, { brandProductId: p.id, price: Number(sellPrice[p.id] ?? p.inCatalog?.price) }))}
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <T size="small" tone="hint">
                  {t('Xarid')}
                </T>
                <QtyStepper packs={Math.floor((orderQty[p.id] ?? 0) / p.packSize)} onChange={(n) => setOrderQty((q) => ({ ...q, [p.id]: Math.max(0, n) * p.packSize }))} />
              </View>
            </View>
          )}
        </Card>
      ))}
      {active && orderTotal > 0 && (
        <Button
          title={t('Xarid buyurtmasini yuborish · {sum}', { sum: formatSom(orderTotal) })}
          loading={busy === 'order'}
          onPress={() =>
            run('order', async () => {
              await post('/api/staff/brand-orders', {
                agreementId: a.id,
                items: Object.entries(orderQty)
                  .filter(([, q]) => q > 0)
                  .map(([brandProductId, qty]) => ({ brandProductId, qty })),
              });
              setOrderQty({});
            })
          }
        />
      )}

      {data.orders.length > 0 && <SectionTitle>{t('Xarid buyurtmalari')}</SectionTitle>}
      {data.orders.map((o) => (
        <Card key={o.id} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T bold num>
              №{o.number}
            </T>
            <Badge label={brandOrderLabel(o.status)} tone={o.status === 'DELIVERED' ? 'ok' : o.status === 'REJECTED' || o.status === 'CANCELLED' ? 'danger' : 'accent'} />
          </View>
          <T size="tiny" tone="hint" num>
            {formatDate(o.createdAt)} · {o.items.map((i) => `${i.name} × ${i.qty}`).join(', ')}
          </T>
          <Row label={t('Jami')} value={formatSom(o.total)} />
          {o.rejectReason && <Row label={t('Sabab')} value={o.rejectReason} tone="danger" />}
          {o.status === 'SHIPPED' && (
            <Button title={t('Qabul qilib oldim')} compact loading={busy === `d-${o.id}`} onPress={() => run(`d-${o.id}`, () => post(`/api/staff/brand-orders/${o.id}`, { to: 'DELIVERED' }))} />
          )}
          {o.status === 'SENT' && <Button title={t('Bekor qilish')} kind="danger" compact loading={busy === `c-${o.id}`} onPress={() => cancelOrder(o.id)} />}
        </Card>
      ))}

      {err && <Banner tone="danger">{err}</Banner>}
    </Screen>
  );
}
