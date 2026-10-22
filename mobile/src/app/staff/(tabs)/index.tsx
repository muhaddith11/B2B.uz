import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { PicEdit } from '@/components/pic-edit';
import { OrderCard, ShopList } from '@/components/staff';
import { SubscriptionBanner } from '@/components/subscription';
import { AbrBar, Banner, Button, Card, Count, Divider, Empty, ErrorState, ListRow, Loading, Money, Pic, Row, Screen, SectionTitle, ShellBand, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useStaff } from '@/context/staff';
import { haptic } from '@/lib/haptics';
import { t } from '@/lib/i18n';
import { BRANDS_ENABLED } from '@/lib/features';
import { formatSom } from '@/lib/money';
import { roleLabel } from '@/lib/staff-types';
import type { Dashboard, StaffOrder } from '@/lib/staff-types';
import { useLoad } from '@/lib/use-load';

// Bosh sahifa rolga qarab: rahbariyat uchun bugungi ishlar, agent uchun do'konlari, yetkazuvchi uchun yetkazishlar
export default function StaffHome() {
  const { can } = useStaff();
  if (can('AGENT')) return <AgentHome />;
  if (can('COURIER')) return <CourierHome />;
  return <ManagerHome />;
}

// Kompaniya holati: to'xtatilgan bo'lsa va obuna ogohlantirishi
function Notices() {
  const { me } = useStaff();
  return (
    <>
      {me?.distributor.status === 'PENDING' && (
        <Banner tone="danger">{t("Kompaniya hisobi to'xtatilgan: yangi buyurtma va do'kon qo'shib bo'lmaydi. Captar bilan bog'laning.")}</Banner>
      )}
      <SubscriptionBanner s={me?.subscription} who="distributor" />
    </>
  );
}

