import { useState } from 'react';

import { OrderCard } from '@/components/staff';
import { Empty, ErrorText, Loading, Screen, Segmented } from '@/components/ui';
import { useStaff } from '@/context/staff';
import type { StaffOrder } from '@/lib/staff-types';
import type { OrderStatus } from '@/lib/types';
import { useLoad } from '@/lib/use-load';

const TABS: { value: OrderStatus | 'ALL'; label: string }[] = [
  { value: 'SENT', label: 'Yangi' },
  { value: 'ACCEPTED', label: 'Qabul qilingan' },
  { value: 'IN_DELIVERY', label: "Yo'lda" },
  { value: 'DELIVERED', label: 'Topshirilgan' },
  { value: 'REJECTED', label: 'Rad etilgan' },
  { value: 'CANCELLED', label: 'Bekor qilingan' },
];

export default function StaffOrders() {
  const { can } = useStaff();
  const agent = can('AGENT');
  const [status, setStatus] = useState<OrderStatus | 'ALL'>(agent ? 'ALL' : 'SENT');
  const { data, error, refreshing, reload } = useLoad<{ orders: StaffOrder[] }>(`/api/staff/orders${status === 'ALL' ? '' : `?status=${status}`}`);
  const tabs = agent ? [{ value: 'ALL' as const, label: 'Hammasi' }, ...TABS.slice(1)] : TABS;

  return (
    <Screen refreshing={refreshing} onRefresh={reload} gap={8}>
      <Segmented value={status} options={tabs} onChange={setStatus} />
      {error && !data && <ErrorText>{error}</ErrorText>}
      {!data && !error && <Loading />}
      {data?.orders.map((o) => (
        <OrderCard key={o.id} o={o} />
      ))}
      {data?.orders.length === 0 && <Empty>Bu holatda buyurtma yo'q</Empty>}
    </Screen>
  );
}
