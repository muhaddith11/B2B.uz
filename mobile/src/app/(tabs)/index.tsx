import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AccountLinks } from '@/components/account-links';
import { PicEdit } from '@/components/pic-edit';
import { ProfileCard } from '@/components/profile';
import { SubscriptionBanner, subscriptionText } from '@/components/subscription';
import { AbrBar, Badge, Button, Card, Empty, ErrorState, Loading, Money, Pic, PressCard, Screen, SectionTitle, ShellBand, StatusSteps, T } from '@/components/ui';
import { FONT, usePalette } from '@/constants/theme';
import { t, tx } from '@/lib/i18n';
import { formatAmount, formatDate, formatSom } from '@/lib/money';
import type { ActiveOrder, HomeData, LinkSummary } from '@/lib/types';
import { useLoad } from '@/lib/use-load';

export default function HomeScreen() {
  const { data, setData, error, refreshing, reload, retry } = useLoad<HomeData>('/api/shop/home');

  if (error && !data) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return <Loading safeTop />;

  return (
    <Screen band={<DebtBand data={data} onShopImage={(imageUrl) => setData({ ...data, shop: { ...data.shop, imageUrl } })} />} refreshing={refreshing} onRefresh={reload}>
      <SubscriptionBanner s={data.subscription} who="shop" />

      {data.active.length > 0 && (
        <>
          <SectionTitle
            right={
              <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.push('/orders')}>
                <T size="small" tone="accent" style={{ fontWeight: '600' }}>
                  {t('Hammasi')}
                </T>
              </Pressable>
            }>
            {t("Yo'ldagi buyurtmalar")}
          </SectionTitle>
          {data.active.map((o) => (
            <ActiveOrderCard key={o.id} o={o} />
          ))}
        </>
      )}

      <SectionTitle right={<T size="small" tone="hint">{t('{n} ta', { n: data.links.length })}</T>}>{t('Buyurtma berish')}</SectionTitle>
      {data.links.map((l) => (
        <DistributorRow key={l.linkId} l={l} />
      ))}
      {data.links.length === 0 && (
        <Card>
          <Empty icon="storefront-outline">{t("Hali birorta distribyutorga ulanmagansiz. Hududingizdagi distribyutorlarni toping va ulanish so'rovini yuboring.")}</Empty>
        </Card>
      )}
      <Button title={t('Yangi distribyutor topish')} icon="search" kind="secondary" onPress={() => router.push('/find')} />

      {data.requests.length > 0 && (
        <>
          <SectionTitle>{t("Ulanish so'rovlarim")}</SectionTitle>
          <Card style={{ gap: 12 }}>
            {data.requests.map((r) => (
              <View key={r.distributorId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pic uri={r.logoUrl} name={r.name} size={36} />
                <View style={{ flex: 1, gap: 4 }}>
                  <T bold numberOfLines={1}>
                    {r.name}
                  </T>
                  <Badge label={t('Javob kutilmoqda · {date}', { date: formatDate(r.createdAt) })} tone="warn" />
                </View>
              </View>
            ))}
          </Card>
        </>
      )}

      <SectionTitle>{t('Profil')}</SectionTitle>
      <ProfileCard
        name={data.user.name}
        sub={`${data.user.role === 'OWNER' ? t("Do'kon egasi") : t('Sotuvchi')} · ${t('Obuna · {status}', { status: subscriptionText(data.subscription) })}`}
        avatarUrl={data.user.avatarUrl}
        onAvatar={(avatarUrl) => setData({ ...data, user: { ...data.user, avatarUrl } })}
      />
      <AccountLinks />
    </Screen>
  );
}

