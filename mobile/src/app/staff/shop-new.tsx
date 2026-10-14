import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Banner, Button, Chip, Field, Screen, T } from '@/components/ui';
import { useSession } from '@/context/session';
import { useStaff } from '@/context/staff';
import { haptic } from '@/lib/haptics';
import { t } from '@/lib/i18n';

// Agent do'konga borib, uni ulaydi. Egasi shu raqam bilan ilovaga SMS orqali kiradi.
export default function StaffShopNew() {
  const { api } = useSession();
  const { me } = useStaff();
  const [form, setForm] = useState({ shopName: '', address: '', district: me?.distributor.districts[0] ?? '', ownerName: '', phone: '+998 ' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const res = await api<{ linkId: string; existingShop: boolean }>('/api/staff/shops', { method: 'POST', body: JSON.stringify(form) });
      haptic.success();
      router.replace(`/staff/shop/${res.linkId}`);
    } catch (e) {
      setErr((e as Error).message);
      haptic.error();
      setBusy(false);
    }
  }

  const filled =
    form.shopName.trim().length >= 2 && form.address.trim().length >= 5 && form.district.trim().length >= 2 && form.ownerName.trim().length >= 2 && form.phone.replace(/\D/g, '').length >= 12;

  return (
    <Screen gap={14}>
      <T size="small" tone="hint">
        {t("Egasining raqami tizimda bo'lsa, o'sha do'kon ulanadi. Nasiya shartlarini keyin admin belgilaydi.")}
      </T>
      <Field label={t("Do'kon nomi")} value={form.shopName} onChangeText={set('shopName')} />
      <Field label={t('Manzil')} value={form.address} onChangeText={set('address')} placeholder={t("Shahar, ko'cha, uy")} />
      <Field label={t('Tuman yoki shahar')} value={form.district} onChangeText={set('district')} />
      {me && me.distributor.districts.length > 1 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {me.distributor.districts.map((d) => (
            <Chip key={d} label={d} active={form.district === d} onPress={() => set('district')(d)} />
          ))}
        </View>
      )}
      <Field label={t('Egasining ismi')} value={form.ownerName} onChangeText={set('ownerName')} />
      <Field label={t('Egasining telefoni')} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
      {err && <Banner tone="danger">{err}</Banner>}
      <Button title={t("Do'konni qo'shish")} onPress={submit} loading={busy} disabled={!filled} />
    </Screen>
  );
}
