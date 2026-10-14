import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Badge, Empty, ErrorState, Loading, PressCard, Screen, Segmented, StickyBar, T } from '@/components/ui';
import { t } from '@/lib/i18n';
import { formatDate, formatSom } from '@/lib/money';
import { brandOrderLabel, type BrandOrderRow, type BrandOrderStatus } from '@/lib/staff-types';
import { useLoad } from '@/lib/use-load';

type Tab = BrandOrderStatus | 'ALL';

// Distribyutorlarning xarid buyurtmalari
export default function BrandOrders() {
  const [status, setStatus] = useState<Tab>('SENT');
  const { data, error, refreshing, reload, retry } = useLoad<{ orders: BrandOrderRow[] }>(`/api/brand/orders${status === 'ALL' ? '' : `?status=${status}`}`);
  const tabs: { value: Tab; label: string }[] = [
    { value: 'SENT', label: t('Yangi') },
    { value: 'ACCEPTED', label: t('Qabul qilingan') },
    { value: 'SHIPPED', label: t("Jo'natilgan") },
    { value: 'DELIVERED', label: t('Yetib borgan') },
    { value: 'ALL', label: t('Hammasi') },
  ];

  if (error && !data) return <ErrorState message={error} onRetry={retry} />;

  return (
    <Screen refreshing={refreshing} onRefresh={reload} gap={8} sticky>
      <StickyBar>
        <Segmented value={status} options={tabs} onChange={setStatus} />
      </StickyBar>
      {!data && <Loading inline />}
      {data?.orders.map((o) => (
        <PressCard key={o.id} onPress={() => router.push(`/brand/order/${o.id}`)}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <T bold num style={{ flex: 1 }}>
              №{o.number} · {o.distributor}
            </T>
            <Badge
              label={brandOrderLabel(o.status)}
              tone={o.status === 'DELIVERED' ? 'ok' : o.status === 'SENT' ? 'accent' : o.status === 'REJECTED' || o.status === 'CANCELLED' ? 'danger' : 'hint'}
            />
          </View>
          <T size="tiny" tone="hint" num numberOfLines={1}>
            {formatDate(o.createdAt)} · {o.items.map((i) => `${i.name} × ${i.qty}`).join(', ')}
          </T>
          <T size="small" bold num>
            {formatSom(o.total)}
          </T>
        </PressCard>
      ))}
      {data?.orders.length === 0 && <Empty icon="receipt-outline">{t("Bu holatda buyurtma yo'q")}</Empty>}
    </Screen>
  );
}
