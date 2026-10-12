import { router } from 'expo-router';
import { View } from 'react-native';

import { Badge, Button, Empty, ErrorText, Loading, PressCard, Row, Screen, T } from '@/components/ui';
import { formatSom } from '@/lib/money';
import type { BrandProductRow } from '@/lib/staff-types';
import { useLoad } from '@/lib/use-load';

export default function BrandProducts() {
  const { data, error, refreshing, reload } = useLoad<{ products: BrandProductRow[] }>('/api/brand/products');
  if (error && !data) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;
  return (
    <Screen refreshing={refreshing} onRefresh={reload} gap={8}>
      <Button title="+ Yangi tovar" onPress={() => router.push('/brand/product/new')} />
      {data.products.map((p) => (
        <PressCard key={p.id} onPress={() => router.push(`/brand/product/${p.id}`)} style={{ opacity: p.active ? 1 : 0.5 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <T bold style={{ flex: 1 }}>
              {p.name}
            </T>
            {!p.active && <Badge label="nofaol" />}
          </View>
          <T size="tiny" tone="hint">
            {p.category} · yashikda {p.packSize} {p.unit} · {p.distributors} ta distribyutor katalogida
          </T>
          <Row label="Distribyutorga narx" value={formatSom(p.price)} />
          {p.retailPrice && <Row label="Tavsiya chakana" value={formatSom(p.retailPrice)} />}
        </PressCard>
      ))}
      {data.products.length === 0 && <Empty>Hali tovar qo'shilmagan</Empty>}
    </Screen>
  );
}
