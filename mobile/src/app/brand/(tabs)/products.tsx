import { router } from 'expo-router';
import { View } from 'react-native';

import { Badge, Button, Empty, ErrorState, Loading, PressCard, Row, Screen, T, Thumb } from '@/components/ui';
import { t, tx } from '@/lib/i18n';
import { formatSom } from '@/lib/money';
import type { BrandProductRow } from '@/lib/staff-types';
import { useLoad } from '@/lib/use-load';

export default function BrandProducts() {
  const { data, error, refreshing, reload, retry } = useLoad<{ products: BrandProductRow[] }>('/api/brand/products');
  if (error && !data) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return <Loading rows={3} />;
  return (
    <Screen refreshing={refreshing} onRefresh={reload} gap={8}>
      <Button title={t('+ Yangi tovar')} onPress={() => router.push('/brand/product/new')} />
      {data.products.map((p) => (
        <PressCard key={p.id} onPress={() => router.push(`/brand/product/${p.id}`)} style={{ opacity: p.active ? 1 : 0.5 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {p.imageUrl ? <Thumb uri={p.imageUrl} name={p.name} size={56} /> : null}
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <T bold style={{ flex: 1 }}>
                  {p.name}
                </T>
                {!p.active && <Badge label={t('nofaol')} />}
              </View>
              <T size="tiny" tone="hint">
                {p.category} · {t('yashikda {n} {unit}', { n: p.packSize, unit: tx(p.unit) })} · {t('{n} ta distribyutor katalogida', { n: p.distributors })}
              </T>
            </View>
          </View>
          <Row label={t('Distribyutorga narx')} value={formatSom(p.price)} />
          {p.retailPrice && <Row label={t('Tavsiya chakana')} value={formatSom(p.retailPrice)} />}
        </PressCard>
      ))}
      {data.products.length === 0 && <Empty icon="cube-outline">{t("Hali tovar qo'shilmagan")}</Empty>}
    </Screen>
  );
}
