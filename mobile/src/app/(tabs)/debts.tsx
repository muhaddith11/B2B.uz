import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, Empty, ErrorText, Loading, Screen, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { formatDate, formatSom } from '@/lib/money';
import { CHANNEL_LABEL } from '@/lib/staff-types';
import type { LedgerItem, LinkSummary } from '@/lib/types';
import { useLoad } from '@/lib/use-load';

export default function DebtsScreen() {
  const c = usePalette();
  const { data, error, refreshing, reload } = useLoad<{ links: LinkSummary[]; entries: LedgerItem[] }>('/api/shop/debts');

  if (error && !data) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      {data.links.length === 0 && <Empty>Hali distribyutorlarga qarzingiz yo'q.</Empty>}
      {data.links.map((l) => {
        const entries = data.entries.filter((e) => e.linkId === l.linkId);
        const pending = entries.filter((e) => e.status === 'PENDING').reduce((s, e) => s - e.amount, 0);
        return (
          <Card key={l.linkId} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <T bold style={{ flex: 1 }}>
                {l.distributor.name}
              </T>
              <T bold tone={l.overdueAmount > 0 ? 'danger' : 'text'}>
                {formatSom(l.debt)}
              </T>
            </View>
            <T size="tiny" tone="hint">
              {l.creditLimit > 0 ? `Limit: ${formatSom(l.creditLimit)} · bo'sh: ${formatSom(l.creditAvailable)}` : 'Nasiya berilmagan'}
              {l.nextDue ? ` · muddat: ${formatDate(l.nextDue)}` : ''}
            </T>
            {l.overdueAmount > 0 && (
              <T size="small" tone="danger">
                Muddati {l.overdueDays} kun o'tgan: {formatSom(l.overdueAmount)}
              </T>
            )}
            {pending > 0 && (
              <T size="small" tone="accent">
                Tasdiq kutilmoqda: {formatSom(pending)}
              </T>
            )}
            {l.debt > 0 && <Button title="To'lash" compact onPress={() => router.push(`/pay/${l.distributor.id}`)} style={{ marginTop: 6 }} />}
            {entries.length > 0 && (
              <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: c.border, gap: 6 }}>
                {entries.map((e) => (
                  <View key={e.id} style={{ gap: 1, opacity: e.status === 'REJECTED' ? 0.6 : 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                      <T size="small" tone="hint" style={{ flex: 1 }}>
                        {formatDate(e.date)} ·{' '}
                        {e.type === 'DEBT'
                          ? `Buyurtma №${e.orderNumber ?? '—'}`
                          : e.type === 'PAYMENT'
                            ? `To'lov${e.channel ? ` (${CHANNEL_LABEL[e.channel] ?? e.channel})` : ''}`
                            : 'Tuzatish'}
                      </T>
                      <T size="small" tone={e.status === 'REJECTED' ? 'hint' : e.amount < 0 ? 'ok' : 'text'} style={e.status === 'REJECTED' ? { textDecorationLine: 'line-through' } : undefined}>
                        {formatSom(e.amount)}
                      </T>
                    </View>
                    {e.status === 'PENDING' && (
                      <T size="tiny" tone="accent">
                        Distribyutor tasdiqlashi kutilmoqda
                      </T>
                    )}
                    {e.status === 'REJECTED' && (
                      <T size="tiny" tone="danger">
                        {e.note ?? 'Rad etildi'}
                      </T>
                    )}
                  </View>
                ))}
              </View>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}
