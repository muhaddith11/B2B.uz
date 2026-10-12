import { router } from 'expo-router';
import { View } from 'react-native';

import { OrderCard, ShopList } from '@/components/staff';
import { Banner, Button, Card, Empty, ErrorText, Loading, PressCard, Screen, SectionTitle, T } from '@/components/ui';
import { useStaff } from '@/context/staff';
import { formatSom } from '@/lib/money';
import type { Dashboard, StaffOrder } from '@/lib/staff-types';
import { useLoad } from '@/lib/use-load';

// Bosh sahifa rolga qarab: rahbariyat uchun raqamlar, agent uchun do'konlari, yetkazuvchi uchun yetkazishlar
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

function Stat({ label, value, sub, href, tone }: { label: string; value: string; sub?: string; href?: Parameters<typeof router.push>[0]; tone?: 'danger' | 'accent' }) {
  const body = (
    <>
      <T size="small" tone="hint">
        {label}
      </T>
      <T size="h2" tone={tone}>
        {value}
      </T>
      {sub && (
        <T size="tiny" tone="hint">
          {sub}
        </T>
      )}
    </>
  );
  return (
    <View style={{ flexBasis: '47%', flexGrow: 1 }}>
      {href ? <PressCard onPress={() => router.push(href)}>{body}</PressCard> : <Card style={{ gap: 4 }}>{body}</Card>}
    </View>
  );
}

function ManagerHome() {
  const { me, can } = useStaff();
  const { data, error, refreshing, reload } = useLoad<Dashboard>('/api/staff/dashboard');
  if (error && !data) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <View>
        <T size="title">{me?.distributor.name ?? ''}</T>
        <T size="small" tone="hint">
          {me?.staff.name}
        </T>
      </View>
      <Pending />

      {(data.requests > 0 || data.pendingPayments > 0 || data.brandProposals > 0 || data.brandOrdersToReceive > 0) && (
        <View style={{ gap: 8 }}>
          {data.requests > 0 && can('ADMIN', 'OPERATOR') && <Button title={`${data.requests} ta yangi do'kon ulanishni so'rayapti`} kind="secondary" onPress={() => router.push('/staff/requests')} />}
          {data.pendingPayments > 0 && can('ADMIN', 'ACCOUNTANT') && <Button title={`${data.pendingPayments} ta to'lov tasdiqlashni kutmoqda`} kind="secondary" onPress={() => router.push('/staff/payments')} />}
          {data.brandProposals > 0 && can('ADMIN') && <Button title={`${data.brandProposals} ta tovar egasidan hamkorlik taklifi`} kind="secondary" onPress={() => router.push('/staff/brands')} />}
          {data.brandOrdersToReceive > 0 && can('ADMIN') && <Button title={`${data.brandOrdersToReceive} ta xarid jo'natilgan, qabul qiling`} kind="secondary" onPress={() => router.push('/staff/brands')} />}
        </View>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Stat label="Yangi buyurtmalar" value={`${data.newOrders.count} ta`} sub={formatSom(data.newOrders.sum)} href="/staff/orders" tone={data.newOrders.count > 0 ? 'accent' : undefined} />
        <Stat label="Qabul qilingan" value={`${data.acceptedOrders} ta`} sub="yo'lga chiqarish kerak" href="/staff/orders" />
        <Stat label="Yo'lda" value={`${data.inDelivery} ta`} href="/staff/orders" />
        <Stat label="Bugun topshirildi" value={`${data.deliveredToday.count} ta`} sub={formatSom(data.deliveredToday.sum)} />
        <Stat label="Bugun tushgan to'lov" value={formatSom(data.paidToday)} href={can('ADMIN', 'ACCOUNTANT', 'OPERATOR') ? '/staff/payments' : undefined} />
        <Stat
          label="Muddati o'tgan qarz"
          value={formatSom(data.overdue.sum)}
          sub={`${data.overdue.shops} ta do'kon`}
          href="/staff/shops"
          tone={data.overdue.sum > 0 ? 'danger' : undefined}
        />
      </View>
      <T size="small" tone="hint">
        Faol do'konlar: {data.shops} ta
      </T>
    </Screen>
  );
}

function AgentHome() {
  const { me } = useStaff();
  const { data, refreshing, reload } = useLoad<Dashboard>('/api/staff/dashboard');
  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <ShopList
        header={
          <>
            <Pending />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <T size="h2">{me?.staff.name}</T>
                {data && (
                  <T size="small" tone="hint">
                    Bugun yig'ilgan: {formatSom(data.paidToday)}
                  </T>
                )}
              </View>
            </View>
            <Button title="+ Yangi do'kon qo'shish" onPress={() => router.push('/staff/shop-new')} />
          </>
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
      refreshing={refreshing}
      onRefresh={() => {
        reload();
        today.reload();
      }}>
      <Card style={{ gap: 4 }}>
        <T size="small" tone="hint">
          Yetkazish kerak
        </T>
        <T size="title">{data.orders.length} ta</T>
        <T size="small" tone="hint">
          {formatSom(total)}
          {today.data ? ` · bugun topshirildi: ${today.data.deliveredToday.count} ta, yig'ilgan naqd: ${formatSom(today.data.paidToday)}` : ''}
        </T>
      </Card>
      <SectionTitle>Yo'ldagi buyurtmalar</SectionTitle>
      {data.orders.map((o) => (
        <OrderCard key={o.id} o={o} />
      ))}
      {data.orders.length === 0 && <Empty>Hozircha yetkazish yo'q</Empty>}
    </Screen>
  );
}
