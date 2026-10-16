import { useState } from 'react';
import { View } from 'react-native';

import { CallLink } from '@/components/staff';
import { Banner, Button, Card, ErrorState, Field, Loading, Pic, Screen, SectionTitle, T } from '@/components/ui';
import { useSession } from '@/context/session';
import { confirm } from '@/lib/confirm';
import { haptic } from '@/lib/haptics';
import { t } from '@/lib/i18n';
import { useLoad } from '@/lib/use-load';

type Member = { id: string; name: string; phone: string; role: 'OWNER' | 'SELLER'; avatarUrl: string | null; me: boolean };

// Do'kon sotuvchilari (faqat egasi): sotuvchi o'z raqami bilan SMS kod orqali kiradi, buyurtma beradi va qarzni ko'radi
export default function ShopTeam() {
  const { api } = useSession();
  const { data, error, refreshing, reload, retry } = useLoad<{ team: Member[] }>('/api/shop/team');
  const [form, setForm] = useState({ name: '', phone: '+998 ' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (error && !data) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return <Loading rows={2} />;

  async function add() {
    setBusy(true);
    setErr(null);
    try {
      await api('/api/shop/team', { method: 'POST', body: JSON.stringify(form) });
      setForm({ name: '', phone: '+998 ' });
      haptic.success();
      await reload();
    } catch (e) {
      setErr((e as Error).message);
      haptic.error();
    } finally {
      setBusy(false);
    }
  }

  // Olib tashlashdan oldin so'raladi: sotuvchi darhol ilovaga kira olmay qoladi
  async function remove(m: Member) {
    const ok = await confirm({ title: t("{name} olib tashlansinmi?", { name: m.name }), message: t("Sotuvchi ilovaga kira olmaydi. Uning buyurtmalari tarixda qoladi."), action: t("Olib tashlash") });
    if (!ok) return;
    setErr(null);
    try {
      await api(`/api/shop/team/${m.id}`, { method: 'DELETE' });
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={reload} gap={8}>
      {data.team.map((m) => (
        <Card key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pic uri={m.avatarUrl} name={m.name} size={44} shape="circle" />
          <View style={{ flex: 1, gap: 2 }}>
            <T bold>
              {m.name}
              {m.me ? ` ${t('(siz)')}` : ''}
            </T>
            <T size="small" tone="hint">
              {m.role === 'OWNER' ? t("Do'kon egasi") : t('Sotuvchi')}
            </T>
            <CallLink phone={m.phone} />
          </View>
          {m.role === 'SELLER' && <Button title={t('Olib tashlash')} kind="secondary" compact onPress={() => remove(m)} />}
        </Card>
      ))}

      <SectionTitle>{t('Yangi sotuvchi')}</SectionTitle>
      <Card style={{ gap: 10 }}>
        <Field label={t('Ismi')} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
        <Field label={t('Telefoni')} value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" />
        <Button title={t("Qo'shish")} onPress={add} loading={busy} disabled={form.name.trim().length < 2 || form.phone.replace(/\D/g, '').length < 12} />
        {err && <Banner tone="danger">{err}</Banner>}
      </Card>
    </Screen>
  );
}
