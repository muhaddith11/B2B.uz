import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { Badge, Button, Card, Empty, Field, Loading, LoadMore, Money, ORDER_TONE, Pic, SearchInput, StatusBadge, T } from '@/components/ui';
import { useSession } from '@/context/session';
import { haptic } from '@/lib/haptics';
import { t } from '@/lib/i18n';
import { formatDate, formatSom } from '@/lib/money';
import type { StaffOrder, StaffShop } from '@/lib/staff-types';
import { paymentLabel } from '@/lib/types';

export const STATUS_TONE = ORDER_TONE;

// Buyurtma qatori. onAccept berilsa (yangi buyurtma, admin/operator), ro'yxatning o'zidan qabul qilinadi
export function OrderCard({ o, onAccept, accepting }: { o: StaffOrder; onAccept?: () => void; accepting?: boolean }) {
  // Manba faqat agent olgan buyurtmada yoziladi: ilovadan kelgani odatiy holat, qatorni uzaytirmaydi
  const source = o.source === 'AGENT' ? ` · ${t('agent {name}', { name: o.createdBy ?? '' }).trim()}` : '';
  return (
    <Card style={{ gap: 10 }}>
      <Pressable accessibilityRole="button" onPress={() => router.push(`/staff/order/${o.id}`)} style={({ pressed }) => ({ gap: 8, opacity: pressed ? 0.8 : 1 })}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <T size="h2" num>
            №{o.number}
          </T>
          <StatusBadge status={o.status} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pic uri={o.shop.imageUrl} name={o.shop.name} size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            <T bold numberOfLines={1}>
              {o.shop.name}
            </T>
            <T size="small" tone="hint" numberOfLines={1}>
              {o.shop.address}
            </T>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <T size="small" tone="hint" num numberOfLines={1} style={{ flexShrink: 1 }}>
            {formatDate(o.createdAt)} · {paymentLabel(o.paymentType)}
            {source}
          </T>
          <Money value={o.deliveredTotal ?? o.total} />
        </View>
      </Pressable>
      {onAccept && <Button title={t('Qabul qilish')} icon="checkmark" compact loading={accepting} onPress={onAccept} />}
    </Card>
  );
}

// Do'kon qatori. orderAction: agent va operator do'kon sahifasiga kirmasdan buyurtma oladi
export function ShopCard({ s, orderAction, hideAgent }: { s: StaffShop; orderAction?: boolean; hideAgent?: boolean }) {
  const showAgent = !!s.agent && !hideAgent;
  return (
    <Card style={{ gap: 10 }}>
      <Pressable accessibilityRole="button" onPress={() => router.push(`/staff/shop/${s.linkId}`)} style={({ pressed }) => ({ gap: 8, opacity: pressed ? 0.8 : 1 })}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Pic uri={s.shop.imageUrl} name={s.shop.name} size={44} />
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
            {s.overdueAmount > 0 && <Badge label={t('{n} kun kechikkan · {sum}', { n: s.overdueDays, sum: formatSom(s.overdueAmount) })} tone="danger" />}
            {s.activeOrders > 0 && <Badge label={t('Faol buyurtma: {n}', { n: s.activeOrders })} tone="accent" />}
            {s.status === 'BLOCKED' && <Badge label={t('Bloklangan')} tone="danger" />}
            {showAgent && <Badge label={t('Agent: {name}', { name: s.agent ?? '' })} />}
          </View>
        )}
      </Pressable>
      {orderAction && s.status !== 'BLOCKED' && (
        <Button title={t('Buyurtma olish')} icon="cart-outline" kind="secondary" compact onPress={() => router.push(`/staff/new-order/${s.linkId}`)} />
      )}
    </Card>
  );
}

// Do'konlar ro'yxati qidiruv bilan (agentning bosh sahifasi va do'konlar tabi)
const SHOP_PAGE = 50;
type ShopPage = { shops: StaffShop[]; total: number; totalDebt: number; nextOffset: number | null };

