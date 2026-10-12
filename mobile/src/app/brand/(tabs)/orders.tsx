import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Badge, Empty, ErrorText, Loading, PressCard, Screen, Segmented, T } from '@/components/ui';
import { formatDate, formatSom } from '@/lib/money';
import { BRAND_ORDER_LABEL, type BrandOrderRow, type BrandOrderStatus } from '@/lib/staff-types';
import { useLoad } from '@/lib/use-load';

const TABS: { value: BrandOrderStatus | 'ALL'; label: string }[] = [
  { value: 'SENT', label: 'Yangi' },
  { value: 'ACCEPTED', label: 'Qabul qilingan' },
  { value: 'SHIPPED', label: "Jo'natilgan" },
  { value: 'DELIVERED', label: 'Yetib borgan' },
  { value: 'ALL', label: 'Hammasi' },
];

// Distribyutorlarning xarid buyurtmalari
export default function BrandOrders() {
  const [status, setStatus] = useState<BrandOrderStatus | 'ALL'>('SENT');
  const { data, error, refreshing, reload } = useLoad<{ orders: BrandOrderRow[] }>(`/api/brand/orders${status === 'ALL' ? '' : `?status=${status}`}`);
  return (
    <Screen refreshing={refreshing} onRefresh={reload} gap={8}>
      <Segmented value={status} options={TABS} onChange={setStatus} />
      {error && !data && <ErrorText>{error}</ErrorText>}
      {!data && !error && <Loading />}
      {data?.orders.map((o) => (
        <PressCard key={o.id} onPress={() => router.push(`/brand/order/${o.id}`)}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <T bold style={{ flex: 1 }}>
              №{o.number} · {o.distributor}
            </T>
            <Badge label={BRAND_ORDER_LABEL[o.status]} tone={o.status === 'DELIVERED' ? 'ok' : o.status === 'SENT' ? 'accent' : o.status === 'REJECTED' || o.status === 'CANCELLED' ? 'danger' : 'hint'} />
          </View>
          <T size="tiny" tone="hint" numberOfLines={1}>
            {formatDate(o.createdAt)} · {o.items.map((i) => `${i.name} × ${i.qty}`).join(', ')}
          </T>
          <T size="small" bold>
            {formatSom(o.total)}
          </T>
        </PressCard>
      ))}
      {data?.orders.length === 0 && <Empty>Bu holatda buyurtma yo'q</Empty>}
    </Screen>
  );
}
