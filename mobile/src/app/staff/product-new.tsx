import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Field, Screen, T } from '@/components/ui';
import { useSession } from '@/context/session';

// Bitta tovar qo'shish: narx barcha narx guruhlariga yoziladi
export default function StaffProductNew() {
  const { api } = useSession();
  const [f, setF] = useState({ sku: '', name: '', brand: '', category: '', unit: 'dona', packSize: '1', minOrderPacks: '1', price: '', barcode: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const digits = (k: keyof typeof f) => (v: string) => set(k)(v.replace(/\D/g, ''));

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      await api('/api/staff/products', {
        method: 'POST',
        body: JSON.stringify({ ...f, packSize: Number(f.packSize), minOrderPacks: Number(f.minOrderPacks) || 1, price: Number(f.price), barcode: f.barcode || undefined }),
      });
      router.back();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  const filled = f.sku && f.name.length >= 2 && f.brand && f.category.length >= 2 && Number(f.packSize) > 0 && Number(f.price) > 0;

  return (
    <Screen gap={12}>
      <Field label="Artikul" value={f.sku} onChangeText={set('sku')} autoCapitalize="characters" />
      <Field label="Nomi" value={f.name} onChangeText={set('name')} placeholder="Masalan: Sharbat, olma, 1 l" />
      <Field label="Brend" value={f.brand} onChangeText={set('brand')} />
      <Field label="Toifa" value={f.category} onChangeText={set('category')} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Field label="O'lchov" value={f.unit} onChangeText={set('unit')} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Yashikda nechta" value={f.packSize} onChangeText={digits('packSize')} keyboardType="number-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Min., yashik" value={f.minOrderPacks} onChangeText={digits('minOrderPacks')} keyboardType="number-pad" />
        </View>
      </View>
      <Field label="Narx, bir dona, so'm" value={f.price} onChangeText={digits('price')} keyboardType="number-pad" />
      <Field label="Shtrix-kod (ixtiyoriy)" value={f.barcode} onChangeText={digits('barcode')} keyboardType="number-pad" />
      {err && (
        <T size="small" tone="danger">
          {err}
        </T>
      )}
      <Button title="Qo'shish" onPress={submit} loading={busy} disabled={!filled} />
    </Screen>
  );
}
