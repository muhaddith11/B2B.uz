import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Badge, Chip, Empty, Loading, PressCard, Screen, SearchInput, SectionTitle, T } from '@/components/ui';
import { useSession } from '@/context/session';
import { AGREEMENT_LABEL, type BrandCard } from '@/lib/staff-types';

// Tovar egalari: kelishuvlarim va barcha tasdiqlangan brendlar
export default function StaffBrands() {
  const { api } = useSession();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [data, setData] = useState<{ categories: string[]; brands: BrandCard[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (category) params.set('category', category);
    const t = setTimeout(() => {
      api<{ categories: string[]; brands: BrandCard[] }>(`/api/staff/brands?${params}`)
        .then((d) => {
          setData(d);
          setErr(null);
        })
        .catch((e) => setErr(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [api, q, category]);

  const mine = data?.brands.filter((b) => b.agreement && (b.agreement.status === 'ACTIVE' || b.agreement.status === 'PROPOSED')) ?? [];
  const others = data?.brands.filter((b) => !mine.includes(b)) ?? [];

  return (
    <Screen gap={8}>
      <SearchInput value={q} onChangeText={setQ} placeholder="Brend yoki tovar nomi" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {[null, ...(data?.categories ?? [])].map((c) => (
          <Chip key={c ?? 'all'} label={c ?? 'Hammasi'} active={category === c} onPress={() => setCategory(c)} />
        ))}
      </ScrollView>
      {err && (
        <T size="small" tone="danger">
          {err}
        </T>
      )}
      {!data && !err && <Loading />}
      {mine.length > 0 && <SectionTitle>Kelishuvlarim</SectionTitle>}
      {mine.map((b) => (
        <BrandRow key={b.id} b={b} />
      ))}
      {others.length > 0 && <SectionTitle>Tovar egalari</SectionTitle>}
      {others.map((b) => (
        <BrandRow key={b.id} b={b} />
      ))}
      {data && data.brands.length === 0 && <Empty>Hech narsa topilmadi</Empty>}
    </Screen>
  );
}

function BrandRow({ b }: { b: BrandCard }) {
  const incoming = b.agreement?.status === 'PROPOSED' && b.agreement.initiatedBy === 'BRAND';
  return (
    <PressCard onPress={() => router.push(`/staff/brand/${b.id}`)}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <T bold style={{ flex: 1 }}>
          {b.name}
        </T>
        {b.agreement && (
          <Badge
            label={incoming ? 'Sizga taklif' : AGREEMENT_LABEL[b.agreement.status]}
            tone={incoming ? 'warn' : b.agreement.status === 'ACTIVE' ? 'ok' : b.agreement.status === 'PROPOSED' ? 'accent' : 'hint'}
          />
        )}
      </View>
      <T size="small" tone="hint">
        {b.categories.join(', ')} · {b.productCount} ta tovar
      </T>
      {b.description && (
        <T size="small" numberOfLines={2}>
          {b.description}
        </T>
      )}
    </PressCard>
  );
}
