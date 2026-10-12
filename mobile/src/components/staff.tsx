import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { Badge, Button, Empty, Field, Loading, PressCard, SearchInput, T } from '@/components/ui';
import { useSession } from '@/context/session';
import { formatDate, formatSom } from '@/lib/money';
import type { StaffOrder, StaffShop } from '@/lib/staff-types';
import { PAYMENT_LABEL, STATUS_LABEL, type OrderStatus } from '@/lib/types';

export const STATUS_TONE: Record<OrderStatus, 'hint' | 'accent' | 'ok' | 'danger'> = {
  SENT: 'accent',
  ACCEPTED: 'accent',
  IN_DELIVERY: 'accent',
  DELIVERED: 'ok',
  REJECTED: 'danger',
  CANCELLED: 'hint',
};

export function OrderCard({ o }: { o: StaffOrder }) {
  return (
    <PressCard onPress={() => router.push(`/staff/order/${o.id}`)}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <T bold>
          №{o.number} · {o.shop.name}
        </T>
        <Badge label={STATUS_LABEL[o.status]} tone={STATUS_TONE[o.status]} />
      </View>
      <T size="small" tone="hint" numberOfLines={1}>
        {o.shop.address}
      </T>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T size="small" tone="hint">
          {formatDate(o.createdAt)} · {PAYMENT_LABEL[o.paymentType]} · {o.source === 'AGENT' ? `agent: ${o.createdBy ?? '—'}` : 'ilova'}
        </T>
        <T size="small" bold>
          {formatSom(o.deliveredTotal ?? o.total)}
        </T>
      </View>
    </PressCard>
  );
}

export function ShopCard({ s }: { s: StaffShop }) {
  return (
    <PressCard onPress={() => router.push(`/staff/shop/${s.linkId}`)}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <T bold style={{ flex: 1 }}>
          {s.shop.name}
        </T>
        <T bold tone={s.overdueAmount > 0 ? 'danger' : 'text'}>
          {formatSom(s.debt)}
        </T>
      </View>
      <T size="small" tone="hint" numberOfLines={1}>
        {s.shop.address}
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12 }}>
        {s.overdueAmount > 0 && (
          <T size="tiny" tone="danger">
            {s.overdueDays} kun kechikkan: {formatSom(s.overdueAmount)}
          </T>
        )}
        {s.activeOrders > 0 && (
          <T size="tiny" tone="hint">
            Faol buyurtma: {s.activeOrders}
          </T>
        )}
        {s.status === 'BLOCKED' && (
          <T size="tiny" tone="danger">
            Bloklangan
          </T>
        )}
        {s.agent && (
          <T size="tiny" tone="hint">
            Agent: {s.agent}
          </T>
        )}
      </View>
    </PressCard>
  );
}

// Do'konlar ro'yxati qidiruv bilan (agentning bosh sahifasi va do'konlar tabi)
export function ShopList({ header }: { header?: React.ReactNode }) {
  const { api } = useSession();
  const [q, setQ] = useState('');
  const [shops, setShops] = useState<StaffShop[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      api<{ shops: StaffShop[] }>(`/api/staff/shops?q=${encodeURIComponent(q.trim())}`)
        .then((d) => {
          setShops(d.shops);
          setErr(null);
        })
        .catch((e) => setErr(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [api, q]);

  const totalDebt = shops?.reduce((s, x) => s + x.debt, 0) ?? 0;
  return (
    <View style={{ gap: 8 }}>
      {header}
      <SearchInput value={q} onChangeText={setQ} placeholder="Do'kon nomi yoki manzili" />
      {shops && shops.length > 0 && (
        <T size="small" tone="hint">
          {shops.length} ta do'kon · umumiy qarz {formatSom(totalDebt)}
        </T>
      )}
      {err && (
        <T size="small" tone="danger">
          {err}
        </T>
      )}
      {!shops && !err && <Loading />}
      {shops?.map((s) => <ShopCard key={s.linkId} s={s} />)}
      {shops?.length === 0 && <Empty>{q ? 'Hech narsa topilmadi' : "Hali do'kon yo'q"}</Empty>}
    </View>
  );
}

export function CallLink({ phone, name }: { phone: string; name?: string | null }) {
  return (
    <Pressable onPress={() => Linking.openURL(`tel:${phone}`)}>
      <T size="small" tone="accent">
        {name ? `${name}, ` : ''}
        {phone}
      </T>
    </Pressable>
  );
}

// Naqd yoki o'tkazma to'lovni yozish (har qanday xodim)
export function CashForm({ linkId, onDone }: { linkId: string; onDone: () => void }) {
  const { api } = useSession();
  const [amount, setAmount] = useState('');
  const [channel, setChannel] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const sum = Number(amount.replace(/\D/g, '')) || 0;

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await api('/api/staff/payments', { method: 'POST', body: JSON.stringify({ linkId, amount: sum, channel }) });
      setAmount('');
      setMsg({ ok: true, text: `${formatSom(sum)} qabul qilindi` });
      onDone();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['CASH', 'BANK_TRANSFER'] as const).map((c) => (
          <Button key={c} title={c === 'CASH' ? 'Naqd' : "O'tkazma"} kind={channel === c ? 'primary' : 'secondary'} compact style={{ flex: 1 }} onPress={() => setChannel(c)} />
        ))}
      </View>
      <Field label="Summa, so'm" value={amount} onChangeText={(v) => setAmount(v.replace(/\D/g, ''))} keyboardType="number-pad" />
      <Button title={sum > 0 ? `To'lovni yozish · ${formatSom(sum)}` : "To'lovni yozish"} onPress={save} loading={busy} disabled={sum <= 0} />
      {msg && (
        <T size="small" tone={msg.ok ? 'ok' : 'danger'}>
          {msg.text}
        </T>
      )}
    </View>
  );
}
