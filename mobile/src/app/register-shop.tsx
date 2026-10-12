import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { NeedPhone } from '@/components/need-phone';
import { Button, Chip, Field, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { request } from '@/lib/api';

// Yangi do'kon agentsiz ro'yxatdan o'tadi; raqam SMS kod bilan tasdiqlangan (phoneToken)
export default function RegisterShopScreen() {
  const c = usePalette();
  const { phoneToken, signIn } = useSession();
  const [form, setForm] = useState({ shopName: '', address: '', district: '', ownerName: '' });
  const [districts, setDistricts] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    request<{ districts: string[] }>('/api/auth/register')
      .then((d) => setDistricts(d.districts))
      .catch(() => {});
  }, []);

  if (!phoneToken) return <NeedPhone />;

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const res = await request<{ token: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify({ ...form, phoneToken }) });
      await signIn({ token: res.token, kind: 'shop' });
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  const filled = form.shopName.trim().length >= 2 && form.address.trim().length >= 5 && form.district.trim().length >= 2 && form.ownerName.trim().length >= 2;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
        <T tone="hint">So'ng hududingizdagi distribyutorlarni topib, ulanish so'rovini yuborasiz.</T>
        <Field label="Do'kon nomi" value={form.shopName} onChangeText={set('shopName')} placeholder="Masalan: Barakat market" />
        <Field label="Manzil" value={form.address} onChangeText={set('address')} placeholder="Shahar, ko'cha, uy" />
        <Field label="Tuman yoki shahar" value={form.district} onChangeText={set('district')} />
        {districts.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {districts.map((d) => (
              <Chip key={d} label={d} active={form.district === d} onPress={() => set('district')(d)} />
            ))}
          </View>
        )}
        <Field label="Ismingiz" value={form.ownerName} onChangeText={set('ownerName')} autoComplete="name" />
        {err && (
          <T size="small" tone="danger">
            {err}
          </T>
        )}
        <Button title="Ro'yxatdan o'tish" onPress={submit} loading={busy} disabled={!filled} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
