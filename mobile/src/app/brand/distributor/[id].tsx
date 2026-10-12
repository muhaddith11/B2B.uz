import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { TagInput } from '@/components/tag-input';
import { Banner, Button, Card, Field, Loading, Row, Screen, SectionTitle, T } from '@/components/ui';
import { useSession } from '@/context/session';
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

  useEffect(() => {
    Promise.all([api<{ distributors: DistributorForBrand[] }>('/api/brand/distributors'), api<BrandMe>('/api/brand/me')])
      .then(([list, me]) => {
        const found = list.distributors.find((x) => x.id === id) ?? null;
        setD(found);
        setDistricts(found?.districts ?? []);
        setStatus(me.brand.status);
        if (!found) setErr('Distribyutor topilmadi');
      })
      .catch((e) => setErr(e.message));
  }, [api, id]);

  if (!d) return err ? <T tone="danger">{err}</T> : <Loading />;

  async function propose() {
    setBusy(true);
    setErr(null);
    try {
      const res = await api<{ id: string }>('/api/brand/agreements', {
        method: 'POST',
        body: JSON.stringify({ distributorId: id, districts, discountPercent: Number(discount) || 0, terms: terms || undefined }),
      });
      router.replace(`/brand/agreement/${res.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Screen gap={12}>
      <Stack.Screen options={{ title: d.name }} />
      <Card style={{ gap: 4 }}>
        <T size="h2">{d.name}</T>
        <Row label="Hududlar" value={d.districts.join(', ')} />
        <Row label="Toifalar" value={d.categories.join(', ')} />
        <Row label="Do'konlar" value={`${d.shops} ta`} />
        <Row label="Tovarlar" value={`${d.products} ta`} />
        <Row label="Yetkazish" value={d.deliveryDays.join(', ')} />
      </Card>

      <SectionTitle>Hamkorlik taklifi</SectionTitle>
      {status === 'PENDING' ? (
        <Banner>Hisobingiz tasdiqlangach, taklif yubora olasiz.</Banner>
      ) : (
        <Card style={{ gap: 10 }}>
          <TagInput label="Savdo hududi" value={districts} onChange={setDistricts} suggestions={d.districts} />
          <Field label="Distribyutorga chegirma, %" value={discount} onChangeText={(v) => setDiscount(v.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" />
          <Field label="Shartlar (ixtiyoriy)" value={terms} onChangeText={setTerms} multiline placeholder="Masalan: oyiga kamida 50 yashik, to'lov 10 kun ichida" style={{ minHeight: 80, textAlignVertical: 'top' }} />
          <Button title="Taklif yuborish" onPress={propose} loading={busy} />
          {err && (
            <T size="small" tone="danger">
              {err}
            </T>
          )}
        </Card>
      )}
    </Screen>
  );
}
