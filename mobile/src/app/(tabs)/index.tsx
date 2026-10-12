import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { Button, Card, ErrorText, Loading, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { formatDate, formatSom } from '@/lib/money';
import type { HomeData } from '@/lib/types';
import { useLoad } from '@/lib/use-load';

export default function HomeScreen() {
  const c = usePalette();
  const { signOut } = useSession();
  const { data, error, refreshing, reload } = useLoad<HomeData>('/api/shop/home');

  if (error && !data) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;

  const totalDebt = data.links.reduce((s, l) => s + l.debt, 0);
  const totalOverdue = data.links.reduce((s, l) => s + l.overdueAmount, 0);
  const nextDue = data.links
    .map((l) => l.nextDue)
    .filter((d): d is string => d !== null)
    .sort()[0];

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <T size="title">{data.shop.name}</T>
          <T size="small" tone="hint">
            {data.user.name}
          </T>
        </View>
        <Pressable onPress={signOut} hitSlop={8}>
          <T size="small" tone="hint">
            Chiqish
          </T>
        </Pressable>
      </View>

      <Pressable onPress={() => router.push('/debts')}>
        <Card>
          <T size="small" tone="hint">
            Umumiy qarz
          </T>
          <T size="title" style={{ marginTop: 2 }}>
            {formatSom(totalDebt)}
          </T>
          {totalOverdue > 0 ? (
            <T size="small" tone="danger" bold>
              Muddati o'tgan: {formatSom(totalOverdue)}
            </T>
          ) : nextDue ? (
            <T size="small" tone="hint">
              Eng yaqin to'lov muddati: {formatDate(nextDue)}
            </T>
          ) : null}
        </Card>
      </Pressable>

      <T size="h2" style={{ marginTop: 8 }}>
        Distribyutorlarim
      </T>
      {data.links.map((l) => (
        <Pressable key={l.linkId} onPress={() => router.push(`/distributor/${l.distributor.id}`)}>
          <Card style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <T bold style={{ flex: 1 }}>
                {l.distributor.name}
              </T>
              <T size="small" tone="accent">
                Katalog
              </T>
            </View>
            <T size="small" tone="hint">
              {l.distributor.categories.join(', ')} · yetkazish: {l.distributor.deliveryDays.join(', ')}
            </T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14 }}>
              <T size="small">Qarz: {formatSom(l.debt)}</T>
              {l.overdueAmount > 0 && (
                <T size="small" tone="danger">
                  {l.overdueDays} kun kechikkan
                </T>
              )}
              {l.activeOrders > 0 && (
                <T size="small" tone="hint">
                  Faol buyurtma: {l.activeOrders}
                </T>
              )}
            </View>
          </Card>
        </Pressable>
      ))}
      {data.links.length === 0 && (
        <Card>
          <T size="small" tone="hint">
            Hali birorta distribyutorga ulanmagansiz. Hududingizdagi distribyutorlarni toping va ulanish so'rovini yuboring.
          </T>
        </Card>
      )}
      <Button title="+ Yangi distribyutor topish" kind="secondary" onPress={() => router.push('/find')} />

      {data.requests.length > 0 && (
        <>
          <T size="h2" style={{ marginTop: 8 }}>
            Ulanish so'rovlarim
          </T>
          {data.requests.map((r) => (
            <Card key={r.distributorId} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <T size="small" bold style={{ flex: 1 }}>
                {r.name}
              </T>
              <T size="small" tone="hint">
                Javob kutilmoqda · {formatDate(r.createdAt)}
              </T>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}
