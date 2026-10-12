import { useEffect, useState } from 'react';

import { TagInput } from '@/components/tag-input';
import { Banner, Button, Field, Screen, T } from '@/components/ui';
import { NeedPhone } from '@/components/need-phone';
import { useSession } from '@/context/session';
import { request } from '@/lib/api';

const CATEGORY_HINTS = ['Ichimliklar', 'Sut mahsulotlari', 'Shirinliklar', 'Bakaleya', 'Gigiyena', 'Maishiy kimyo'];

// Distribyutor o'zi ro'yxatdan o'tadi; platforma tasdiqlagach do'konlarga ko'rinadi
export default function RegisterDistributor() {
  const { phoneToken, signIn } = useSession();
  const [form, setForm] = useState({ companyName: '', inn: '', adminName: '' });
  const [districts, setDistricts] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [knownDistricts, setKnownDistricts] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    request<{ districts: string[] }>('/api/auth/register')
      .then((d) => setKnownDistricts(d.districts))
      .catch(() => {});
  }, []);

  if (!phoneToken) return <NeedPhone />;
  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const res = await request<{ token: string }>('/api/auth/register-distributor', {
        method: 'POST',
        body: JSON.stringify({ ...form, districts, categories, phoneToken }),
      });
      await signIn({ token: res.token, kind: 'staff', role: 'ADMIN' });
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  const filled = form.companyName.trim().length >= 2 && form.adminName.trim().length >= 2 && districts.length > 0 && categories.length > 0;

  return (
    <Screen gap={14}>
      <Banner tone="accent">Ro'yxatdan o'tgach, platforma ma'lumotlaringizni tekshiradi. Shu vaqtda tovarlar, xodimlar va to'lov usullarini sozlab qo'yishingiz mumkin.</Banner>
      <Field label="Kompaniya nomi" value={form.companyName} onChangeText={set('companyName')} />
      <Field label="STIR (ixtiyoriy)" value={form.inn} onChangeText={(v) => set('inn')(v.replace(/\D/g, '').slice(0, 9))} keyboardType="number-pad" />
      <TagInput label="Qaysi hududlarga yetkazasiz" value={districts} onChange={setDistricts} suggestions={knownDistricts} placeholder="Masalan: Qo'qon shahri" />
      <TagInput label="Tovar toifalari" value={categories} onChange={setCategories} suggestions={CATEGORY_HINTS} />
      <Field label="Ismingiz (admin)" value={form.adminName} onChangeText={set('adminName')} autoComplete="name" />
      {err && (
        <T size="small" tone="danger">
          {err}
        </T>
      )}
      <Button title="Ro'yxatdan o'tish" onPress={submit} loading={busy} disabled={!filled} />
    </Screen>
  );
}