// Indigo tasma: distribyutor logosi (admin almashtiradi), nomi, xodim va roli; ostida rolning asosiy ko'rsatkichi
function Band({ label, value, progress, children }: { label: string; value: number; progress?: { value: number; caption: string; right: string }; children?: React.ReactNode }) {
  const c = usePalette();
  const { me, can, reload } = useStaff();
  if (!me) return null;
  const d = me.distributor;
  return (
    <ShellBand>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {can('ADMIN') ? (
          <PicEdit uri={d.logoUrl} name={d.name} size={52} ring={c.shell} label={t('Kompaniya logosi')} path="/api/staff/logo" field="logoUrl" onChange={() => reload()} />
        ) : (
          <Pic uri={d.logoUrl} name={d.name} size={52} />
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <T bold numberOfLines={1} accessibilityRole="header" style={{ color: c.shellText, fontSize: 17 }}>
            {d.name}
          </T>
          <T size="small" numberOfLines={1} style={{ color: c.shellHint }}>
            {`${me.staff.name} · ${roleLabel(me.staff.role)}`}
          </T>
        </View>
      </View>
      <View style={{ gap: 4 }}>
        <T size="small" style={{ color: c.shellHint }}>
          {label}
        </T>
        <Money value={value} size="display" color={c.shellText} />
      </View>
      {progress && (
        <View style={{ gap: 8 }}>
          <AbrBar value={progress.value} dye={c.dye} track="rgba(255,255,255,0.14)" label={progress.caption} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <T size="small" num style={{ color: c.shellHint }}>
              {progress.caption}
            </T>
            <T size="small" num style={{ color: c.shellText, fontWeight: '600' }}>
              {progress.right}
            </T>
          </View>
        </View>
      )}
      {children}
    </ShellBand>
  );
}

// Bugungi yetkazish: topshirilgani yo'ldagilar bilan birga qanchasi
function deliveryProgress(delivered: number, onRoad: number) {
  const all = delivered + onRoad;
  if (all === 0) return undefined;
  return { value: delivered / all, caption: t('Bugungi yetkazish'), right: t('{done} / {all} topshirildi', { done: delivered, all }) };
}

function ManagerHome() {
  const { api } = useSession();
  const { can } = useStaff();
  const { data, error, refreshing, reload, retry } = useLoad<Dashboard>('/api/staff/dashboard');
  const sent = useLoad<{ orders: StaffOrder[] }>('/api/staff/orders?status=SENT');
  const [accepting, setAccepting] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (error && !data) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return <Loading safeTop />;

  const manager = can('ADMIN', 'OPERATOR');
  // Yangi buyurtmalar kam bo'lsa, bosh sahifaning o'zida qabul qilinadi
  const inline = manager && data.newOrders.count > 0 && data.newOrders.count <= 3 ? (sent.data?.orders ?? []) : [];

  async function accept(o: StaffOrder) {
    setAccepting(o.id);
    setErr(null);
    try {
      await api(`/api/staff/orders/${o.id}`, { method: 'POST', body: JSON.stringify({ to: 'ACCEPTED' }) });
      haptic.success();
      await Promise.all([reload(), sent.reload()]);
    } catch (e) {
      setErr((e as Error).message);
      haptic.error();
    } finally {
      setAccepting(null);
    }
  }

  // Faqat bajariladigan ishi bor qatorlar
  const tasks = [
    { key: 'new', show: inline.length === 0, icon: 'receipt-outline' as const, title: t('Yangi buyurtmalar'), sub: formatSom(data.newOrders.sum), n: data.newOrders.count, href: '/staff/orders' as const },
    { key: 'awaiting', show: true, icon: 'hourglass-outline' as const, title: t("Do'kon tasdig'ini kutmoqda"), n: data.awaitingShop ?? 0, href: '/staff/orders' as const },
    { key: 'dispatch', show: true, icon: 'car-outline' as const, title: t("Yo'lga chiqarish kerak"), n: data.acceptedOrders, href: '/staff/orders' as const },
    { key: 'requests', show: manager, icon: 'person-add-outline' as const, title: t("Ulanish so'rovlari"), n: data.requests, href: '/staff/requests' as const },
    { key: 'payments', show: can('ADMIN', 'ACCOUNTANT'), icon: 'document-text-outline' as const, title: t("Tasdiqlanadigan to'lovlar"), n: data.pendingPayments, href: '/staff/payments' as const },
    { key: 'proposals', show: BRANDS_ENABLED && can('ADMIN'), icon: 'ribbon-outline' as const, title: t('Tovar egalaridan takliflar'), n: data.brandProposals, href: '/staff/brands' as const },
    { key: 'receive', show: BRANDS_ENABLED && can('ADMIN'), icon: 'cube-outline' as const, title: t('Qabul qilinadigan xaridlar'), n: data.brandOrdersToReceive, href: '/staff/brands' as const },
  ].filter((task) => task.show && task.n > 0);

  return (
    <Screen
      band={<Band label={t("Bugun tushgan to'lov")} value={data.paidToday} progress={deliveryProgress(data.deliveredToday.count, data.inDelivery)} />}
      refreshing={refreshing}
      onRefresh={() => {
        reload();
        sent.reload();
      }}>
      <Notices />

      {inline.length > 0 && (
        <>
          <SectionTitle right={<Count n={inline.length} />}>{t('Yangi buyurtmalar')}</SectionTitle>
          {inline.map((o) => (
            <OrderCard key={o.id} o={o} onAccept={() => accept(o)} accepting={accepting === o.id} />
          ))}
          {err && <Banner tone="danger">{err}</Banner>}
        </>
      )}

      <SectionTitle>{t('Bugungi ishlar')}</SectionTitle>
      {tasks.length > 0 ? (
        <Card style={{ gap: 8, paddingVertical: 8 }}>
          {tasks.map((task, i) => (
            <View key={task.key} style={{ gap: 8 }}>
              {i > 0 && <Divider />}
              <ListRow icon={task.icon} title={task.title} sub={task.sub} right={<Count n={task.n} />} onPress={() => router.push(task.href)} />
            </View>
          ))}
        </Card>
      ) : (
        <Card style={{ paddingVertical: 8 }}>
          <ListRow icon="checkmark-circle-outline" tone="ok" title={inline.length > 0 ? t("Boshqa kutilayotgan ish yo'q") : t("Kutilayotgan ish yo'q")} />
        </Card>
      )}

      <SectionTitle>{t('Bugun')}</SectionTitle>
      <Card style={{ gap: 10 }}>
        <Row label={t('qator|Topshirildi')} value={t('{n} ta · {sum}', { n: data.deliveredToday.count, sum: formatSom(data.deliveredToday.sum) })} />
        <Row label={t("Yo'lda")} value={t('{n} ta', { n: data.inDelivery })} />
        <Row label={t("Faol do'konlar")} value={t('{n} ta', { n: data.shops })} />
      </Card>

      {data.overdue.sum > 0 && (
        <Card style={{ paddingVertical: 8 }}>
          <ListRow
            icon="alert-circle-outline"
            tone="danger"
            title={t("Muddati o'tgan qarz: {sum}", { sum: formatSom(data.overdue.sum) })}
            sub={t("{n} ta do'kon", { n: data.overdue.shops })}
            onPress={() => router.push('/staff/shops')}
          />
        </Card>
      )}
    </Screen>
  );
}

function AgentHome() {
  const { data, refreshing, reload } = useLoad<Dashboard>('/api/staff/dashboard');
  return (
    <Screen
      band={
        <Band label={t("Bugun yig'ilgan")} value={data?.paidToday ?? 0}>
          <Button title={t("Yangi do'kon qo'shish")} icon="add-circle-outline" kind="light" onPress={() => router.push('/staff/shop-new')} />
        </Band>
      }
      refreshing={refreshing}
      onRefresh={reload}>
      <ShopList orderAction hideAgent header={<Notices />} />
    </Screen>
  );
}

function CourierHome() {
  const { data, error, refreshing, reload, retry } = useLoad<{ orders: StaffOrder[] }>('/api/staff/orders?status=IN_DELIVERY');
  const today = useLoad<Dashboard>('/api/staff/dashboard');
  if (error && !data) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return <Loading safeTop />;
  const total = data.orders.reduce((s, o) => s + o.total, 0);
  return (
    <Screen
      band={
        <Band
          label={t('Yetkazish kerak · {n} ta', { n: data.orders.length })}
          value={total}
          progress={today.data ? deliveryProgress(today.data.deliveredToday.count, data.orders.length) : undefined}
        />
      }
      refreshing={refreshing}
      onRefresh={() => {
        reload();
        today.reload();
      }}>
      {today.data && (
        <Card style={{ gap: 10 }}>
          <Row label={t('Bugun topshirildi')} value={t('{n} ta', { n: today.data.deliveredToday.count })} />
          <Row label={t("Yig'ilgan naqd")} value={formatSom(today.data.paidToday)} />
        </Card>
      )}
      <SectionTitle>{t("Yo'ldagi buyurtmalar")}</SectionTitle>
      {data.orders.map((o) => (
        <OrderCard key={o.id} o={o} />
      ))}
      {data.orders.length === 0 && <Empty icon="car-outline">{t("Hozircha yetkazish yo'q")}</Empty>}
    </Screen>
  );
}
