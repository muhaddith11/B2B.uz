import { useState } from 'react';
import { Switch, View } from 'react-native';

import { CallLink } from '@/components/staff';
import { Banner, Button, Card, Chip, ErrorState, Field, Loading, Screen, SectionTitle, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useStaff } from '@/context/staff';
import { confirm } from '@/lib/confirm';
import { haptic } from '@/lib/haptics';
import { t } from '@/lib/i18n';
import { roleLabel, type TeamMember } from '@/lib/staff-types';
import type { StaffRole } from '@/lib/types';
import { useLoad } from '@/lib/use-load';

const ROLES: StaffRole[] = ['AGENT', 'COURIER', 'OPERATOR', 'ACCOUNTANT', 'ADMIN'];

// Xodimlar: qo'shilgan xodim o'z raqami bilan SMS kod orqali ilovaga kiradi
export default function StaffTeam() {
  const c = usePalette();
  const { api } = useSession();
  const { reload: reloadMe } = useStaff();
  const { data, error, refreshing, reload, retry } = useLoad<{ team: TeamMember[] }>('/api/staff/team');
  const [form, setForm] = useState({ name: '', phone: '+998 ', role: 'AGENT' as StaffRole });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (error && !data) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return <Loading rows={3} />;

  async function add() {
    setBusy(true);
    setErr(null);
    try {
      await api('/api/staff/team', { method: 'POST', body: JSON.stringify(form) });
      setForm({ name: '', phone: '+998 ', role: form.role });
      haptic.success();
      await Promise.all([reload(), reloadMe()]);
    } catch (e) {
      setErr((e as Error).message);
      haptic.error();
    } finally {
      setBusy(false);
    }
  }

  // O'chirishdan oldin so'raladi: xodim darhol ilovaga kira olmay qoladi. Qayta yoqish so'ralmaydi
  async function toggle(m: TeamMember) {
    if (m.active) {
      const ok = await confirm({ title: t("{name} o'chirilsinmi?", { name: m.name }), message: t('Xodim ilovaga kira olmaydi. Keyin qayta yoqish mumkin.'), action: t("O'chirish") });
      if (!ok) return;
    }
    try {
      await api(`/api/staff/team/${m.id}`, { method: 'PATCH', body: JSON.stringify({ active: !m.active }) });
      await Promise.all([reload(), reloadMe()]);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={reload} gap={8}>
      {data.team.map((m) => (
        <Card key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: m.active ? 1 : 0.5 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T bold>
              {m.name}
              {m.me ? ` ${t('(siz)')}` : ''}
            </T>
            <T size="small" tone="hint">
              {roleLabel(m.role)}
            </T>
            <CallLink phone={m.phone} />
          </View>
          {!m.me && <Switch accessibilityLabel={m.name} value={m.active} onValueChange={() => toggle(m)} trackColor={{ true: c.ok, false: c.border }} />}
        </Card>
      ))}

      <SectionTitle>{t('Yangi xodim')}</SectionTitle>
      <Card style={{ gap: 10 }}>
        <Field label={t('Ismi')} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
        <Field label={t('Telefoni')} value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ROLES.map((r) => (
            <Chip key={r} label={roleLabel(r)} active={form.role === r} onPress={() => setForm((f) => ({ ...f, role: r }))} />
          ))}
        </View>
        <Button title={t("Qo'shish")} onPress={add} loading={busy} disabled={form.name.trim().length < 2 || form.phone.replace(/\D/g, '').length < 12} />
        {err && <Banner tone="danger">{err}</Banner>}
      </Card>
    </Screen>
  );
}
