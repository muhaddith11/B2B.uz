import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Switch, View } from 'react-native';

import { Banner, Button, Card, ErrorState, Field, Loading, Screen, T, Thumb } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { haptic } from '@/lib/haptics';
import { t } from '@/lib/i18n';
import { pickProductImage } from '@/lib/product-image';
import type { BrandProductRow } from '@/lib/staff-types';

const EMPTY = { name: '', category: '', unit: 'dona', packSize: '1', price: '', retailPrice: '', barcode: '', description: '', active: true };

// Tovar egasining taklifi: yangi ("new") yoki tahrirlash (rasm bilan)
export default function BrandProductForm() {
  const c = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { api } = useSession();
  const [f, setF] = useState<typeof EMPTY | null>(isNew ? EMPTY : null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  // Effektdan chaqiriladi: holat faqat javob kelgach o'zgaradi
  const load = useCallback(() => {
    if (isNew) return;
    api<{ products: BrandProductRow[] }>('/api/brand/products')
      .then((d) => {
        const p = d.products.find((x) => x.id === id);
        if (!p) return setLoadErr(t('Tovar topilmadi'));
        setImageUrl(p.imageUrl);
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
      .catch((e) => setLoadErr(e.message));
  }, [api, id, isNew]);

  useEffect(() => {
    load();
  }, [load]);

  const retryLoad = () => {
    setLoadErr(null);
    load();
  };
  if (!f) return loadErr ? <ErrorState message={loadErr} onRetry={retryLoad} /> : <Loading rows={2} />;
  const set = (k: keyof typeof EMPTY) => (v: string) => setF((x) => x && { ...x, [k]: v });
  const digits = (k: keyof typeof EMPTY) => (v: string) => set(k)(v.replace(/\D/g, ''));

  async function save() {
    if (!f) return;
    setBusy('save');
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
      haptic.success();
      router.back();
    } catch (e) {
      setErr((e as Error).message);
      haptic.error();
      setBusy(null);
    }
  }

  async function setImage(fromCamera: boolean) {
    setErr(null);
    try {
      const form = await pickProductImage(fromCamera);
      if (!form) return;
      setBusy('image');
      const res = await api<{ imageUrl: string }>(`/api/brand/products/${id}/image`, { method: 'POST', body: form });
      setImageUrl(res.imageUrl);
      haptic.success();
    } catch (e) {
      setErr((e as Error).message);
      haptic.error();
    } finally {
      setBusy(null);
    }
  }

  async function removeImage() {
    setBusy('image');
    setErr(null);
    try {
      await api(`/api/brand/products/${id}/image`, { method: 'DELETE' });
      setImageUrl(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const filled = f.name.length >= 2 && f.category.length >= 2 && Number(f.packSize) > 0 && Number(f.price) > 0;

  return (
    <Screen gap={12}>
      <Stack.Screen options={{ title: isNew ? t('Yangi tovar') : f.name }} />
      {!isNew && (
        <Card style={{ gap: 10 }}>
          {imageUrl ? <Thumb uri={imageUrl} name={f.name} size="100%" /> : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {Platform.OS !== 'web' && <Button title={t('Rasmga olish')} icon="camera-outline" kind="secondary" compact loading={busy === 'image'} onPress={() => setImage(true)} style={{ flex: 1 }} />}
            <Button
              title={imageUrl ? t('Rasmni almashtirish') : t("Rasm qo'shish")}
              icon="image-outline"
              kind="secondary"
              compact
              disabled={busy === 'image'}
              onPress={() => setImage(false)}
              style={{ flex: 1 }}
            />
          </View>
          {imageUrl && <Button title={t('Rasmni olib tashlash')} kind="ghost" compact disabled={busy === 'image'} onPress={removeImage} />}
        </Card>
      )}
      <Field label={t('Nomi')} value={f.name} onChangeText={set('name')} placeholder={t('Masalan: Sharbat, olma, 1 l')} />
      <Field label={t('Toifa')} value={f.category} onChangeText={set('category')} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Field label={t("O'lchov")} value={f.unit} onChangeText={set('unit')} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label={t('Yashikda nechta')} value={f.packSize} onChangeText={digits('packSize')} keyboardType="number-pad" />
        </View>
      </View>
      <Field label={t("Distribyutorga narx, bir dona, so'm")} value={f.price} onChangeText={digits('price')} keyboardType="number-pad" />
      <Field label={t('Tavsiya etilgan chakana narx (ixtiyoriy)')} value={f.retailPrice} onChangeText={digits('retailPrice')} keyboardType="number-pad" />
      <Field label={t('Shtrix-kod (ixtiyoriy)')} value={f.barcode} onChangeText={digits('barcode')} keyboardType="number-pad" />
      <Field label={t('Tavsif (ixtiyoriy)')} value={f.description} onChangeText={set('description')} multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />
      {!isNew && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T>{t('Taklif faol')}</T>
          <Switch accessibilityLabel={t('Taklif faol')} value={f.active} onValueChange={(v) => setF({ ...f, active: v })} trackColor={{ true: c.ok, false: c.border }} />
        </View>
      )}
      {err && <Banner tone="danger">{err}</Banner>}
      <Button title={t('Saqlash')} onPress={save} loading={busy === 'save'} disabled={!filled} />
    </Screen>
  );
}
