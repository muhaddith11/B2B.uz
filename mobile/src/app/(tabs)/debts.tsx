import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AbrBar, Badge, Banner, Button, Card, Divider, Empty, ErrorState, Loading, Money, Pic, Screen, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { confirm } from '@/lib/confirm';
import { haptic } from '@/lib/haptics';
import { t, txNote } from '@/lib/i18n';
import { formatDate, formatSom } from '@/lib/money';
import { channelLabel } from '@/lib/staff-types';
import type { LedgerItem, LinkSummary } from '@/lib/types';
import { useLoad } from '@/lib/use-load';

export default function DebtsScreen() {
  const { data, error, refreshing, reload, retry } = useLoad<{ links: LinkSummary[]; entries: LedgerItem[] }>('/api/shop/debts');

  if (error && !data) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return <Loading />;

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      {data.links.length === 0 && <Empty icon="wallet-outline">{t("Hali distribyutorlarga qarzingiz yo'q")}</Empty>}
      {data.links.map((l) => (
        <DebtCard key={l.linkId} l={l} entries={data.entries.filter((e) => e.linkId === l.linkId)} onChange={reload} />
      ))}
    </Screen>
  );
}

function DebtCard({ l, entries, onChange }: { l: LinkSummary; entries: LedgerItem[]; onChange: () => void }) {
  const c = usePalette();
  // Kutayotgan to'lov (chek) manfiy, distribyutor qo'shmoqchi bo'lgan qarz musbat
  const pending = entries.filter((e) => e.status === 'PENDING' && e.amount < 0).reduce((s, e) => s - e.amount, 0);
  const requests = entries.filter((e) => e.status === 'PENDING' && e.amount > 0);
  const used = l.creditLimit > 0 ? Math.min(1, Math.max(0, l.debt / l.creditLimit)) : 0;
  const late = l.overdueAmount > 0;

  return (
    <Card style={{ gap: 14 }}>
      <View style={{ gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Pic uri={l.distributor.logoUrl} name={l.distributor.name} size={32} />
          <T tone="hint" numberOfLines={1} style={{ flex: 1 }}>
            {l.distributor.name}
          </T>
          {l.status === 'BLOCKED' && <Badge label={t('Bloklangan')} tone="danger" />}
        </View>
        <Money value={l.debt} size="title" tone={late ? 'danger' : 'text'} />
        {l.nextDue && !late ? (
          <T size="small" tone="hint" num>
            {t("To'lov muddati: {date}", { date: formatDate(l.nextDue) })}
          </T>
        ) : null}
      </View>

      {l.creditLimit > 0 ? (
        <View style={{ gap: 6 }} accessible accessibilityLabel={t("Nasiya limiti {limit}, bo'sh {free}", { limit: formatSom(l.creditLimit), free: formatSom(l.creditAvailable) })}>
          <AbrBar value={used} dye={late ? c.danger : c.accent} track={c.field} height={10} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <T size="tiny" tone="hint" num>
              {t("Bo'sh: {sum}", { sum: formatSom(l.creditAvailable) })}
            </T>
            <T size="tiny" tone="hint" num>
              {t('Limit: {sum}', { sum: formatSom(l.creditLimit) })}
            </T>
          </View>
        </View>
      ) : (
        <T size="small" tone="hint">
          {t('Nasiya berilmagan')}
        </T>
      )}

      {l.status === 'BLOCKED' && <Banner tone="danger">{t("Distribyutor yangi buyurtmalarni yopgan. Qarzni to'lashingiz mumkin.")}</Banner>}
      {late && <Banner tone="danger">{t("Muddati {n} kun o'tgan: {sum}", { n: l.overdueDays, sum: formatSom(l.overdueAmount) })}</Banner>}
      {pending > 0 && (
        <Banner tone="accent" icon="time-outline">
          {t('Tasdiq kutilmoqda: {sum}', { sum: formatSom(pending) })}
        </Banner>
      )}
      {requests.map((e) => (
        <DebtRequest key={e.id} e={e} onDone={onChange} />
      ))}
      {l.debt > 0 && <Button title={t("To'lash")} icon="wallet-outline" kind={late ? 'primary' : 'secondary'} onPress={() => router.push(`/pay/${l.distributor.id}`)} />}

      {entries.length > 0 && (
        <View style={{ gap: 10 }}>
          <Divider />
          <T size="small" tone="hint" style={{ fontWeight: '600' }} accessibilityRole="header">
            {t('Tarix')}
          </T>
          {entries.map((e) => (
            <Entry key={e.id} e={e} />
          ))}
        </View>
      )}
    </Card>
  );
}

function Entry({ e }: { e: LedgerItem }) {
  const c = usePalette();
  const pay = e.amount < 0;
  // Rad etilgan chek va distribyutor bekor qilgan yozuv qoldiqqa kirmaydi: chizilgan ko'rinadi
  const rejected = e.status === 'REJECTED' || !!e.reversed;
  const title =
    e.type === 'DEBT'
      ? t('Buyurtma №{n}', { n: e.orderNumber ?? '—' })
      : e.type === 'PAYMENT'
        ? `${t("To'lov")}${e.channel ? ` · ${channelLabel(e.channel)}` : ''}`
        : t('Tuzatish');
  const status =
    e.status === 'PENDING'
      ? ` · ${pay ? t('tasdiq kutilmoqda') : t('tasdiqingizni kutmoqda')}`
      : e.reversed
        ? ` · ${t('bekor qilingan')}`
        : rejected
          ? ` · ${e.note ? txNote(e.note) : t('rad etildi')}`
          : e.type === 'ADJUSTMENT' && e.note
            ? ` · ${txNote(e.note)}`
            : '';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: rejected ? 0.6 : 1 }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: pay ? c.okSoft : c.field, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={pay ? 'arrow-down' : 'receipt-outline'} size={18} color={pay ? c.ok : c.hint} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <T size="small" style={{ fontWeight: '500' }} numberOfLines={1}>
          {title}
        </T>
        <T size="tiny" tone={e.status === 'PENDING' ? 'accent' : rejected ? 'danger' : 'hint'} num numberOfLines={2}>
          {formatDate(e.date)}
          {status}
        </T>
      </View>
      <T size="small" num tone={rejected ? 'hint' : pay ? 'ok' : 'text'} style={[{ fontWeight: '600' }, rejected && { textDecorationLine: 'line-through' }]}>
        {pay ? '−' : '+'}
        {formatSom(Math.abs(e.amount))}
      </T>
    </View>
  );
}

