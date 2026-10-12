import { useState } from 'react';
import { Switch, View } from 'react-native';

import { CallLink } from '@/components/staff';
import { Button, Card, Chip, ErrorText, Field, Loading, Screen, SectionTitle, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useStaff } from '@/context/staff';
import { ROLE_LABEL, type TeamMember } from '@/lib/staff-types';
import type { StaffRole } from '@/lib/types';
import { useLoad } from '@/lib/use-load';

const ROLES: StaffRole[] = ['AGENT', 'COURIER', 'OPERATOR', 'ACCOUNTANT', 'ADMIN'];

// Xodimlar: qo'shilgan xodim o'z raqami bilan SMS kod orqali ilovaga kiradi
export default function StaffTeam() {
  const c = usePalette();
  const { api } = useSession();
  const { reload: reloadMe } = useStaff();
  const { data, error, refreshing, reload } = useLoad<{ team: TeamMember[] }>('/api/staff/team');
  const [form, setForm] = useState({ name: '', phone: '+998 ', role: 'AGENT' as StaffRole });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (error && !data) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;

  async function add() {
    setBusy(true);
    setErr(null);
    try {
      await api('/api/staff/team', { method: 'POST', body: JSON.stringify(form) });
      setForm({ name: '', phone: '+998 ', role: form.role });
      await Promise.all([reload(), reloadMe()]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(m: TeamMember) {
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
              {m.me ? ' (siz)' : ''}
            </T>
            <T size="small" tone="hint">
              {ROLE_LABEL[m.role]}
            </T>
            <CallLink phone={m.phone} />
          </View>
          {!m.me && <Switch value={m.active} onValueChange={() => toggle(m)} trackColor={{ true: c.ok, false: c.border }} />}
        </Card>
      ))}

      <SectionTitle>Yangi xodim</SectionTitle>
      <Card style={{ gap: 10 }}>
        <Field label="Ismi" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
        <Field label="Telefoni" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ROLES.map((r) => (
            <Chip key={r} label={ROLE_LABEL[r]} active={form.role === r} onPress={() => setForm((f) => ({ ...f, role: r }))} />
          ))}
        </View>
        <Button title="Qo'shish" onPress={add} loading={busy} disabled={form.name.trim().length < 2 || form.phone.replace(/\D/g, '').length < 12} />
        {err && (
          <T size="small" tone="danger">
            {err}
          </T>
        )}
      </Card>
    </Screen>
  );
}
