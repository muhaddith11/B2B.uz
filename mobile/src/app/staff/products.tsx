import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Switch, View } from 'react-native';

import { Banner, Button, Card, Empty, ErrorText, Field, Loading, Screen, SearchInput, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useStaff } from '@/context/staff';
import { formatSom } from '@/lib/money';
import type { StaffProduct } from '@/lib/staff-types';
import { useLoad } from '@/lib/use-load';

// Tovarlar: qoldiq (bor/tugagan) va narx. Ko'p tovarni Excel orqali web panelda yuklash qulay.
export default function StaffProducts() {
  const { can } = useStaff();
  const { data, error, refreshing, reload, setData } = useLoad<{ products: StaffProduct[] }>('/api/staff/products');
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.products ?? []).filter((p) => !s || `${p.name} ${p.sku} ${p.brand}`.toLowerCase().includes(s));
  }, [data, q]);

  if (error && !data) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;
  const editable = can('ADMIN', 'OPERATOR');

  return (
    <Screen refreshing={refreshing} onRefresh={reload} gap={8}>
      {editable && <Button title="+ Yangi tovar" kind="secondary" onPress={() => router.push('/staff/product-new')} />}
      {editable && <Banner tone="accent">Butun prays-listni Excel orqali yangilash: web panel → Tovarlar.</Banner>}
      <SearchInput value={q} onChangeText={setQ} placeholder="Nomi, artikul yoki brend" />
      {shown.map((p) => (
        <ProductRow key={p.id} p={p} editable={editable} onChange={(np) => setData((d) => d && { products: d.products.map((x) => (x.id === np.id ? np : x)) })} />
      ))}
      {shown.length === 0 && <Empty>Tovar topilmadi</Empty>}
    </Screen>
  );
}

function ProductRow({ p, editable, onChange }: { p: StaffProduct; editable: boolean; onChange: (p: StaffProduct) => void }) {
  const c = usePalette();
  const { api } = useSession();
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(String(p.price ?? ''));
  const [err, setErr] = useState<string | null>(null);

  async function patch(body: Partial<{ inStock: boolean; price: number; active: boolean }>) {
    setErr(null);
    try {
      await api(`/api/staff/products/${p.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      onChange({ ...p, ...body, price: body.price ?? p.price });
      setEditing(false);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <Card style={{ gap: 4, opacity: p.active ? 1 : 0.5 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <T size="small" bold style={{ flex: 1 }}>
          {p.name}
        </T>
        <T size="small" bold onPress={editable ? () => setEditing(!editing) : undefined} tone={editable ? 'accent' : 'text'}>
          {p.price !== null ? formatSom(p.price) : '—'}
        </T>
      </View>
      <T size="tiny" tone="hint">
        {p.sku} · {p.brand} · yashikda {p.packSize}
        {p.fromBrand ? ` · ${p.fromBrand} kelishuvi` : ''}
        {!p.active ? ' · nofaol' : ''}
      </T>
      {editable && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T size="small" tone={p.inStock ? 'ok' : 'danger'}>
            {p.inStock ? 'Bor' : 'Tugagan'}
          </T>
          <Switch value={p.inStock} onValueChange={(v) => patch({ inStock: v })} trackColor={{ true: c.ok, false: c.border }} />
        </View>
      )}
      {editing && (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Field label="Yangi narx (asosiy guruh), so'm" value={price} onChangeText={(v) => setPrice(v.replace(/\D/g, ''))} keyboardType="number-pad" />
          </View>
          <Button title="Saqlash" compact onPress={() => patch({ price: Number(price) })} disabled={!Number(price)} />
        </View>
      )}
      {err && (
        <T size="small" tone="danger">
          {err}
        </T>
      )}
    </Card>
  );
}
