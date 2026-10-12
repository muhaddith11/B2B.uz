import { useState } from 'react';

import { TagInput } from '@/components/tag-input';
import { Banner, Button, Field, Screen, T } from '@/components/ui';
import { NeedPhone } from '@/components/need-phone';
import { useSession } from '@/context/session';
import { request } from '@/lib/api';

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
      <Banner tone="accent">Ro'yxatdan o'tgach, platforma tekshiradi. Shu vaqtda tovarlaringizni qo'shib qo'yishingiz mumkin.</Banner>
      <Field label="Brend yoki kompaniya nomi" value={form.brandName} onChangeText={set('brandName')} />
      <Field label="STIR (ixtiyoriy)" value={form.inn} onChangeText={(v) => set('inn')(v.replace(/\D/g, '').slice(0, 9))} keyboardType="number-pad" />
      <TagInput label="Tovar toifalari" value={categories} onChange={setCategories} suggestions={['Ichimliklar', 'Sharbat', 'Sut mahsulotlari', 'Shirinliklar', 'Gigiyena']} />
      <Field label="Qisqacha (ixtiyoriy)" value={form.description} onChangeText={set('description')} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
      <Field label="Ismingiz" value={form.contactName} onChangeText={set('contactName')} autoComplete="name" />
      {err && (
        <T size="small" tone="danger">
          {err}
        </T>
      )}
      <Button title="Ro'yxatdan o'tish" onPress={submit} loading={busy} disabled={!filled} />
    </Screen>
  );
}
