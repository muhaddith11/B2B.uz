import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AccountLinks } from '@/components/account-links';
import { PicEdit } from '@/components/pic-edit';
import { ProfileCard } from '@/components/profile';
import { SubscriptionBanner, subscriptionText } from '@/components/subscription';
import { AbrBar, Badge, Banner, Button, Card, Empty, ErrorState, Loading, Money, Pic, PressCard, Screen, SectionTitle, ShellBand, StatusSteps, T } from '@/components/ui';
import { FONT, usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { confirm } from '@/lib/confirm';
import { haptic } from '@/lib/haptics';
import { t, tx } from '@/lib/i18n';
import { formatAmount, formatDate, formatSom } from '@/lib/money';
import type { ActiveOrder, HomeData, Invite, LinkSummary } from '@/lib/types';
import { useLoad } from '@/lib/use-load';

export default function HomeScreen() {
  const { data, setData, error, refreshing, reload, retry } = useLoad<HomeData>('/api/shop/home');

  if (error && !data) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return <Loading safeTop />;

  return (
    <Screen band={<DebtBand data={data} onShopImage={(imageUrl) => setData({ ...data, shop: { ...data.shop, imageUrl } })} />} refreshing={refreshing} onRefresh={reload}>
      <SubscriptionBanner s={data.subscription} who="shop" />

      {!!data.confirmations?.orders && (
        <ConfirmRow icon="receipt-outline" href="/orders" text={t('Tasdiqingizni kutayotgan buyurtma: {n}', { n: data.confirmations.orders })} />
      )}
      {!!data.confirmations?.debts && (
        <ConfirmRow icon="wallet-outline" href="/debts" text={t("Tasdiqingizni kutayotgan qarz so'rovi: {n}", { n: data.confirmations.debts })} />
      )}

      {data.invites.length > 0 && (
        <>
          <SectionTitle>{t('Ulanish takliflari')}</SectionTitle>
          {data.invites.map((inv) => (
            <InviteCard key={inv.linkId} inv={inv} owner={data.user.role === 'OWNER'} onDone={reload} />
          ))}
        </>
      )}

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
      {data.user.role === 'OWNER' && <Button title={t('Sotuvchilar')} icon="people-outline" kind="secondary" onPress={() => router.push('/shop-team')} />}
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

// Distribyutor taklifi: agent do'konni qo'shgan, lekin egasi roziligisiz distribyutor do'konni ko'rmaydi,
// buyurtma va qarz yoza olmaydi. Qabul qilinsa katalog ochiladi, rad etilsa taklif o'chadi
function InviteCard({ inv, owner, onDone }: { inv: Invite; owner: boolean; onDone: () => void }) {
  const { api } = useSession();
  const [busy, setBusy] = useState<'accept' | 'reject' | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function answer(action: 'accept' | 'reject') {
    if (action === 'reject') {
      const ok = await confirm({ title: t('{name} taklifi rad etilsinmi?', { name: inv.name }), action: t('Rad etish') });
      if (!ok) return;
    }
    setBusy(action);
    setErr(null);
    try {
      await api(`/api/shop/invites/${inv.linkId}`, { method: 'POST', body: JSON.stringify({ action }) });
      if (action === 'accept') haptic.success();
      onDone();
    } catch (e) {
      setErr((e as Error).message);
      haptic.error();
      setBusy(null);
    }
  }

  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pic uri={inv.logoUrl} name={inv.name} size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <T bold numberOfLines={1}>
            {inv.name}
          </T>
          <T size="small" tone="hint" numberOfLines={1}>
            {inv.categories.join(', ')}
          </T>
        </View>
      </View>
      <T size="small">{t("Sizni o'z do'konlari ro'yxatiga qo'shmoqchi. Qabul qilsangiz, katalogi ochiladi va agenti sizdan buyurtma oladi.")}</T>
      {owner ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title={t('Qabul qilish')} style={{ flex: 2 }} loading={busy === 'accept'} disabled={busy !== null} onPress={() => answer('accept')} />
          <Button title={t('Rad etish')} kind="secondary" style={{ flex: 1 }} loading={busy === 'reject'} disabled={busy !== null} onPress={() => answer('reject')} />
        </View>
      ) : (
        <Badge label={t("Do'kon egasi tasdiqlaydi")} tone="warn" />
      )}
      {err && <Banner tone="danger">{err}</Banner>}
    </Card>
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

// Do'kon egasidan javob kutayotgan narsa: bosilsa o'sha ekranga o'tadi
function ConfirmRow({ icon, text, href }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string; href: '/orders' | '/debts' }) {
  const c = usePalette();
  return (
    <PressCard onPress={() => router.push(href)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.warnSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={18} color={c.warn} />
        </View>
        <T style={{ flex: 1, fontWeight: '600' }}>{text}</T>
        <Ionicons name="chevron-forward" size={18} color={c.hint} />
      </View>
    </PressCard>
  );
}