export function ShopList({ header, orderAction, hideAgent }: { header?: React.ReactNode; orderAction?: boolean; hideAgent?: boolean }) {
  const { api } = useSession();
  const [q, setQ] = useState('');
  const [shops, setShops] = useState<StaffShop[] | null>(null);
  // Jami soni va umumiy qarz butun ro'yxat bo'yicha (server hisoblaydi), ro'yxat esa sahifalab keladi
  const [totals, setTotals] = useState<{ total: number; totalDebt: number; nextOffset: number | null }>({ total: 0, totalDebt: 0, nextOffset: null });
  const [err, setErr] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const page = useCallback(
    (offset: number) => api<ShopPage>(`/api/staff/shops?q=${encodeURIComponent(q.trim())}&limit=${SHOP_PAGE}&offset=${offset}`),
    [api, q],
  );

  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => {
      page(0)
        .then((d) => {
          if (!live) return;
          setShops(d.shops);
          setTotals({ total: d.total, totalDebt: d.totalDebt, nextOffset: d.nextOffset });
          setErr(null);
        })
        .catch((e) => live && setErr(e.message));
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [page]);

  async function more() {
    if (totals.nextOffset === null || loadingMore) return;
    setLoadingMore(true);
    try {
      const d = await page(totals.nextOffset);
      setShops((prev) => [...(prev ?? []), ...d.shops.filter((s) => !prev?.some((x) => x.linkId === s.linkId))]);
      setTotals({ total: d.total, totalDebt: d.totalDebt, nextOffset: d.nextOffset });
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <View style={{ gap: 8 }}>
      {header}
      <SearchInput value={q} onChangeText={setQ} placeholder={t("Do'kon nomi yoki manzili")} />
      {shops && shops.length > 0 && (
        <T size="small" tone="hint" num>
          {t("{n} ta do'kon · umumiy qarz {sum}", { n: totals.total, sum: formatSom(totals.totalDebt) })}
        </T>
      )}
      {err && (
        <T size="small" tone="danger">
          {err}
        </T>
      )}
      {!shops && !err && <Loading rows={4} inline />}
      {shops?.map((s) => <ShopCard key={s.linkId} s={s} orderAction={orderAction} hideAgent={hideAgent} />)}
      <LoadMore onPress={totals.nextOffset !== null ? more : null} loading={loadingMore} />
      {shops?.length === 0 && <Empty icon="storefront-outline">{q ? t('Hech narsa topilmadi') : t("Hali do'kon yo'q")}</Empty>}
    </View>
  );
}

export function CallLink({ phone, name }: { phone: string; name?: string | null }) {
  return (
    <Pressable accessibilityRole="link" onPress={() => Linking.openURL(`tel:${phone}`)} hitSlop={6}>
      <T size="small" tone="accent">
        {name ? `${name}, ` : ''}
        {phone}
      </T>
    </Pressable>
  );
}

// Bitta to'lov uchun kalit: shu to'lov qayta yuborilsa (ikki marta bosish, tarmoq uzilishi) server uni ikkinchi marta yozmaydi
const newPaymentKey = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

// Naqd yoki o'tkazma to'lovni yozish (har qanday xodim)
export function CashForm({ linkId, onDone }: { linkId: string; onDone: () => void }) {
  const { api } = useSession();
  const [amount, setAmount] = useState('');
  const [channel, setChannel] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [clientKey, setClientKey] = useState(newPaymentKey);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const sum = Number(amount.replace(/\D/g, '')) || 0;

  async function save() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      await api('/api/staff/payments', { method: 'POST', body: JSON.stringify({ linkId, amount: sum, channel, clientKey }) });
      setAmount('');
      setClientKey(newPaymentKey());
      setMsg({ ok: true, text: t('{sum} qabul qilindi', { sum: formatSom(sum) }) });
      haptic.success();
      onDone();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
      haptic.error();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['CASH', 'BANK_TRANSFER'] as const).map((c) => (
          <Button
            key={c}
            title={c === 'CASH' ? t('Naqd') : t("O'tkazma")}
            kind={channel === c ? 'primary' : 'secondary'}
            compact
            style={{ flex: 1 }}
            onPress={() => {
              setChannel(c);
              setClientKey(newPaymentKey());
            }}
          />
        ))}
      </View>
      <Field
        label={t("Summa, so'm")}
        value={amount}
        onChangeText={(v) => {
          setAmount(v.replace(/\D/g, ''));
          setClientKey(newPaymentKey());
        }}
        keyboardType="number-pad"
      />
      <Button title={sum > 0 ? t("To'lovni yozish · {sum}", { sum: formatSom(sum) }) : t("To'lovni yozish")} onPress={save} loading={busy} disabled={sum <= 0} />
      {msg && (
        <T size="small" tone={msg.ok ? 'ok' : 'danger'} accessibilityLiveRegion="polite">
          {msg.text}
        </T>
      )}
    </View>
  );
}
