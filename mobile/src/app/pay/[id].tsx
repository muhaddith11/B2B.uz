import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { Image, Platform, View } from 'react-native';

import { Banner, Button, Card, ErrorState, Field, Loading, Money, Screen, SectionTitle, T } from '@/components/ui';
import { useSession } from '@/context/session';
import { haptic } from '@/lib/haptics';
import { t } from '@/lib/i18n';
import { formatAmount, formatSom } from '@/lib/money';
import type { HomeData, PaymentOptions } from '@/lib/types';

type Picked = { uri: string; mimeType: string; name: string };

// Qarzni to'lash: Payme/Click orqali onlayn yoki karta/hisobga o'tkazib, chek rasmini yuborish
export default function PayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useSession();
  const [opts, setOpts] = useState<PaymentOptions | null>(null);
  const [debt, setDebt] = useState(0);
  const [amount, setAmount] = useState('');
  const [receipt, setReceipt] = useState<Picked | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(
    () =>
      Promise.all([api<PaymentOptions>(`/api/shop/payments?distributorId=${encodeURIComponent(id)}`), api<HomeData>('/api/shop/home')])
        .then(([o, home]) => {
          setOpts(o);
          setErr(null);
          const d = home.links.find((l) => l.distributor.id === id)?.debt ?? 0;
          setDebt(d);
          setAmount((a) => a || (d > 0 ? formatAmount(d) : ''));
        })
        .catch((e) => setErr((e as Error).message)),
    [api, id],
  );

  useEffect(() => {
    load();
  }, [load]);

  if (err && !opts) {
    return (
      <ErrorState
        message={err}
        onRetry={() => {
          setErr(null);
          load();
        }}
      />
    );
  }
  if (!opts) return <Loading rows={2} />;

  const sum = Number(amount.replace(/\D/g, '')) || 0;

  async function payOnline(provider: 'PAYME' | 'CLICK') {
    setBusy(provider);
    setErr(null);
    try {
      const res = await api<{ url: string }>('/api/shop/payments/online', { method: 'POST', body: JSON.stringify({ distributorId: id, amount: sum, provider }) });
      await WebBrowser.openBrowserAsync(res.url);
      setDone(t("To'lov tizimi tasdiqlagach, summa qarzingizdan ayiriladi. Qarzlarim sahifasida ko'rasiz."));
      await load();
    } catch (e) {
      setErr((e as Error).message);
      haptic.error();
    } finally {
      setBusy(null);
    }
  }

  async function pick(fromCamera: boolean) {
    setErr(null);
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setErr(t('Kameraga ruxsat berilmagan'));
        return;
      }
    }
    const pickOpts = { mediaTypes: ['images'] as ImagePicker.MediaType[], quality: 0.6 };
    const res = fromCamera ? await ImagePicker.launchCameraAsync(pickOpts) : await ImagePicker.launchImageLibraryAsync(pickOpts);
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    const mimeType = a.mimeType ?? 'image/jpeg';
    setReceipt({ uri: a.uri, mimeType, name: a.fileName ?? `chek.${mimeType.split('/')[1] ?? 'jpg'}` });
  }

  async function sendReceipt() {
    if (!receipt) return;
    setBusy('receipt');
    setErr(null);
    try {
      const form = new FormData();
      form.append('distributorId', id);
      form.append('amount', String(sum));
      if (Platform.OS === 'web') {
        const blob = await (await fetch(receipt.uri)).blob();
        form.append('receipt', blob, receipt.name);
      } else {
        // React Native FormData fayl uchun { uri, name, type } qabul qiladi
        form.append('receipt', { uri: receipt.uri, name: receipt.name, type: receipt.mimeType } as unknown as Blob);
      }
      await api('/api/shop/payments', { method: 'POST', body: form });
      setReceipt(null);
      setDone(t('Chek yuborildi. Distribyutor tasdiqlagach, summa qarzingizdan ayiriladi.'));
      haptic.success();
    } catch (e) {
      setErr((e as Error).message);
      haptic.error();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <Card style={{ gap: 2 }}>
        <T size="small" tone="hint">
          {opts.distributor.name}
        </T>
        <Money value={debt} size="title" />
        <T size="small" tone="hint">
          {t('joriy qarz')}
        </T>
      </Card>

      {done ? (
        <>
          <Banner tone="accent">{done}</Banner>
          <Button title={t('Qarzlarimga qaytish')} kind="secondary" onPress={() => router.back()} />
        </>
      ) : (
        <>
          <Field
            label={t("To'lov summasi, so'm")}
            value={amount}
            onChangeText={(v) => setAmount(formatAmount(Number(v.replace(/\D/g, '')) || 0).replace(/^0$/, ''))}
            keyboardType="number-pad"
          />

          {opts.online.length > 0 && (
            <>
              <SectionTitle>{t("Onlayn to'lash")}</SectionTitle>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {opts.online.map((p) => (
                  <Button key={p} title={p === 'PAYME' ? 'Payme' : 'Click'} style={{ flex: 1 }} loading={busy === p} disabled={sum <= 0 || busy !== null} onPress={() => payOnline(p)} />
                ))}
              </View>
            </>
          )}

          {opts.transfer.length > 0 && (
            <>
              <SectionTitle>{t("Karta yoki hisobga o'tkazish")}</SectionTitle>
              {opts.transfer.map((m) => (
                <Card key={m.id} style={{ gap: 2 }}>
                  <T size="small" tone="hint">
                    {m.type === 'CARD' ? t('Karta') : t('Hisob raqami')}
                  </T>
                  <T bold num selectable>
                    {m.type === 'CARD' ? m.number.replace(/(\d{4})(?=\d)/g, '$1 ') : m.number}
                  </T>
                  {m.holder && <T size="small">{m.holder}</T>}
                  {m.type === 'BANK_ACCOUNT' && (
                    <T size="small" tone="hint" num selectable>
                      {t('MFO {mfo} · STIR {inn}', { mfo: m.bankMfo ?? '—', inn: m.inn ?? '—' })}
                    </T>
                  )}
                </Card>
              ))}
              <T size="small" tone="hint">
                {t("O'tkazgandan keyin chek rasmini yuboring: distribyutor tasdiqlaydi.")}
              </T>
              {receipt ? (
                <Card style={{ gap: 8 }}>
                  <Image source={{ uri: receipt.uri }} style={{ width: '100%', height: 240, borderRadius: 12 }} resizeMode="contain" accessibilityIgnoresInvertColors />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button title={t('Boshqa rasm')} kind="secondary" compact style={{ flex: 1 }} onPress={() => setReceipt(null)} />
                    <Button title={t('Yuborish · {sum}', { sum: formatSom(sum) })} compact style={{ flex: 2 }} loading={busy === 'receipt'} disabled={sum <= 0} onPress={sendReceipt} />
                  </View>
                </Card>
              ) : (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {Platform.OS !== 'web' && <Button title={t('Rasmga olish')} icon="camera-outline" kind="secondary" style={{ flex: 1 }} onPress={() => pick(true)} />}
                  <Button title={t('Galereyadan tanlash')} icon="image-outline" kind="secondary" style={{ flex: 1 }} onPress={() => pick(false)} />
                </View>
              )}
            </>
          )}

          {opts.online.length === 0 && opts.transfer.length === 0 && (
            <Banner>{t("Distribyutor hali to'lov usullarini kiritmagan. Naqd to'lovni agent yoki yetkazuvchiga bering.")}</Banner>
          )}
        </>
      )}

      {err && <Banner tone="danger">{err}</Banner>}
    </Screen>
  );
}
