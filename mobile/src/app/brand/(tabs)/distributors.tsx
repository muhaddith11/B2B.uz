import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Badge, Chip, Empty, Loading, Pic, PressCard, Screen, SearchInput, StickyBar, T } from '@/components/ui';
import { useSession } from '@/context/session';
import { t } from '@/lib/i18n';
import { agreementLabel, type DistributorForBrand } from '@/lib/staff-types';

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
    const timer = setTimeout(() => {
      api<Data>(`/api/brand/distributors?${params}`)
        .then((d) => {
          setData(d);
          setErr(null);
        })
        .catch((e) => setErr(e.message));
    }, 250);
    return () => clearTimeout(timer);
  }, [api, q, category, district]);

  return (
    <Screen gap={8} sticky>
      <StickyBar>
        <SearchInput value={q} onChangeText={setQ} placeholder={t('Distribyutor nomi')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[null, ...(data?.districts ?? [])].map((d) => (
            <Chip key={d ?? 'all'} label={d ?? t('Barcha hududlar')} active={district === d} onPress={() => setDistrict(d)} />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[null, ...(data?.categories ?? [])].map((c) => (
            <Chip key={c ?? 'all'} label={c ?? t('Barcha toifalar')} active={category === c} onPress={() => setCategory(c)} />
          ))}
        </ScrollView>
      </StickyBar>
      {err && (
        <T size="small" tone="danger">
          {err}
        </T>
      )}
      {!data && !err && <Loading inline />}
      {data?.distributors.map((d) => (
        <PressCard
          key={d.id}
          onPress={() => router.push(d.agreement && (d.agreement.status === 'ACTIVE' || d.agreement.status === 'PROPOSED') ? `/brand/agreement/${d.agreement.id}` : `/brand/distributor/${d.id}`)}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <Pic uri={d.logoUrl} name={d.name} size={40} />
            <T bold style={{ flex: 1 }}>
              {d.name}
            </T>
            {d.agreement && <Badge label={agreementLabel(d.agreement.status)} tone={d.agreement.status === 'ACTIVE' ? 'ok' : d.agreement.status === 'PROPOSED' ? 'accent' : 'hint'} />}
          </View>
          <T size="small" tone="hint">
            {d.districts.join(', ')}
          </T>
          <T size="small">
            {d.categories.join(', ')} · {t("{n} ta do'kon", { n: d.shops })} · {t('{n} ta tovar', { n: d.products })}
          </T>
        </PressCard>
      ))}
      {data?.distributors.length === 0 && <Empty icon="business-outline">{t('Hech narsa topilmadi')}</Empty>}
    </Screen>
  );
}
