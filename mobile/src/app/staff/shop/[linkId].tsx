import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AuthImage } from '@/components/auth-image';
import { CallLink, CashForm, OrderCard } from '@/components/staff';
import { Badge, Button, Card, Chip, ErrorText, Field, Loading, Row, Screen, SectionTitle, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useStaff } from '@/context/staff';
import { formatDate, formatSom } from '@/lib/money';
import { CHANNEL_LABEL, type ShopDetail } from '@/lib/staff-types';
import { useLoad } from '@/lib/use-load';

// Do'kon kartasi: qarz, shartlar, buyurtma olish, to'lov qabul qilish, qarz daftari
export default function StaffShopScreen() {
  const c = usePalette();
  const { linkId } = useLocalSearchParams<{ linkId: string }>();
  const { can } = useStaff();
  const { data, error, refreshing, reload } = useLoad<ShopDetail>(`/api/staff/shops/${linkId}`);
  const [panel, setPanel] = useState<'cash' | 'terms' | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);

  if (error && !data) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;
  const s = data.summary;

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Stack.Screen options={{ title: data.shop.name }} />
      <Card style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T size="small" tone="hint">
            Qarz
          </T>
          {data.status === 'BLOCKED' && <Badge label="Bloklangan" tone="danger" />}
        </View>
        <T size="title" tone={s.overdueAmount > 0 ? 'danger' : 'text'}>
          {formatSom(s.debt)}
        </T>
        {s.overdueAmount > 0 && (
          <T size="small" tone="danger">
            Muddati {s.overdueDays} kun o'tgan: {formatSom(s.overdueAmount)}
          </T>
        )}
        {s.nextDue && <Row label="Eng yaqin muddat" value={formatDate(s.nextDue)} />}
        <Row label="Nasiya limiti" value={data.terms.creditLimit > 0 ? `${formatSom(data.terms.creditLimit)}, ${data.terms.creditDays} kun` : 'berilmagan'} />
        {data.terms.creditLimit > 0 && <Row label="Bo'sh nasiya" value={formatSom(s.creditAvailable)} />}
        <Row label="Narx guruhi" value={data.terms.priceGroup?.name ?? 'Asosiy'} />
        <Row label="Agent" value={data.terms.agent?.name ?? '—'} />
      </Card>

      <Card style={{ gap: 4 }}>
        <T size="small" tone="hint">
          {data.shop.address} · {data.shop.district}
        </T>
        {data.users.map((u) => (
          <CallLink key={u.phone} phone={u.phone} name={u.name} />
        ))}
      </Card>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {can('ADMIN', 'OPERATOR', 'AGENT') && data.status === 'ACTIVE' && (
          <Button title="Buyurtma olish" style={{ flex: 1 }} onPress={() => router.push(`/staff/new-order/${linkId}`)} />
        )}
        <Button title="To'lov qabul qilish" kind="secondary" style={{ flex: 1 }} onPress={() => setPanel(panel === 'cash' ? null : 'cash')} />
      </View>
      {panel === 'cash' && (
        <Card>
          <CashForm linkId={linkId} onDone={reload} />
        </Card>
      )}
      {can('ADMIN') && <Button title={panel === 'terms' ? 'Shartlarni yopish' : "Nasiya va narx shartlarini o'zgartirish"} kind="secondary" onPress={() => setPanel(panel === 'terms' ? null : 'terms')} />}
      {panel === 'terms' && (
        <TermsForm
          data={data}
          onDone={() => {
            setPanel(null);
            reload();
          }}
        />
      )}

      {data.orders.length > 0 && <SectionTitle>Oxirgi buyurtmalar</SectionTitle>}
      {data.orders.slice(0, 5).map((o) => (
        <OrderCard key={o.id} o={o} />
      ))}

      <SectionTitle>Qarz daftari</SectionTitle>
      <Card style={{ gap: 8 }}>
        {data.ledger.length === 0 && (
          <T size="small" tone="hint">
            Yozuv yo'q
          </T>
        )}
        {data.ledger.map((e) => (
          <View key={e.id} style={{ gap: 2, opacity: e.status === 'REJECTED' ? 0.5 : 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <T size="small" tone="hint" style={{ flex: 1 }}>
                {formatDate(e.date)} ·{' '}
                {e.type === 'DEBT' ? `Buyurtma №${e.orderNumber ?? '—'}` : e.type === 'PAYMENT' ? `To'lov (${CHANNEL_LABEL[e.channel ?? ''] ?? '—'})` : 'Tuzatish'}
                {e.status === 'PENDING' ? ' · tasdiq kutilmoqda' : e.status === 'REJECTED' ? ' · rad etilgan' : ''}
              </T>
              <T size="small" tone={e.amount < 0 ? 'ok' : 'text'}>
                {formatSom(e.amount)}
              </T>
            </View>
            {e.note && (
              <T size="tiny" tone="hint">
                {e.note}
              </T>
            )}
            {e.receiptUrl && (
              <T size="tiny" tone="accent" onPress={() => setReceipt(receipt === e.receiptUrl ? null : e.receiptUrl)}>
                {receipt === e.receiptUrl ? 'Chekni yopish' : "Chekni ko'rish"}
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

  return (
    <Card style={{ gap: 10 }}>
      <T size="small" tone="hint">
        Narx guruhi
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {me?.priceGroups.map((g) => (
          <Chip key={g.id} label={g.name} active={(priceGroupId ?? me.priceGroups.find((x) => x.isDefault)?.id) === g.id} onPress={() => setPriceGroupId(g.id)} />
        ))}
      </View>
      <Field label="Nasiya limiti, so'm (0 = nasiyasiz)" value={creditLimit} onChangeText={(v) => setCreditLimit(v.replace(/\D/g, ''))} keyboardType="number-pad" />
      <Field label="Nasiya muddati, kun" value={creditDays} onChangeText={(v) => setCreditDays(v.replace(/\D/g, ''))} keyboardType="number-pad" />
      <Field label="Muddat o'tgach necha kundan keyin nasiya yopiladi (bo'sh = yopilmaydi)" value={blockAfterDays} onChangeText={(v) => setBlockAfterDays(v.replace(/\D/g, ''))} keyboardType="number-pad" />
      {me && me.agents.length > 0 && (
        <>
          <T size="small" tone="hint">
            Agent
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {me.agents.map((a) => (
              <Chip key={a.id} label={a.name} active={agentId === a.id} onPress={() => setAgentId(agentId === a.id ? null : a.id)} />
            ))}
          </View>
        </>
      )}
      <Button title="Saqlash" onPress={() => save()} loading={busy} />
      <Button
        title={data.status === 'BLOCKED' ? 'Blokdan chiqarish' : "Do'konni bloklash (buyurtma bera olmaydi)"}
        kind="danger"
        onPress={() => save({ status: data.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED' })}
      />
      {err && (
        <T size="small" tone="danger">
          {err}
        </T>
      )}
    </Card>
  );
}