// Indigo tasma: do'kon surati, umumiy qarz va nasiya limitidan qancha bo'yalgani (qolgani doim raqamda)
function DebtBand({ data, onShopImage }: { data: HomeData; onShopImage: (url: string | null) => void }) {
  const c = usePalette();
  const debt = data.links.reduce((s, l) => s + l.debt, 0);
  const overdue = data.links.reduce((s, l) => s + l.overdueAmount, 0);
  const limit = data.links.reduce((s, l) => s + l.creditLimit, 0);
  const left = data.links.reduce((s, l) => s + Math.max(0, l.creditAvailable), 0);
  const nextDue = data.links
    .map((l) => l.nextDue)
    .filter((d): d is string => d !== null)
    .sort()[0];
  const owner = data.user.role === 'OWNER';

  return (
    <ShellBand>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {owner ? (
          <PicEdit uri={data.shop.imageUrl} name={data.shop.name} size={52} ring={c.shell} label={t("Do'kon surati")} path="/api/shop/image" field="imageUrl" onChange={onShopImage} />
        ) : (
          <Pic uri={data.shop.imageUrl} name={data.shop.name} size={52} />
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <T bold numberOfLines={1} style={{ color: c.shellText, fontSize: 17 }}>
            {data.shop.name}
          </T>
          <T size="small" numberOfLines={1} style={{ color: c.shellHint }}>
            {data.shop.address}
          </T>
        </View>
      </View>

      <View style={{ gap: 4 }}>
        <T size="small" style={{ color: c.shellHint }}>
          {data.links.length > 0 ? t('Umumiy qarz · {n} distribyutor', { n: data.links.length }) : t('Umumiy qarz')}
        </T>
        <Money value={debt} size="display" color={c.shellText} />
        {overdue > 0 ? (
          <View style={{ alignSelf: 'flex-start', backgroundColor: c.dangerSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
            <T size="tiny" tone="danger" num style={{ fontWeight: '600' }}>
              {overdue >= debt ? t("Hammasi muddati o'tgan") : t("Muddati o'tgan: {sum}", { sum: formatSom(overdue) })}
            </T>
          </View>
        ) : nextDue ? (
          <T size="small" num style={{ color: c.shellHint }}>
            {t("Eng yaqin to'lov: {date}", { date: formatDate(nextDue) })}
          </T>
        ) : null}
      </View>

      {limit > 0 && (
        <View style={{ gap: 8 }}>
          <AbrBar value={debt / limit} dye={c.dye} track="rgba(255,255,255,0.14)" label={t('Nasiya limitidan ishlatilgani')} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <T size="small" num style={{ color: c.shellHint }}>
              {t('Limit {sum}', { sum: formatAmount(limit) })}
            </T>
            <T size="small" num style={{ color: c.shellHint }}>
              {t('Qoldi')}{' '}
              <T size="small" num style={{ color: c.shellText, fontFamily: FONT.textSemi }}>
                {formatSom(left)}
              </T>
            </T>
          </View>
        </View>
      )}

      {debt > 0 && <Button title={t("Qarzni to'lash")} icon="wallet-outline" kind="light" onPress={() => router.push('/debts')} />}
    </ShellBand>
  );
}

// Yo'ldagi buyurtma: distribyutor logosi, raqam va yashiklar, summa; ostida doim bir joyda abr holat chizig'i
function ActiveOrderCard({ o }: { o: ActiveOrder }) {
  return (
    <PressCard onPress={() => router.push('/orders')} style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pic uri={o.distributor.logoUrl} name={o.distributor.name} size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <T bold numberOfLines={1}>
            {o.distributor.name}
          </T>
          <T size="small" tone="hint" num numberOfLines={1}>
            №{o.number} · {t('{n} yashik', { n: o.packs })}
          </T>
        </View>
        <Money value={o.total} />
      </View>
      <StatusSteps status={o.status} times={o} />
    </PressCard>
  );
}

// Distribyutor qatori: bosilganda katalog ochiladi
function DistributorRow({ l }: { l: LinkSummary }) {
  const c = usePalette();
  return (
    <PressCard onPress={() => router.push(`/distributor/${l.distributor.id}`)} style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pic uri={l.distributor.logoUrl} name={l.distributor.name} size={44} />
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
        <Badge label={t('Yetkazish: {days}', { days: l.distributor.deliveryDays.map(tx).join(', ') })} />
        {l.activeOrders > 0 && <Badge label={t('Faol buyurtma: {n}', { n: l.activeOrders })} tone="accent" />}
      </View>
    </PressCard>
  );
}
