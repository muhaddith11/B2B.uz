import { useState } from 'react';
import { View } from 'react-native';

import { TagInput } from '@/components/tag-input';
import { Banner, Button, Chip, ErrorState, Field, Loading, Screen, T } from '@/components/ui';
import { useSession } from '@/context/session';
import { useStaff } from '@/context/staff';
import { haptic } from '@/lib/haptics';
import { t, tx } from '@/lib/i18n';
import type { StaffMe } from '@/lib/staff-types';

// Bazada o'zbekcha qisqartma saqlanadi, ekranda tanlangan tilda ko'rinadi
const DAYS = ['Du', 'Se', 'Chor', 'Pa', 'Ju', 'Sha', 'Ya', 'Har kuni'];

// Kompaniya sozlamalari: do'konlar distribyutor topishda shularni ko'radi
export default function StaffSettings() {
  const { me, error, reload } = useStaff();
  if (!me) return error ? <ErrorState message={error} onRetry={reload} /> : <Loading rows={2} />;
  return <SettingsForm distributor={me.distributor} />;
}

function SettingsForm({ distributor: d }: { distributor: StaffMe['distributor'] }) {
  const { api } = useSession();
  const { reload } = useStaff();
  const [f, setF] = useState({ name: d.name, inn: d.inn ?? '', minOrder: String(d.minOrder), districts: d.districts, categories: d.categories, deliveryDays: d.deliveryDays });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const approved = d.status === 'ACTIVE';

  const toggleDay = (day: string) =>
    setF((x) => ({
      ...x,
      deliveryDays: day === 'Har kuni' ? ['Har kuni'] : x.deliveryDays.includes(day) ? x.deliveryDays.filter((y) => y !== day) : [...x.deliveryDays.filter((y) => y !== 'Har kuni'), day],
    }));

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await api('/api/staff/settings', {
        method: 'PATCH',
        body: JSON.stringify({ name: f.name, inn: f.inn || null, minOrder: Number(f.minOrder) || 0, districts: f.districts, categories: f.categories, deliveryDays: f.deliveryDays }),
      });
      await reload();
      setMsg({ ok: true, text: t('Saqlandi') });
      haptic.success();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
      haptic.error();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen gap={14}>
      {/* Platforma tekshirib tasdiqlagan nom va STIR ilovadan o'zgarmaydi: do'konlar distribyutorni shu bilan taniydi */}
      <Field label={t('Kompaniya nomi')} value={f.name} onChangeText={(v) => setF({ ...f, name: v })} editable={!approved} />
      <Field label={t('STIR')} value={f.inn} onChangeText={(v) => setF({ ...f, inn: v.replace(/\D/g, '').slice(0, 9) })} keyboardType="number-pad" editable={!approved} />
      {approved && (
        <T size="small" tone="hint">
          {t("Tasdiqlangan kompaniyaning nomi va STIRini o'zgartirish uchun platforma bilan bog'laning.")}
        </T>
      )}
      <Field label={t("Minimal buyurtma, so'm")} value={f.minOrder} onChangeText={(v) => setF({ ...f, minOrder: v.replace(/\D/g, '') })} keyboardType="number-pad" />
      <TagInput label={t('Yetkazish hududlari')} value={f.districts} onChange={(v) => setF({ ...f, districts: v })} />
      <TagInput label={t('Tovar toifalari')} value={f.categories} onChange={(v) => setF({ ...f, categories: v })} />
      <View style={{ gap: 6 }}>
        <T size="small" tone="hint">
          {t('Yetkazish kunlari')}
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {DAYS.map((day) => (
            <Chip key={day} label={tx(day)} active={f.deliveryDays.includes(day)} onPress={() => toggleDay(day)} />
          ))}
        </View>
      </View>
      <Button title={t('Saqlash')} onPress={save} loading={busy} disabled={f.districts.length === 0 || f.categories.length === 0} />
      {msg && <Banner tone={msg.ok ? 'ok' : 'danger'}>{msg.text}</Banner>}
    </Screen>
  );
}
