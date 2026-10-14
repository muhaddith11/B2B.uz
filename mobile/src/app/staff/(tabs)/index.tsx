import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { OrderCard, ShopList } from '@/components/staff';
import { Banner, Card, Count, Divider, Empty, ErrorText, IconButton, ListRow, Loading, Money, Row, Screen, SectionTitle, T } from '@/components/ui';
import { useSession } from '@/context/session';
import { useStaff } from '@/context/staff';
import { formatSom } from '@/lib/money';
import { ROLE_LABEL } from '@/lib/staff-types';
import type { Dashboard, StaffOrder } from '@/lib/staff-types';
import { useLoad } from '@/lib/use-load';

// Bosh sahifa rolga qarab: rahbariyat uchun bugungi ishlar, agent uchun do'konlari, yetkazuvchi uchun yetkazishlar
export default function StaffHome() {
  const { can } = useStaff();
  if (can('AGENT')) return <AgentHome />;
  if (can('COURIER')) return <CourierHome />;
  return <ManagerHome />;
}

function Pending() {
  const { me } = useStaff();
  if (me?.distributor.status !== 'PENDING') return null;
  return <Banner>Kompaniyangiz platforma tekshiruvida. Tasdiqlangach, do'konlar sizni topa oladi. Hozircha tovarlar, xodimlar va to'lov usullarini sozlang.</Banner>;
}

function Header({ right }: { right?: React.ReactNode }) {
  const { me } = useStaff();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ flex: 1 }}>
        <T size="title" numberOfLines={1}>
          {me?.distributor.name ?? ''}
        </T>
        <T size="small" tone="hint" numberOfLines={1}>
          {me ? `${me.staff.name} · ${ROLE_LABEL[me.staff.role]}` : ''}
        </T>
      </View>
      {right}
    </View>
  );
}

