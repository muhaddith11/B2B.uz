import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { View } from 'react-native';

import { Banner, Button, Card, Divider, Empty, ErrorText, Loading, Money, Screen, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { formatDate, formatSom } from '@/lib/money';
import { CHANNEL_LABEL } from '@/lib/staff-types';
import type { LedgerItem, LinkSummary } from '@/lib/types';
import { useLoad } from '@/lib/use-load';

export default function DebtsScreen() {
  const { data, error, refreshing, reload } = useLoad<{ links: LinkSummary[]; entries: LedgerItem[] }>('/api/shop/debts');

  if (error && !data) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      {data.links.length === 0 && <Empty icon="wallet-outline">Hali distribyutorlarga qarzingiz yo'q</Empty>}
      {data.links.map((l) => (
        <DebtCard key={l.linkId} l={l} entries={data.entries.filter((e) => e.linkId === l.linkId)} />
      ))}
    </Screen>
  );
}

function DebtCard({ l, entries }: { l: LinkSummary; entries: LedgerItem[] }) {
  const c = usePalette();
  const pending = entries.filter((e) => e.status === 'PENDING').reduce((s, e) => s - e.amount, 0);
  const used = l.creditLimit > 0 ? Math.min(1, Math.max(0, l.debt / l.creditLimit)) : 0;
  const late = l.overdueAmount > 0;

  return (
    <Card style={{ gap: 14 }}>
      <View style={{ gap: 2 }}>
        <T tone="hint" numberOfLines={1}>
          {l.distributor.name}
        </T>
        <Money value={l.debt} size="title" tone={late ? 'danger' : 'text'} />
        {l.nextDue && !late ? (
          <T size="small" tone="hint" num>
            To'lov muddati: {formatDate(l.nextDue)}
          </T>
        ) : null}
      </View>

      {l.creditLimit > 0 ? (
        <View style={{ gap: 6 }} accessibilityLabel={`Nasiya limiti ${formatSom(l.creditLimit)}, bo'sh ${formatSom(l.creditAvailable)}`}>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: c.field, overflow: 'hidden' }}>
            <View style={{ width: `${used * 100}%`, height: 8, borderRadius: 4, backgroundColor: late ? c.danger : c.accent }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T size="tiny" tone="hint" num>
              Bo'sh: {formatSom(l.creditAvailable)}
            </T>
            <T size="tiny" tone="hint" num>
              Limit: {formatSom(l.creditLimit)}
            </T>
          </View>
        </View>
      ) : (
        <T size="small" tone="hint">
          Nasiya berilmagan
        </T>
      )}

      {late && (
        <Banner tone="danger">
          Muddati {l.overdueDays} kun o'tgan: {formatSom(l.overdueAmount)}
        </Banner>
      )}
      {pending > 0 && (
        <Banner tone="accent" icon="time-outline">
          Tasdiq kutilmoqda: {formatSom(pending)}
        </Banner>
      )}
      {l.debt > 0 && <Button title="To'lash" icon="wallet-outline" kind={late ? 'primary' : 'secondary'} onPress={() => router.push(`/pay/${l.distributor.id}`)} />}

      {entries.length > 0 && (
        <View style={{ gap: 10 }}>
          <Divider />
          <T size="small" tone="hint" style={{ fontWeight: '600' }}>
            Tarix
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
  const rejected = e.status === 'REJECTED';
  const title =
    e.type === 'DEBT' ? `Buyurtma №${e.orderNumber ?? '—'}` : e.type === 'PAYMENT' ? `To'lov${e.channel ? ` · ${CHANNEL_LABEL[e.channel] ?? e.channel}` : ''}` : 'Tuzatish';
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
          {e.status === 'PENDING' ? ' · tasdiq kutilmoqda' : rejected ? ` · ${e.note ?? 'rad etildi'}` : ''}
        </T>
      </View>
      <T size="small" num tone={rejected ? 'hint' : pay ? 'ok' : 'text'} style={[{ fontWeight: '600' }, rejected && { textDecorationLine: 'line-through' }]}>
        {pay ? '−' : '+'}
        {formatSom(Math.abs(e.amount))}
      </T>
    </View>
  );
}
