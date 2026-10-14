import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, Switch, View } from 'react-native';

import { Banner, Button, Card, Empty, ErrorState, Field, Loading, Screen, SearchInput, StickyBar, T, Thumb } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useStaff } from '@/context/staff';
import { haptic } from '@/lib/haptics';
import { t } from '@/lib/i18n';
import { formatSom } from '@/lib/money';
import { pickProductImage } from '@/lib/product-image';
import type { StaffProduct } from '@/lib/staff-types';
import { useLoad } from '@/lib/use-load';

// Tovarlar: qoldiq (bor/tugagan), narx va rasm. Ko'p tovarni Excel orqali web panelda yuklash qulay.
export default function StaffProducts() {
  const { can } = useStaff();
  const { data, error, refreshing, reload, retry, setData } = useLoad<{ products: StaffProduct[] }>('/api/staff/products');
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.products ?? []).filter((p) => !s || `${p.name} ${p.sku} ${p.brand}`.toLowerCase().includes(s));
  }, [data, q]);

  if (error && !data) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return <Loading rows={4} />;
  const editable = can('ADMIN', 'OPERATOR');

  return (
    <Screen refreshing={refreshing} onRefresh={reload} gap={8} sticky>
      <StickyBar>
        <SearchInput value={q} onChangeText={setQ} placeholder={t('Nomi, artikul yoki brend')} />
      </StickyBar>
      {editable && <Button title={t('+ Yangi tovar')} kind="secondary" onPress={() => router.push('/staff/product-new')} />}
      {editable && <Banner tone="accent">{t('Butun prays-listni Excel orqali yangilash: web panel → Tovarlar.')}</Banner>}
      {shown.map((p) => (
        <ProductRow key={p.id} p={p} editable={editable} onChange={(np) => setData((d) => d && { products: d.products.map((x) => (x.id === np.id ? np : x)) })} />
      ))}
      {shown.length === 0 && <Empty icon="cube-outline">{t('Tovar topilmadi')}</Empty>}
    </Screen>
  );
}

function ProductRow({ p, editable, onChange }: { p: StaffProduct; editable: boolean; onChange: (p: StaffProduct) => void }) {
  const c = usePalette();
  const { api } = useSession();
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(String(p.price ?? ''));
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function patch(body: Partial<{ inStock: boolean; price: number; active: boolean }>) {
    setErr(null);
    setBusy('price');
    try {
      await api(`/api/staff/products/${p.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      onChange({ ...p, ...body, price: body.price ?? p.price });
      if (body.price !== undefined) setEditing(false);
    } catch (e) {
      setErr((e as Error).message);
      haptic.error();
    } finally {
      setBusy(null);
    }
  }

  async function setImage(fromCamera: boolean) {
    setErr(null);
    try {
      const form = await pickProductImage(fromCamera);
      if (!form) return;
      setBusy('image');
      const res = await api<{ imageUrl: string }>(`/api/staff/products/${p.id}/image`, { method: 'POST', body: form });
      onChange({ ...p, imageUrl: res.imageUrl });
      haptic.success();
    } catch (e) {
      setErr((e as Error).message);
      haptic.error();
    } finally {
      setBusy(null);
    }
  }

  async function removeImage() {
    setErr(null);
    setBusy('image');
    try {
      await api(`/api/staff/products/${p.id}/image`, { method: 'DELETE' });
      onChange({ ...p, imageUrl: null });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card style={{ gap: 8, opacity: p.active ? 1 : 0.5 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Pressable
          accessibilityRole={editable ? 'button' : undefined}
          accessibilityLabel={editable ? (p.imageUrl ? t('Rasmni almashtirish') : t("Rasm qo'shish")) : undefined}
          disabled={!editable}
          onPress={() => setEditing(!editing)}>
          <Thumb uri={p.imageUrl} name={p.name} size={56} />
        </Pressable>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <T size="small" bold style={{ flex: 1 }}>
              {p.name}
            </T>
            <T
              size="small"
              bold
              num
              accessibilityRole={editable ? 'button' : undefined}
              onPress={editable ? () => setEditing(!editing) : undefined}
              tone={editable ? 'accent' : 'text'}>
              {p.price !== null ? formatSom(p.price) : '—'}
            </T>
          </View>
          <T size="tiny" tone="hint">
            {p.sku} · {p.brand} · {t('yashikda {n}', { n: p.packSize })}
            {p.fromBrand ? ` · ${t('{name} kelishuvi', { name: p.fromBrand })}` : ''}
            {!p.active ? ` · ${t('nofaol')}` : ''}
          </T>
          {editable && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <T size="small" tone={p.inStock ? 'ok' : 'danger'}>
                {p.inStock ? t('Bor') : t('Tugagan')}
              </T>
              <Switch
                accessibilityLabel={p.name}
                value={p.inStock}
                onValueChange={(v) => {
                  haptic.tick();
                  patch({ inStock: v });
                }}
                trackColor={{ true: c.ok, false: c.border }}
              />
            </View>
          )}
        </View>
      </View>
      {editing && (
        <View style={{ gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.border }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Field label={t("Yangi narx (asosiy guruh), so'm")} value={price} onChangeText={(v) => setPrice(v.replace(/\D/g, ''))} keyboardType="number-pad" />
            </View>
            <Button title={t('Saqlash')} compact loading={busy === 'price'} onPress={() => patch({ price: Number(price) })} disabled={!Number(price)} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {Platform.OS !== 'web' && <Button title={t('Rasmga olish')} icon="camera-outline" kind="secondary" compact loading={busy === 'image'} onPress={() => setImage(true)} style={{ flex: 1 }} />}
            <Button
              title={p.imageUrl ? t('Rasmni almashtirish') : t('Galereyadan tanlash')}
              icon="image-outline"
              kind="secondary"
              compact
              disabled={busy === 'image'}
              onPress={() => setImage(false)}
              style={{ flex: 1 }}
            />
          </View>
          {p.imageUrl && <Button title={t('Rasmni olib tashlash')} kind="ghost" compact disabled={busy === 'image'} onPress={removeImage} />}
        </View>
      )}
      {err && <Banner tone="danger">{err}</Banner>}
    </Card>
  );
}
