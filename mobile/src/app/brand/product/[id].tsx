import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';

import { Button, Field, Loading, Screen, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import type { BrandProductRow } from '@/lib/staff-types';

const EMPTY = { name: '', category: '', unit: 'dona', packSize: '1', price: '', retailPrice: '', barcode: '', description: '', active: true };

// Tovar egasining taklifi: yangi ("new") yoki tahrirlash
export default function BrandProductForm() {
  const c = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { api } = useSession();
  const [f, setF] = useState<typeof EMPTY | null>(isNew ? EMPTY : null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    api<{ products: BrandProductRow[] }>('/api/brand/products')
      .then((d) => {
        const p = d.products.find((x) => x.id === id);
        if (!p) return setErr('Tovar topilmadi');
        setF({
          name: p.name,
          category: p.category,
          unit: p.unit,
          packSize: String(p.packSize),
          price: String(p.price),
          retailPrice: p.retailPrice ? String(p.retailPrice) : '',
          barcode: p.barcode ?? '',
          description: p.description ?? '',
          active: p.active,
        });
      })
      .catch((e) => setErr(e.message));
  }, [api, id, isNew]);

  if (!f) return err ? <T tone="danger">{err}</T> : <Loading />;
  const set = (k: keyof typeof EMPTY) => (v: string) => setF((x) => x && { ...x, [k]: v });
  const digits = (k: keyof typeof EMPTY) => (v: string) => set(k)(v.replace(/\D/g, ''));

  async function save() {
    if (!f) return;
    setBusy(true);
    setErr(null);
    const body = {
      name: f.name,
      category: f.category,
      unit: f.unit || 'dona',
      packSize: Number(f.packSize),
      price: Number(f.price),
      retailPrice: f.retailPrice ? Number(f.retailPrice) : null,
      barcode: f.barcode || null,
      description: f.description || null,
      active: f.active,
    };
    try {
      await api(isNew ? '/api/brand/products' : `/api/brand/products/${id}`, { method: isNew ? 'POST' : 'PATCH', body: JSON.stringify(body) });
      router.back();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  const filled = f.name.length >= 2 && f.category.length >= 2 && Number(f.packSize) > 0 && Number(f.price) > 0;

  return (
    <Screen gap={12}>
      <Stack.Screen options={{ title: isNew ? 'Yangi tovar' : f.name }} />
      <Field label="Nomi" value={f.name} onChangeText={set('name')} placeholder="Masalan: Sharbat, olma, 1 l" />
      <Field label="Toifa" value={f.category} onChangeText={set('category')} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Field label="O'lchov" value={f.unit} onChangeText={set('unit')} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Yashikda nechta" value={f.packSize} onChangeText={digits('packSize')} keyboardType="number-pad" />
        </View>
      </View>
      <Field label="Distribyutorga narx, bir dona, so'm" value={f.price} onChangeText={digits('price')} keyboardType="number-pad" />
      <Field label="Tavsiya etilgan chakana narx (ixtiyoriy)" value={f.retailPrice} onChangeText={digits('retailPrice')} keyboardType="number-pad" />
      <Field label="Shtrix-kod (ixtiyoriy)" value={f.barcode} onChangeText={digits('barcode')} keyboardType="number-pad" />
      <Field label="Tavsif (ixtiyoriy)" value={f.description} onChangeText={set('description')} multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />
      {!isNew && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T>Taklif faol</T>
          <Switch value={f.active} onValueChange={(v) => setF({ ...f, active: v })} trackColor={{ true: c.ok, false: c.border }} />
        </View>
      )}
      {err && (
        <T size="small" tone="danger">
          {err}
        </T>
      )}
      <Button title="Saqlash" onPress={save} loading={busy} disabled={!filled} />
    </Screen>
  );
}
