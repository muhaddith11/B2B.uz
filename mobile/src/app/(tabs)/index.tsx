import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountLinks } from '@/components/account-links';
import { Badge, Button, Card, Empty, ErrorText, IconButton, Loading, Money, SectionTitle, T } from '@/components/ui';
import { R, usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { formatDate, formatSom } from '@/lib/money';
import type { HomeData, LinkSummary } from '@/lib/types';
import { useLoad } from '@/lib/use-load';

export default function HomeScreen() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
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
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 32, gap: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={c.accent} colors={[c.accent]} />}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <T size="title" numberOfLines={1}>
            {data.shop.name}
          </T>
          <T size="small" tone="hint" numberOfLines={1}>
            {data.user.name} · {data.shop.address}
          </T>
        </View>
        <IconButton icon="log-out-outline" label="Chiqish" tone="hint" onPress={signOut} />
      </View>

      {totalDebt > 0 && (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T size="small" tone="hint">
              Umumiy qarz
            </T>
            <Money value={totalDebt} size="title" />
            {totalOverdue > 0 ? (
              <T size="small" tone="danger" num style={{ fontWeight: '600' }}>
                {totalOverdue >= totalDebt ? "Hammasi muddati o'tgan" : `Muddati o'tgan: ${formatSom(totalOverdue)}`}
              </T>
            ) : nextDue ? (
              <T size="small" tone="hint" num>
                Eng yaqin to'lov: {formatDate(nextDue)}
              </T>
            ) : null}
          </View>
          <Button title="To'lash" kind="secondary" compact onPress={() => router.push('/debts')} />
        </Card>
      )}

      <SectionTitle right={<T size="small" tone="hint">{data.links.length} ta</T>}>Buyurtma berish</SectionTitle>
      {data.links.map((l) => (
        <DistributorRow key={l.linkId} l={l} />
      ))}
      {data.links.length === 0 && (
        <Card>
          <Empty icon="storefront-outline">Hali birorta distribyutorga ulanmagansiz. Hududingizdagi distribyutorlarni toping va ulanish so'rovini yuboring.</Empty>
        </Card>
      )}
      <Button title="Yangi distribyutor topish" icon="search" kind="secondary" onPress={() => router.push('/find')} />

      {data.requests.length > 0 && (
        <>
          <SectionTitle>Ulanish so'rovlarim</SectionTitle>
          <Card style={{ gap: 12 }}>
            {data.requests.map((r) => (
              <View key={r.distributorId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <T bold style={{ flex: 1 }} numberOfLines={1}>
                  {r.name}
                </T>
                <Badge label={`Javob kutilmoqda · ${formatDate(r.createdAt)}`} tone="warn" />
              </View>
            ))}
          </Card>
        </>
      )}
      <AccountLinks />
    </ScrollView>
  );
}

// Distribyutor qatori: bosilganda katalog ochiladi
function DistributorRow({ l }: { l: LinkSummary }) {
  const c = usePalette();
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/distributor/${l.distributor.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: R.md, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <T size="h2" tone="accent">
              {l.distributor.name.trim().charAt(0).toUpperCase()}
            </T>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T bold numberOfLines={1}>
              {l.distributor.name}
            </T>
            <T size="small" tone="hint" numberOfLines={1}>
              {l.distributor.categories.join(', ')}
            </T>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.hint} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Badge label={`Yetkazish: ${l.distributor.deliveryDays.join(', ')}`} />
          {l.activeOrders > 0 && <Badge label={`Faol buyurtma: ${l.activeOrders}`} tone="accent" />}
        </View>
      </Card>
    </Pressable>
  );
}
