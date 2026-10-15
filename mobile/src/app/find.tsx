import { useEffect, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';

import { Button, Card, Chip, Loading, Pic, SearchInput, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { haptic } from '@/lib/haptics';
import { t, tx } from '@/lib/i18n';
import { formatSom } from '@/lib/money';
import type { DiscoverData } from '@/lib/types';

// Yangi distribyutor topish: hudud, toifa, tovar yoki brend bo'yicha
export default function FindScreen() {
  const c = usePalette();
  const { api } = useSession();
  const [data, setData] = useState<DiscoverData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (category) params.set('category', category);
    const timer = setTimeout(() => {
      api<DiscoverData>(`/api/shop/distributors?${params}`)
        .then((d) => {
          setData(d);
          setErr(null);
        })
        .catch((e) => setErr(e.message));
    }, 250);
    return () => clearTimeout(timer);
  }, [api, query, category]);

  async function request(distributorId: string) {
    setBusyId(distributorId);
    try {
      await api('/api/shop/distributors', { method: 'POST', body: JSON.stringify({ distributorId }) });
      setData((d) => d && { ...d, distributors: d.distributors.map((x) => (x.id === distributorId ? { ...x, requested: true } : x)) });
      haptic.success();
    } catch (e) {
      setErr((e as Error).message);
      haptic.error();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      data={data?.distributors ?? []}
      keyExtractor={(d) => d.id}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 8 }}
      keyboardShouldPersistTaps="handled"
      stickyHeaderIndices={[0]}
      ListHeaderComponent={
        <View style={{ gap: 8, backgroundColor: c.bg, marginHorizontal: -16, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
          <SearchInput value={query} onChangeText={setQuery} placeholder={t('Distribyutor, tovar yoki brend')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {[null, ...(data?.categories ?? [])].map((cat) => (
              <Chip key={cat ?? 'all'} label={cat ?? t('Hammasi')} active={category === cat} onPress={() => setCategory(cat)} />
            ))}
          </ScrollView>
          {err && (
            <T size="small" tone="danger">
              {err}
            </T>
          )}
        </View>
      }
      ListEmptyComponent={
        data ? (
          <T size="small" tone="hint" style={{ textAlign: 'center', padding: 16 }}>
            {query || category ? t('Hech narsa topilmadi') : t("Hozircha yangi distribyutor yo'q: barchasiga ulangansiz")}
          </T>
        ) : !err ? (
          <Loading rows={3} inline />
        ) : null
      }
      renderItem={({ item: d }) => (
        <Card style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <Pic uri={d.logoUrl} name={d.name} size={40} />
            <T bold style={{ flex: 1 }}>
              {d.name}
            </T>
            <T size="tiny" tone={d.servesYou ? 'ok' : 'hint'} bold={d.servesYou}>
              {d.servesYou ? t('Hududingizga yetkazadi') : t('Boshqa hudud')}
            </T>
          </View>
          <T size="small" tone="hint">
            {d.categories.join(', ')}
          </T>
          <T size="small" num>
            {t('{n} ta tovar', { n: d.productCount })}
            {d.brands.length > 0 ? ` · ${d.brands.join(', ')}` : ''}
          </T>
          <T size="small" tone="hint" num>
            {t('Minimal buyurtma: {sum} · yetkazish: {days}', { sum: formatSom(d.minOrder), days: d.deliveryDays.map(tx).join(', ') })}
          </T>
          <T size="small" tone="hint">
            {t('Hududlar: {list}', { list: d.districts.join(', ') })}
          </T>
          <View style={{ marginTop: 8 }}>
            {d.requested ? (
              <T size="small" tone="hint" style={{ textAlign: 'center', paddingVertical: 8 }}>
                {t("So'rov yuborilgan · javob kutilmoqda")}
              </T>
            ) : (
              <Button title={t("Ulanish so'rovini yuborish")} compact loading={busyId === d.id} onPress={() => request(d.id)} />
            )}
          </View>
        </Card>
      )}
    />
  );
}
