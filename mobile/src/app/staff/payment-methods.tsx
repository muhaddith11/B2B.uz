import { useState } from 'react';
import { Switch, View } from 'react-native';

import { Badge, Banner, Button, Card, Chip, ErrorText, Field, Loading, Screen, SectionTitle, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import type { PaymentMethodRow } from '@/lib/staff-types';
import { useLoad } from '@/lib/use-load';

type Kind = PaymentMethodRow['type'];
const KIND_LABEL: Record<Kind, string> = { CARD: 'Karta', BANK_ACCOUNT: 'Hisob raqam', PAYME: 'Payme', CLICK: 'Click' };

// To'lov usullari: do'konlar shu karta/hisobga o'tkazadi yoki Payme/Click orqali to'laydi
export default function StaffPaymentMethods() {
  const c = usePalette();
  const { api } = useSession();
  const { data, error, refreshing, reload } = useLoad<{ methods: PaymentMethodRow[] }>('/api/staff/payment-methods');
  const [kind, setKind] = useState<Kind>('CARD');
  const [f, setF] = useState({ number: '', holder: '', bankMfo: '', inn: '', merchantId: '', serviceId: '', secretKey: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (error && !data) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  async function add() {
    setBusy(true);
    setErr(null);
    try {
      const body =
        kind === 'CARD'
          ? { type: kind, number: f.number, holder: f.holder }
          : kind === 'BANK_ACCOUNT'
            ? { type: kind, number: f.number, holder: f.holder, bankMfo: f.bankMfo, inn: f.inn }
            : kind === 'PAYME'
              ? { type: kind, merchantId: f.merchantId, secretKey: f.secretKey }
              : { type: kind, merchantId: f.merchantId, serviceId: f.serviceId, secretKey: f.secretKey };
      await api('/api/staff/payment-methods', { method: 'POST', body: JSON.stringify(body) });
      setF({ number: '', holder: '', bankMfo: '', inn: '', merchantId: '', serviceId: '', secretKey: '' });
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function patch(m: PaymentMethodRow, body: { active?: boolean; isPrimary?: boolean }) {
    try {
      await api(`/api/staff/payment-methods/${m.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={reload} gap={8}>
      {data.methods.map((m) => (
        <Card key={m.id} style={{ gap: 4, opacity: m.active ? 1 : 0.5 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <T bold style={{ flex: 1 }}>
              {KIND_LABEL[m.type]}
            </T>
            {m.isPrimary && <Badge label="asosiy" tone="accent" />}
            <Switch value={m.active} onValueChange={(v) => patch(m, { active: v })} trackColor={{ true: c.ok, false: c.border }} />
          </View>
          {m.number && (
            <T size="small" selectable>
              {m.number}
              {m.holder ? ` · ${m.holder}` : ''}
            </T>
          )}
          {m.type === 'BANK_ACCOUNT' && (
            <T size="tiny" tone="hint">
              MFO {m.bankMfo} · STIR {m.inn}
            </T>
          )}
          {m.merchantId && (
            <T size="tiny" tone="hint">
              {m.type === 'CLICK' ? `merchant_id ${m.merchantId}, service_id ${m.serviceId}` : `Kassa ID ${m.merchantId}`} · kalit {m.hasKey ? 'kiritilgan' : "yo'q"}
            </T>
          )}
          {m.callbackUrl && (
            <T size="tiny" tone="accent" selectable>
              {m.type === 'PAYME' ? 'Payme kabinetiga kiriting: ' : 'Click kabinetiga kiriting (prepare/complete): '}
              {m.callbackUrl}
              {m.type === 'CLICK' ? 'prepare | complete' : ''}
            </T>
          )}
          {!m.isPrimary && m.active && (m.type === 'CARD' || m.type === 'BANK_ACCOUNT') && (
            <T size="tiny" tone="accent" onPress={() => patch(m, { isPrimary: true })}>
              Asosiy qilish
            </T>
          )}
        </Card>
      ))}

      <SectionTitle>Yangi to'lov usuli</SectionTitle>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
            <Chip key={k} label={KIND_LABEL[k]} active={kind === k} onPress={() => setKind(k)} />
          ))}
        </View>
        {(kind === 'CARD' || kind === 'BANK_ACCOUNT') && (
          <>
            <Field label={kind === 'CARD' ? 'Karta raqami (16 xona)' : 'Hisob raqami (20 xona)'} value={f.number} onChangeText={(v) => set('number')(v.replace(/\D/g, ''))} keyboardType="number-pad" />
            <Field label="Egasi" value={f.holder} onChangeText={set('holder')} autoCapitalize="characters" />
          </>
        )}
        {kind === 'BANK_ACCOUNT' && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field label="MFO" value={f.bankMfo} onChangeText={(v) => set('bankMfo')(v.replace(/\D/g, '').slice(0, 5))} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="STIR" value={f.inn} onChangeText={(v) => set('inn')(v.replace(/\D/g, '').slice(0, 9))} keyboardType="number-pad" />
            </View>
          </View>
        )}
        {(kind === 'PAYME' || kind === 'CLICK') && (
          <>
            <Banner tone="accent">{kind === 'PAYME' ? 'Payme Business kabinetidagi kassa ID va kalit.' : 'Click kabinetidagi merchant_id, service_id va maxfiy kalit.'} Saqlangach, chiqqan manzilni kabinetga kiriting.</Banner>
            <Field label={kind === 'PAYME' ? 'Kassa ID' : 'merchant_id'} value={f.merchantId} onChangeText={set('merchantId')} autoCapitalize="none" />
            {kind === 'CLICK' && <Field label="service_id" value={f.serviceId} onChangeText={set('serviceId')} autoCapitalize="none" />}
            <Field label="Maxfiy kalit" value={f.secretKey} onChangeText={set('secretKey')} secureTextEntry autoCapitalize="none" />
          </>
        )}
        <Button title="Qo'shish" onPress={add} loading={busy} />
        {err && (
          <T size="small" tone="danger">
            {err}
          </T>
        )}
      </Card>
    </Screen>
  );
}