function ManagerHome() {
  const { api } = useSession();
  const { can } = useStaff();
  const { data, error, refreshing, reload } = useLoad<Dashboard>('/api/staff/dashboard');
  const sent = useLoad<{ orders: StaffOrder[] }>('/api/staff/orders?status=SENT');
  const [accepting, setAccepting] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (error && !data) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;

  const manager = can('ADMIN', 'OPERATOR');
  // Yangi buyurtmalar kam bo'lsa, bosh sahifaning o'zida qabul qilinadi
  const inline = manager && data.newOrders.count > 0 && data.newOrders.count <= 3 ? (sent.data?.orders ?? []) : [];

  async function accept(o: StaffOrder) {
    setAccepting(o.id);
    setErr(null);
    try {
      await api(`/api/staff/orders/${o.id}`, { method: 'POST', body: JSON.stringify({ to: 'ACCEPTED' }) });
      await Promise.all([reload(), sent.reload()]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setAccepting(null);
    }
  }

  // Faqat bajariladigan ishi bor qatorlar
  const tasks = [
    { show: inline.length === 0, icon: 'receipt-outline' as const, title: 'Yangi buyurtmalar', sub: formatSom(data.newOrders.sum), n: data.newOrders.count, href: '/staff/orders' as const },
    { show: true, icon: 'car-outline' as const, title: "Yo'lga chiqarish kerak", n: data.acceptedOrders, href: '/staff/orders' as const },
    { show: manager, icon: 'person-add-outline' as const, title: "Ulanish so'rovlari", n: data.requests, href: '/staff/requests' as const },
    { show: can('ADMIN', 'ACCOUNTANT'), icon: 'document-text-outline' as const, title: "Tasdiqlanadigan to'lovlar", n: data.pendingPayments, href: '/staff/payments' as const },
    { show: can('ADMIN'), icon: 'ribbon-outline' as const, title: 'Tovar egalaridan takliflar', n: data.brandProposals, href: '/staff/brands' as const },
    { show: can('ADMIN'), icon: 'cube-outline' as const, title: 'Qabul qilinadigan xaridlar', n: data.brandOrdersToReceive, href: '/staff/brands' as const },
  ].filter((t) => t.show && t.n > 0);

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={() => {
        reload();
        sent.reload();
      }}
      safeTop>
      <Header />
      <Pending />

      {inline.length > 0 && (
        <>
          <SectionTitle right={<Count n={inline.length} />}>Yangi buyurtmalar</SectionTitle>
          {inline.map((o) => (
            <OrderCard key={o.id} o={o} onAccept={() => accept(o)} accepting={accepting === o.id} />
          ))}
          {err && <Banner tone="danger">{err}</Banner>}
        </>
      )}

      <SectionTitle>Bugungi ishlar</SectionTitle>
      {tasks.length > 0 ? (
        <Card style={{ gap: 8, paddingVertical: 8 }}>
          {tasks.map((t, i) => (
            <View key={t.title} style={{ gap: 8 }}>
              {i > 0 && <Divider />}
              <ListRow icon={t.icon} title={t.title} sub={t.sub} right={<Count n={t.n} />} onPress={() => router.push(t.href)} />
            </View>
          ))}
        </Card>
      ) : (
        <Card style={{ paddingVertical: 8 }}>
          <ListRow icon="checkmark-circle-outline" tone="ok" title={inline.length > 0 ? "Boshqa kutilayotgan ish yo'q" : "Kutilayotgan ish yo'q"} />
        </Card>
      )}

      <SectionTitle>Bugun</SectionTitle>
      <Card style={{ gap: 10 }}>
        <View style={{ gap: 2 }}>
          <T size="small" tone="hint">
            Tushgan to'lov
          </T>
          <Money value={data.paidToday} size="title" />
        </View>
        <Divider />
        <Row label="Topshirildi" value={`${data.deliveredToday.count} ta · ${formatSom(data.deliveredToday.sum)}`} />
        <Row label="Yo'lda" value={`${data.inDelivery} ta`} />
        <Row label="Faol do'konlar" value={`${data.shops} ta`} />
      </Card>

      {data.overdue.sum > 0 && (
        <Card style={{ paddingVertical: 8 }}>
          <ListRow
            icon="alert-circle-outline"
            tone="danger"
            title={`Muddati o'tgan qarz: ${formatSom(data.overdue.sum)}`}
            sub={`${data.overdue.shops} ta do'kon`}
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
    <Screen refreshing={refreshing} onRefresh={reload} safeTop>
      <ShopList
        orderAction
        hideAgent
        header={
          <View style={{ gap: 12 }}>
            <Header right={<IconButton icon="add-circle-outline" label="Yangi do'kon qo'shish" tone="accent" onPress={() => router.push('/staff/shop-new')} />} />
            {data && (
              <T size="small" tone="hint" num>
                Bugun yig'ilgan: {formatSom(data.paidToday)}
              </T>
            )}
            <Pending />
          </View>
        }
      />
    </Screen>
  );
}

function CourierHome() {
  const { data, error, refreshing, reload } = useLoad<{ orders: StaffOrder[] }>('/api/staff/orders?status=IN_DELIVERY');
  const today = useLoad<Dashboard>('/api/staff/dashboard');
  if (error && !data) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;
  const total = data.orders.reduce((s, o) => s + o.total, 0);
  return (
    <Screen
      safeTop
      refreshing={refreshing}
      onRefresh={() => {
        reload();
        today.reload();
      }}>
      <Header />
      <Card style={{ gap: 10 }}>
        <View style={{ gap: 2 }}>
          <T size="small" tone="hint">
            Yetkazish kerak · {data.orders.length} ta
          </T>
          <Money value={total} size="title" />
        </View>
        {today.data && (
          <>
            <Divider />
            <Row label="Bugun topshirildi" value={`${today.data.deliveredToday.count} ta`} />
            <Row label="Yig'ilgan naqd" value={formatSom(today.data.paidToday)} />
          </>
        )}
      </Card>
      <SectionTitle>Yo'ldagi buyurtmalar</SectionTitle>
      {data.orders.map((o) => (
        <OrderCard key={o.id} o={o} />
      ))}
      {data.orders.length === 0 && <Empty icon="car-outline">Hozircha yetkazish yo'q</Empty>}
    </Screen>
  );
}
