import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { Badge, Button, Card, Empty, Field, Loading, Money, ORDER_TONE, SearchInput, StatusBadge, T } from '@/components/ui';
import { useSession } from '@/context/session';
import { formatDate, formatSom } from '@/lib/money';
import type { StaffOrder, StaffShop } from '@/lib/staff-types';
import { PAYMENT_LABEL } from '@/lib/types';

export const STATUS_TONE = ORDER_TONE;

// Buyurtma qatori. onAccept berilsa (yangi buyurtma, admin/operator), ro'yxatning o'zidan qabul qilinadi
export function OrderCard({ o, onAccept, accepting }: { o: StaffOrder; onAccept?: () => void; accepting?: boolean }) {
  return (
    <Card style={{ gap: 10 }}>
      <Pressable accessibilityRole="button" onPress={() => router.push(`/staff/order/${o.id}`)} style={({ pressed }) => ({ gap: 8, opacity: pressed ? 0.8 : 1 })}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <T size="h2" num>
          №{o.number}
        </T>
        <StatusBadge status={o.status} />
      </View>
      <View style={{ gap: 2 }}>
        <T bold numberOfLines={1}>
          {o.shop.name}
        </T>
        <T size="small" tone="hint" numberOfLines={1}>
          {o.shop.address}
        </T>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <T size="small" tone="hint" num numberOfLines={1} style={{ flexShrink: 1 }}>
          {formatDate(o.createdAt)} · {PAYMENT_LABEL[o.paymentType]} · {o.source === 'AGENT' ? `agent ${o.createdBy ?? ''}`.trim() : 'ilova'}
        </T>
        <Money value={o.deliveredTotal ?? o.total} />
      </View>
      </Pressable>
      {onAccept && <Button title="Qabul qilish" icon="checkmark" compact loading={accepting} onPress={onAccept} />}
    </Card>
  );
}

// Do'kon qatori. orderAction: agent va operator do'kon sahifasiga kirmasdan buyurtma oladi
export function ShopCard({ s, orderAction, hideAgent }: { s: StaffShop; orderAction?: boolean; hideAgent?: boolean }) {
  const showAgent = !!s.agent && !hideAgent;
  return (
    <Card style={{ gap: 10 }}>
      <Pressable accessibilityRole="button" onPress={() => router.push(`/staff/shop/${s.linkId}`)} style={({ pressed }) => ({ gap: 8, opacity: pressed ? 0.8 : 1 })}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T bold numberOfLines={1}>
              {s.shop.name}
            </T>
            <T size="small" tone="hint" numberOfLines={1}>
              {s.shop.address}
            </T>
          </View>
          {s.debt > 0 && <Money value={s.debt} tone={s.overdueAmount > 0 ? 'danger' : 'text'} />}
        </View>
        {(s.overdueAmount > 0 || s.activeOrders > 0 || s.status === 'BLOCKED' || showAgent) && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {s.overdueAmount > 0 && <Badge label={`${s.overdueDays} kun kechikkan · ${formatSom(s.overdueAmount)}`} tone="danger" />}
            {s.activeOrders > 0 && <Badge label={`Faol buyurtma: ${s.activeOrders}`} tone="accent" />}
            {s.status === 'BLOCKED' && <Badge label="Bloklangan" tone="danger" />}
            {showAgent && <Badge label={`Agent: ${s.agent}`} />}
          </View>
        )}
      </Pressable>
      {orderAction && s.status !== 'BLOCKED' && (
        <Button title="Buyurtma olish" icon="cart-outline" kind="secondary" compact onPress={() => router.push(`/staff/new-order/${s.linkId}`)} />
      )}
    </Card>
  );
}

// Do'konlar ro'yxati qidiruv bilan (agentning bosh sahifasi va do'konlar tabi)
export function ShopList({ header, orderAction, hideAgent }: { header?: React.ReactNode; orderAction?: boolean; hideAgent?: boolean }) {
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
      {shops?.map((s) => <ShopCard key={s.linkId} s={s} orderAction={orderAction} hideAgent={hideAgent} />)}
      {shops?.length === 0 && <Empty icon="storefront-outline">{q ? 'Hech narsa topilmadi' : "Hali do'kon yo'q"}</Empty>}
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
