import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Badge, Chip, Empty, Loading, PressCard, Screen, SearchInput, T } from '@/components/ui';
import { useSession } from '@/context/session';
import { AGREEMENT_LABEL, type DistributorForBrand } from '@/lib/staff-types';

type Data = { categories: string[]; districts: string[]; distributors: DistributorForBrand[] };

// Hamkor distribyutor topish: hudud, toifa, qamrov
export default function BrandDistributors() {
  const { api } = useSession();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (category) params.set('category', category);
    if (district) params.set('district', district);
    const t = setTimeout(() => {
      api<Data>(`/api/brand/distributors?${params}`)
        .then((d) => {
          setData(d);
          setErr(null);
        })
        .catch((e) => setErr(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [api, q, category, district]);

  return (
    <Screen gap={8}>
      <SearchInput value={q} onChangeText={setQ} placeholder="Distribyutor nomi" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {[null, ...(data?.districts ?? [])].map((d) => (
          <Chip key={d ?? 'all'} label={d ?? 'Barcha hududlar'} active={district === d} onPress={() => setDistrict(d)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {[null, ...(data?.categories ?? [])].map((c) => (
          <Chip key={c ?? 'all'} label={c ?? 'Barcha toifalar'} active={category === c} onPress={() => setCategory(c)} />
        ))}
      </ScrollView>
      {err && (
        <T size="small" tone="danger">
          {err}
        </T>
      )}
      {!data && !err && <Loading />}
      {data?.distributors.map((d) => (
        <PressCard key={d.id} onPress={() => router.push(d.agreement && (d.agreement.status === 'ACTIVE' || d.agreement.status === 'PROPOSED') ? `/brand/agreement/${d.agreement.id}` : `/brand/distributor/${d.id}`)}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <T bold style={{ flex: 1 }}>
              {d.name}
            </T>
            {d.agreement && <Badge label={AGREEMENT_LABEL[d.agreement.status]} tone={d.agreement.status === 'ACTIVE' ? 'ok' : d.agreement.status === 'PROPOSED' ? 'accent' : 'hint'} />}
          </View>
          <T size="small" tone="hint">
            {d.districts.join(', ')}
          </T>
          <T size="small">
            {d.categories.join(', ')} · {d.shops} ta do'kon · {d.products} ta tovar
          </T>
        </PressCard>
      ))}
      {data?.distributors.length === 0 && <Empty>Hech narsa topilmadi</Empty>}
    </Screen>
  );
}
