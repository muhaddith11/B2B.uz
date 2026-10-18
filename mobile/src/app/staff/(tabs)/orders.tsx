import { useState } from 'react';

import { OrderCard } from '@/components/staff';
import { Banner, Empty, ErrorState, Loading, LoadMore, Screen, Segmented, StickyBar } from '@/components/ui';
import { useSession } from '@/context/session';
import { useStaff } from '@/context/staff';
import { haptic } from '@/lib/haptics';
import { t } from '@/lib/i18n';
import type { StaffOrder } from '@/lib/staff-types';
import type { OrderStatus } from '@/lib/types';
import { usePaged } from '@/lib/use-paged';

type Tab = OrderStatus | 'ALL';
type OrdersPage = { orders: StaffOrder[]; nextCursor?: string | null };
const pickOrders = (r: OrdersPage) => r.orders;

export default function StaffOrders() {
  const { api } = useSession();
  const { can } = useStaff();
  const agent = can('AGENT');
  const manager = can('ADMIN', 'OPERATOR');
  const [status, setStatus] = useState<Tab>(agent ? 'ALL' : 'SENT');
  const { data, items, error, refreshing, reload, retry, more, loadingMore, moreError } = usePaged(`/api/staff/orders${status === 'ALL' ? '' : `?status=${status}`}`, pickOrders);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const tabs: { value: Tab; label: string }[] = [
    agent ? { value: 'ALL', label: t('Hammasi') } : { value: 'SENT', label: t('Yangi') },
    { value: 'ACCEPTED', label: t('Qabul qilingan') },
    { value: 'IN_DELIVERY', label: t("Yo'lda") },
    { value: 'DELIVERED', label: t('Topshirilgan') },
    { value: 'REJECTED', label: t('Rad etilgan') },
    { value: 'CANCELLED', label: t('Bekor qilingan') },
  ];

  // Yangi buyurtmani ro'yxatdan turib qabul qilish
  async function accept(o: StaffOrder) {
    setAccepting(o.id);
    setErr(null);
    try {
      await api(`/api/staff/orders/${o.id}`, { method: 'POST', body: JSON.stringify({ to: 'ACCEPTED' }) });
      haptic.success();
      await reload();
    } catch (e) {
      setErr((e as Error).message);
      haptic.error();
    } finally {
      setAccepting(null);
    }
  }

  if (error && !data) return <ErrorState message={error} onRetry={retry} />;

  return (
    <Screen refreshing={refreshing} onRefresh={reload} sticky>
      <StickyBar>
        <Segmented value={status} options={tabs} onChange={setStatus} />
      </StickyBar>
      {err && <Banner tone="danger">{err}</Banner>}
      {!data && <Loading inline />}
      {items?.map((o) => (
        <OrderCard key={o.id} o={o} onAccept={manager && o.status === 'SENT' ? () => accept(o) : undefined} accepting={accepting === o.id} />
      ))}
      <LoadMore onPress={more} loading={loadingMore} error={moreError} />
      {items?.length === 0 && (
        <Empty icon="receipt-outline">{status === 'SENT' ? t("Yangi buyurtma yo'q. Kelganda bildirishnoma keladi.") : t("Bu holatda buyurtma yo'q")}</Empty>
      )}
    </Screen>
  );
}
