import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { TagInput } from '@/components/tag-input';
import { Banner, Button, Card, ErrorState, Field, Loading, Pic, Row, Screen, SectionTitle, T } from '@/components/ui';
import { useSession } from '@/context/session';
import { haptic } from '@/lib/haptics';
import { t, tx } from '@/lib/i18n';
import type { BrandMe, DistributorForBrand } from '@/lib/staff-types';

// Distribyutor kartasi va hamkorlik taklifi
export default function BrandDistributor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useSession();
  const [d, setD] = useState<DistributorForBrand | null>(null);
  const [status, setStatus] = useState<BrandMe['brand']['status'] | null>(null);
  const [districts, setDistricts] = useState<string[]>([]);
  const [discount, setDiscount] = useState('');
  const [terms, setTerms] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  // Effektdan chaqiriladi: holat faqat javob kelgach o'zgaradi
  const load = useCallback(() => {
    Promise.all([api<{ distributors: DistributorForBrand[] }>('/api/brand/distributors'), api<BrandMe>('/api/brand/me')])
      .then(([list, me]) => {
        const found = list.distributors.find((x) => x.id === id) ?? null;
        setD(found);
        setDistricts(found?.districts ?? []);
        setStatus(me.brand.status);
        if (!found) setLoadErr(t('Distribyutor topilmadi'));
      })
      .catch((e) => setLoadErr(e.message));
  }, [api, id]);

  useEffect(() => {
    load();
  }, [load]);

  const retryLoad = () => {
    setLoadErr(null);
    load();
  };
  if (!d) return loadErr ? <ErrorState message={loadErr} onRetry={retryLoad} /> : <Loading rows={2} />;

  async function propose() {
    setBusy(true);
    setErr(null);
    try {
      const res = await api<{ id: string }>('/api/brand/agreements', {
        method: 'POST',
        body: JSON.stringify({ distributorId: id, districts, discountPercent: Number(discount) || 0, terms: terms || undefined }),
      });
      haptic.success();
      router.replace(`/brand/agreement/${res.id}`);
    } catch (e) {
      setErr((e as Error).message);
      haptic.error();
      setBusy(false);
    }
  }

  return (
    <Screen gap={12}>
      <Stack.Screen options={{ title: d.name }} />
      <Card style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <Pic uri={d.logoUrl} name={d.name} size={52} />
          <T size="h2" style={{ flex: 1 }}>
            {d.name}
          </T>
        </View>
        <Row label={t('Hududlar')} value={d.districts.join(', ')} />
        <Row label={t('Toifalar')} value={d.categories.join(', ')} />
        <Row label={t("Do'konlar")} value={t('{n} ta', { n: d.shops })} />
        <Row label={t('Tovarlar')} value={t('{n} ta', { n: d.products })} />
        <Row label={t('Yetkazish')} value={d.deliveryDays.map(tx).join(', ')} />
      </Card>

      <SectionTitle>{t('Hamkorlik taklifi')}</SectionTitle>
      {status === 'PENDING' ? (
        <Banner>{t('Hisobingiz tasdiqlangach, taklif yubora olasiz.')}</Banner>
      ) : (
        <Card style={{ gap: 10 }}>
          <TagInput label={t('Savdo hududi')} value={districts} onChange={setDistricts} suggestions={d.districts} />
          <Field label={t('Distribyutorga chegirma, %')} value={discount} onChangeText={(v) => setDiscount(v.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" />
          <Field
            label={t('Shartlar (ixtiyoriy)')}
            value={terms}
            onChangeText={setTerms}
            multiline
            placeholder={t("Masalan: oyiga kamida 50 yashik, to'lov 10 kun ichida")}
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />
          <Button title={t('Taklif yuborish')} onPress={propose} loading={busy} />
          {err && <Banner tone="danger">{err}</Banner>}
        </Card>
      )}
    </Screen>
  );
}
