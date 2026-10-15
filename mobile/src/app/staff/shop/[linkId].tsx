import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AuthImage } from '@/components/auth-image';
import { PicEdit } from '@/components/pic-edit';
import { CallLink, CashForm, OrderCard } from '@/components/staff';
import { AbrBar, Badge, Banner, Button, Card, Chip, ErrorState, Field, Loading, Money, Pic, Row, Screen, SectionTitle, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useStaff } from '@/context/staff';
import { confirm } from '@/lib/confirm';
import { t, txNote } from '@/lib/i18n';
import { formatDate, formatSom } from '@/lib/money';
import { channelLabel, type ShopDetail } from '@/lib/staff-types';
import { useLoad } from '@/lib/use-load';

// Do'kon kartasi: qarz, shartlar, buyurtma olish, to'lov qabul qilish, qarz daftari
export default function StaffShopScreen() {
  const c = usePalette();
  const { linkId } = useLocalSearchParams<{ linkId: string }>();
  const { can } = useStaff();
  const { data, error, refreshing, reload, retry } = useLoad<ShopDetail>(`/api/staff/shops/${linkId}`);
  const [panel, setPanel] = useState<'cash' | 'terms' | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);

  if (error && !data) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return <Loading rows={2} />;
  const s = data.summary;

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Stack.Screen options={{ title: data.shop.name }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {!data.shop.imageUrl && can('ADMIN', 'OPERATOR', 'AGENT') ? (
          // Surat yo'q: agent do'kon oldida turib qo'yadi (yetkazuvchi do'konni shundan topadi). Almashtirish do'kon egasining ishi
          <PicEdit uri={null} name={data.shop.name} size={64} label={t("Do'kon suratini qo'yish")} path={`/api/staff/shops/${linkId}/image`} field="imageUrl" onChange={() => reload()} canRemove={false} />
        ) : (
          <Pic uri={data.shop.imageUrl} name={data.shop.name} size={64} />
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <T size="h2" numberOfLines={2}>
            {data.shop.name}
          </T>
          <T size="small" tone="hint" numberOfLines={2}>
            {data.shop.address} · {data.shop.district}
          </T>
        </View>
      </View>
      <Card style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T size="small" tone="hint">
            {t('Qarz')}
          </T>
          {data.status === 'BLOCKED' && <Badge label={t('Bloklangan')} tone="danger" />}
        </View>
        <Money value={s.debt} size="title" tone={s.overdueAmount > 0 ? 'danger' : 'text'} />
        {data.terms.creditLimit > 0 && (
          <View style={{ marginVertical: 8 }}>
            <AbrBar value={s.debt / data.terms.creditLimit} dye={s.overdueAmount > 0 ? c.danger : c.accent} track={c.field} height={10} label={t('Nasiya limitidan ishlatilgani')} />
          </View>
        )}
        {s.overdueAmount > 0 && (
          <T size="small" tone="danger" num>
            {t("Muddati {n} kun o'tgan: {sum}", { n: s.overdueDays, sum: formatSom(s.overdueAmount) })}
          </T>
        )}
        {s.nextDue && <Row label={t('Eng yaqin muddat')} value={formatDate(s.nextDue)} />}
        <Row
          label={t('Nasiya limiti')}
          value={data.terms.creditLimit > 0 ? t('{sum}, {n} kun', { sum: formatSom(data.terms.creditLimit), n: data.terms.creditDays }) : t('berilmagan')}
        />
        {data.terms.creditLimit > 0 && <Row label={t("Bo'sh nasiya")} value={formatSom(s.creditAvailable)} />}
        <Row label={t('Narx guruhi')} value={data.terms.priceGroup?.name ?? t('Asosiy')} />
        <Row label={t('Agent')} value={data.terms.agent?.name ?? '—'} />
      </Card>

      <Card style={{ gap: 10 }}>
        {data.users.map((u) => (
          <View key={u.phone} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pic uri={u.avatarUrl} name={u.name} size={36} shape="circle" />
            <View style={{ flex: 1 }}>
              <CallLink phone={u.phone} name={u.name} />
            </View>
          </View>
        ))}
      </Card>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {can('ADMIN', 'OPERATOR', 'AGENT') && data.status === 'ACTIVE' && (
          <Button title={t('Buyurtma olish')} style={{ flex: 1 }} onPress={() => router.push(`/staff/new-order/${linkId}`)} />
        )}
        <Button title={t("To'lov qabul qilish")} kind="secondary" style={{ flex: 1 }} onPress={() => setPanel(panel === 'cash' ? null : 'cash')} />
      </View>
      {panel === 'cash' && (
        <Card>
          <CashForm linkId={linkId} onDone={reload} />
        </Card>
      )}
      {can('ADMIN') && (
        <Button title={panel === 'terms' ? t('Shartlarni yopish') : t("Nasiya va narx shartlarini o'zgartirish")} kind="secondary" onPress={() => setPanel(panel === 'terms' ? null : 'terms')} />
      )}
      {panel === 'terms' && (
        <TermsForm
          data={data}
          onDone={() => {
            setPanel(null);
            reload();
          }}
        />
      )}

      {data.orders.length > 0 && <SectionTitle>{t('Oxirgi buyurtmalar')}</SectionTitle>}
      {data.orders.slice(0, 5).map((o) => (
        <OrderCard key={o.id} o={o} />
      ))}

      <SectionTitle>{t('Qarz daftari')}</SectionTitle>
      <Card style={{ gap: 8 }}>
        {data.ledger.length === 0 && (
          <T size="small" tone="hint">
            {t("Yozuv yo'q")}
          </T>
        )}
        {data.ledger.map((e) => (
          <View key={e.id} style={{ gap: 2, opacity: e.status === 'REJECTED' ? 0.5 : 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <T size="small" tone="hint" num style={{ flex: 1 }}>
                {formatDate(e.date)} ·{' '}
                {e.type === 'DEBT'
                  ? t('Buyurtma №{n}', { n: e.orderNumber ?? '—' })
                  : e.type === 'PAYMENT'
                    ? t("To'lov ({channel})", { channel: channelLabel(e.channel) })
                    : t('Tuzatish')}
                {e.status === 'PENDING' ? ` · ${t('tasdiq kutilmoqda')}` : e.status === 'REJECTED' ? ` · ${t('rad etilgan')}` : ''}
              </T>
              <T size="small" num tone={e.amount < 0 ? 'ok' : 'text'} style={{ fontWeight: '500' }}>
                {formatSom(e.amount)}
              </T>
            </View>
            {e.note && (
              <T size="tiny" tone="hint">
                {txNote(e.note)}
              </T>
            )}
            {e.receiptUrl && (
              <T size="tiny" tone="accent" accessibilityRole="button" onPress={() => setReceipt(receipt === e.receiptUrl ? null : e.receiptUrl)}>
                {receipt === e.receiptUrl ? t('Chekni yopish') : t("Chekni ko'rish")}
              </T>
            )}
            {receipt === e.receiptUrl && e.receiptUrl && <AuthImage path={e.receiptUrl} style={{ width: '100%', height: 280, borderRadius: 8, backgroundColor: c.bg }} />}
          </View>
        ))}
      </Card>
    </Screen>
  );
}

function TermsForm({ data, onDone }: { data: ShopDetail; onDone: () => void }) {
  const { api } = useSession();
  const { me } = useStaff();
  const [priceGroupId, setPriceGroupId] = useState<string | null>(data.terms.priceGroup?.id ?? null);
  const [creditLimit, setCreditLimit] = useState(String(data.terms.creditLimit));
  const [creditDays, setCreditDays] = useState(String(data.terms.creditDays));
  const [blockAfterDays, setBlockAfterDays] = useState(data.terms.blockAfterDays === null ? '' : String(data.terms.blockAfterDays));
  const [agentId, setAgentId] = useState<string | null>(data.terms.agent?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(extra: Record<string, unknown> = {}) {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/staff/shops/${data.linkId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          priceGroupId,
          creditLimit: Number(creditLimit.replace(/\D/g, '')) || 0,
          creditDays: Number(creditDays) || 14,
          blockAfterDays: blockAfterDays === '' ? null : Number(blockAfterDays),
          agentId,
          ...extra,
        }),
      });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  // Bloklash do'konning ishini to'xtatadi: avval so'raladi (blokdan chiqarish so'ralmaydi)
  async function toggleBlock() {
    if (data.status === 'BLOCKED') return save({ status: 'ACTIVE' });
    const ok = await confirm({
      title: t('{name} bloklansinmi?', { name: data.shop.name }),
      message: t("Do'kon yangi buyurtma bera olmaydi. Keyin blokdan chiqarish mumkin."),
      action: t('Bloklash'),
    });
    if (ok) save({ status: 'BLOCKED' });
  }

  return (
    <Card style={{ gap: 10 }}>
      <T size="small" tone="hint">
        {t('Narx guruhi')}
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {me?.priceGroups.map((g) => (
          <Chip key={g.id} label={g.name} active={(priceGroupId ?? me.priceGroups.find((x) => x.isDefault)?.id) === g.id} onPress={() => setPriceGroupId(g.id)} />
        ))}
      </View>
      <Field label={t("Nasiya limiti, so'm (0 = nasiyasiz)")} value={creditLimit} onChangeText={(v) => setCreditLimit(v.replace(/\D/g, ''))} keyboardType="number-pad" />
      <Field label={t('Nasiya muddati, kun')} value={creditDays} onChangeText={(v) => setCreditDays(v.replace(/\D/g, ''))} keyboardType="number-pad" />
      <Field
        label={t("Muddat o'tgach necha kundan keyin nasiya yopiladi (bo'sh = yopilmaydi)")}
        value={blockAfterDays}
        onChangeText={(v) => setBlockAfterDays(v.replace(/\D/g, ''))}
        keyboardType="number-pad"
      />
      {me && me.agents.length > 0 && (
        <>
          <T size="small" tone="hint">
            {t('Agent')}
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {me.agents.map((a) => (
              <Chip key={a.id} label={a.name} active={agentId === a.id} onPress={() => setAgentId(agentId === a.id ? null : a.id)} />
            ))}
          </View>
        </>
      )}
      <Button title={t('Saqlash')} onPress={() => save()} loading={busy} />
      <Button title={data.status === 'BLOCKED' ? t('Blokdan chiqarish') : t("Do'konni bloklash (buyurtma bera olmaydi)")} kind="danger" disabled={busy} onPress={toggleBlock} />
      {err && <Banner tone="danger">{err}</Banner>}
    </Card>
  );
}
