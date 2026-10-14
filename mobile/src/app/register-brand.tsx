import { useState } from 'react';

import { TagInput } from '@/components/tag-input';
import { Banner, Button, Field, Screen } from '@/components/ui';
import { NeedPhone } from '@/components/need-phone';
import { useSession } from '@/context/session';
import { request } from '@/lib/api';
import { t } from '@/lib/i18n';

// Toifa nomlari ma'lumot sifatida saqlanadi (distribyutorlar shu nom bilan qidiradi), shuning uchun tarjima qilinmaydi
const CATEGORY_HINTS = ['Ichimliklar', 'Sharbat', 'Sut mahsulotlari', 'Shirinliklar', 'Gigiyena'];

// Tovar egasi (ishlab chiqaruvchi) o'zi ro'yxatdan o'tadi; platforma tasdiqlagach distribyutorlarga ko'rinadi
export default function RegisterBrand() {
  const { phoneToken, signIn } = useSession();
  const [form, setForm] = useState({ brandName: '', inn: '', description: '', contactName: '' });
  const [categories, setCategories] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!phoneToken) return <NeedPhone />;
  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const res = await request<{ token: string }>('/api/auth/register-brand', { method: 'POST', body: JSON.stringify({ ...form, categories, phoneToken }) });
      await signIn({ token: res.token, kind: 'brand' });
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  const filled = form.brandName.trim().length >= 2 && form.contactName.trim().length >= 2 && categories.length > 0;

  return (
    <Screen gap={14}>
      <Banner tone="accent">{t("Ro'yxatdan o'tgach, platforma tekshiradi. Shu vaqtda tovarlaringizni qo'shib qo'yishingiz mumkin.")}</Banner>
      <Field label={t('Brend yoki kompaniya nomi')} value={form.brandName} onChangeText={set('brandName')} />
      <Field label={t('STIR (ixtiyoriy)')} value={form.inn} onChangeText={(v) => set('inn')(v.replace(/\D/g, '').slice(0, 9))} keyboardType="number-pad" />
      <TagInput label={t('Tovar toifalari')} value={categories} onChange={setCategories} suggestions={CATEGORY_HINTS} />
      <Field label={t('Qisqacha (ixtiyoriy)')} value={form.description} onChangeText={set('description')} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
      <Field label={t('Ismingiz')} value={form.contactName} onChangeText={set('contactName')} autoComplete="name" />
      {err && <Banner tone="danger">{err}</Banner>}
      <Button title={t("Ro'yxatdan o'tish")} onPress={submit} loading={busy} disabled={!filled} />
    </Screen>
  );
}