// Distribyutor qarz qo'shmoqchi (eski qarz, bekor qilingan to'lov): do'kon egasi tasdiqlamaguncha qarzga kirmaydi
function DebtRequest({ e, onDone }: { e: LedgerItem; onDone: () => void }) {
  const { api } = useSession();
  const [busy, setBusy] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function answer(accept: boolean) {
    if (!accept) {
      const ok = await confirm({ title: t("Qarz so'rovi rad etilsinmi?"), message: t("Bu summa qarzingizga qo'shilmaydi."), action: t('Rad etish') });
      if (!ok) return;
    }
    setBusy(accept);
    setErr(null);
    try {
      await api(`/api/shop/debts/${e.id}/answer`, { method: 'POST', body: JSON.stringify({ accept }) });
      if (accept) haptic.success();
      onDone();
    } catch (x) {
      setErr((x as Error).message);
      haptic.error();
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={{ gap: 10 }}>
      <Banner tone="warn" icon="alert-circle-outline">
        {t("Distribyutor qarz qo'shmoqchi: {sum}", { sum: formatSom(e.amount) })}
        {e.note ? `. ${txNote(e.note)}` : ''}
      </Banner>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title={t('Rad etish')} kind="danger" compact loading={busy === false} disabled={busy !== null} onPress={() => answer(false)} style={{ flex: 1 }} />
        <Button title={t('Tasdiqlash')} icon="checkmark" compact loading={busy === true} disabled={busy !== null} onPress={() => answer(true)} style={{ flex: 1 }} />
      </View>
      {err && <Banner tone="danger">{err}</Banner>}
    </View>
  );
}
