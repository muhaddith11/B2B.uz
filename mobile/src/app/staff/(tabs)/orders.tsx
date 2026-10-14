import { useState } from 'react';

import { OrderCard } from '@/components/staff';
import { Banner, Empty, ErrorText, Loading, Screen, Segmented } from '@/components/ui';
import { useSession } from '@/context/session';
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
  const { api } = useSession();
  const { can } = useStaff();
  const agent = can('AGENT');
  const manager = can('ADMIN', 'OPERATOR');
  const [status, setStatus] = useState<OrderStatus | 'ALL'>(agent ? 'ALL' : 'SENT');
  const { data, error, refreshing, reload } = useLoad<{ orders: StaffOrder[] }>(`/api/staff/orders${status === 'ALL' ? '' : `?status=${status}`}`);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const tabs = agent ? [{ value: 'ALL' as const, label: 'Hammasi' }, ...TABS.slice(1)] : TABS;

  // Yangi buyurtmani ro'yxatdan turib qabul qilish
  async function accept(o: StaffOrder) {
    setAccepting(o.id);
    setErr(null);
    try {
      await api(`/api/staff/orders/${o.id}`, { method: 'POST', body: JSON.stringify({ to: 'ACCEPTED' }) });
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setAccepting(null);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Segmented value={status} options={tabs} onChange={setStatus} />
      {err && <Banner tone="danger">{err}</Banner>}
      {error && !data && <ErrorText>{error}</ErrorText>}
      {!data && !error && <Loading />}
      {data?.orders.map((o) => (
        <OrderCard key={o.id} o={o} onAccept={manager && o.status === 'SENT' ? () => accept(o) : undefined} accepting={accepting === o.id} />
      ))}
      {data?.orders.length === 0 && <Empty icon="receipt-outline">{status === 'SENT' ? "Yangi buyurtma yo'q. Kelganda bildirishnoma keladi." : "Bu holatda buyurtma yo'q"}</Empty>}
    </Screen>
  );
}
