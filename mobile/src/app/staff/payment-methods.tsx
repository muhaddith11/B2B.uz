import { useState } from 'react';
import { Switch, View } from 'react-native';

import { Badge, Banner, Button, Card, Chip, ErrorState, Field, Loading, Screen, SectionTitle, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { haptic } from '@/lib/haptics';
import { t } from '@/lib/i18n';
import type { PaymentMethodRow } from '@/lib/staff-types';
import { useLoad } from '@/lib/use-load';

type Kind = PaymentMethodRow['type'];
const KINDS: Kind[] = ['CARD', 'BANK_ACCOUNT', 'PAYME', 'CLICK'];
const kindLabel = (k: Kind) => (k === 'CARD' ? t('Karta') : k === 'BANK_ACCOUNT' ? t('Hisob raqam') : k === 'PAYME' ? 'Payme' : 'Click');

// To'lov usullari: do'konlar shu karta/hisobga o'tkazadi yoki Payme/Click orqali to'laydi
export default function StaffPaymentMethods() {
  const c = usePalette();
  const { api } = useSession();
  const { data, error, refreshing, reload, retry } = useLoad<{ methods: PaymentMethodRow[] }>('/api/staff/payment-methods');
  const [kind, setKind] = useState<Kind>('CARD');
  const [f, setF] = useState({ number: '', holder: '', bankMfo: '', inn: '', merchantId: '', serviceId: '', secretKey: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (error && !data) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return <Loading rows={2} />;
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
      haptic.success();
      await reload();
    } catch (e) {
      setErr((e as Error).message);
      haptic.error();
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
              {kindLabel(m.type)}
            </T>
            {m.isPrimary && <Badge label={t('asosiy')} tone="accent" />}
            <Switch accessibilityLabel={kindLabel(m.type)} value={m.active} onValueChange={(v) => patch(m, { active: v })} trackColor={{ true: c.ok, false: c.border }} />
          </View>
          {m.number && (
            <T size="small" num selectable>
              {m.number}
              {m.holder ? ` · ${m.holder}` : ''}
            </T>
          )}
          {m.type === 'BANK_ACCOUNT' && (
            <T size="tiny" tone="hint" num>
              {t('MFO {mfo} · STIR {inn}', { mfo: m.bankMfo ?? '—', inn: m.inn ?? '—' })}
            </T>
          )}
          {m.merchantId && (
            <T size="tiny" tone="hint">
              {m.type === 'CLICK' ? `merchant_id ${m.merchantId}, service_id ${m.serviceId}` : t('Kassa ID {id}', { id: m.merchantId })} ·{' '}
              {m.hasKey ? t('kalit kiritilgan') : t("kalit yo'q")}
            </T>
          )}
          {m.callbackUrl && (
            <T size="tiny" tone="accent" selectable>
              {m.type === 'PAYME' ? t('Payme kabinetiga kiriting: ') : t('Click kabinetiga kiriting (prepare/complete): ')}
              {m.callbackUrl}
              {m.type === 'CLICK' ? 'prepare | complete' : ''}
            </T>
          )}
          {!m.isPrimary && m.active && (m.type === 'CARD' || m.type === 'BANK_ACCOUNT') && (
            <T size="tiny" tone="accent" accessibilityRole="button" onPress={() => patch(m, { isPrimary: true })}>
              {t('Asosiy qilish')}
            </T>
          )}
        </Card>
      ))}

      <SectionTitle>{t("Yangi to'lov usuli")}</SectionTitle>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {KINDS.map((k) => (
            <Chip key={k} label={kindLabel(k)} active={kind === k} onPress={() => setKind(k)} />
          ))}
        </View>
        {(kind === 'CARD' || kind === 'BANK_ACCOUNT') && (
          <>
            <Field
              label={kind === 'CARD' ? t('Karta raqami (16 xona)') : t('Hisob raqami (20 xona)')}
              value={f.number}
              onChangeText={(v) => set('number')(v.replace(/\D/g, ''))}
              keyboardType="number-pad"
            />
            <Field label={t('Egasi')} value={f.holder} onChangeText={set('holder')} autoCapitalize="characters" />
          </>
        )}
        {kind === 'BANK_ACCOUNT' && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field label={t('MFO')} value={f.bankMfo} onChangeText={(v) => set('bankMfo')(v.replace(/\D/g, '').slice(0, 5))} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('STIR')} value={f.inn} onChangeText={(v) => set('inn')(v.replace(/\D/g, '').slice(0, 9))} keyboardType="number-pad" />
            </View>
          </View>
        )}
        {(kind === 'PAYME' || kind === 'CLICK') && (
          <>
            <Banner tone="accent">
              {kind === 'PAYME' ? t('Payme Business kabinetidagi kassa ID va kalit.') : t('Click kabinetidagi merchant_id, service_id va maxfiy kalit.')}{' '}
              {t('Saqlangach, chiqqan manzilni kabinetga kiriting.')}
            </Banner>
            <Field label={kind === 'PAYME' ? t('Kassa ID') : 'merchant_id'} value={f.merchantId} onChangeText={set('merchantId')} autoCapitalize="none" />
            {kind === 'CLICK' && <Field label="service_id" value={f.serviceId} onChangeText={set('serviceId')} autoCapitalize="none" />}
            <Field label={t('Maxfiy kalit')} value={f.secretKey} onChangeText={set('secretKey')} secureTextEntry autoCapitalize="none" />
          </>
        )}
        <Button title={t("Qo'shish")} onPress={add} loading={busy} />
        {err && <Banner tone="danger">{err}</Banner>}
      </Card>
    </Screen>
  );
}
