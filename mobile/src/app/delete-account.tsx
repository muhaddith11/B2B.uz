import { useState } from 'react';
import { View } from 'react-native';

import { openPrivacyPolicy } from '@/components/account-links';
import { Banner, Button, Card, Field, Screen, T } from '@/components/ui';
import { useSession } from '@/context/session';
import { t } from '@/lib/i18n';

// Hozir kirgan hisobni o'chirish. Uch bosqich: tushuntirish, hisob raqamiga SMS kod, kod bilan tasdiqlash.
// Qaytarib bo'lmaydigan amal: qo'lga tushgan telefon yoki ochiq qolgan sessiya bilan hisobni o'chirib bo'lmasin
export default function DeleteAccount() {
  const { api, signOut } = useSession();
  const [sent, setSent] = useState<{ phone: string; devCode?: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function requestCode() {
    setBusy(true);
    setErr(null);
    try {
      setSent(await api<{ phone: string; devCode?: string }>('/api/account/delete/code', { method: 'POST' }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('Xato'));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setErr(null);
    try {
      await api('/api/account/delete', { method: 'POST', body: JSON.stringify({ code }) });
      // Hisob serverda o'chdi (push tokenlari ham): telefondan tozalanadi, ilova o'zi kirish sahifasiga o'tadi
      await signOut({ localOnly: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('Xato'));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Card style={{ gap: 8 }}>
        <T bold>{t("O'chiriladi")}</T>
        <T size="small">{t('Ismingiz, telefon raqamingiz va bildirishnomalar. Bu hisob bilan boshqa kira olmaysiz.')}</T>
        <T bold style={{ marginTop: 4 }}>
          {t('Saqlanadi')}
        </T>
        <T size="small">
          {t("Buyurtma, qarz va to'lov yozuvlari distribyutorning buxgalteriya hisobi uchun qoladi, lekin endi sizning ismingiz va raqamingiz bilan bog'lanmaydi.")}
        </T>
        <T size="small" tone="accent" onPress={openPrivacyPolicy} accessibilityRole="link">
          {t('Maxfiylik siyosati ›')}
        </T>
      </Card>

      {!sent ? (
        <Button title={t("Hisobimni o'chirish")} kind="danger" loading={busy} onPress={requestCode} />
      ) : (
        <View style={{ gap: 10 }}>
          <T tone="danger" bold>
            {t("Haqiqatan ham o'chirilsinmi? Buni qaytarib bo'lmaydi.")}
          </T>
          <T size="small" tone="hint">
            {t('Tasdiqlash kodi {phone} raqamiga SMS bilan yuborildi.', { phone: sent.phone })}
          </T>
          {sent.devCode && <Banner tone="accent">{t('Sinov rejimi: SMS yuborilmadi, kod {code}', { code: sent.devCode })}</Banner>}
          <Field label={t('SMS kod')} value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" textContentType="oneTimeCode" />
          <Button title={t("Ha, butunlay o'chirish")} kind="danger" loading={busy} disabled={code.length !== 6} onPress={remove} />
          <Button
            title={t('Bekor qilish')}
            kind="secondary"
            disabled={busy}
            onPress={() => {
              setSent(null);
              setCode('');
            }}
          />
        </View>
      )}

      {err && <Banner tone="danger">{err}</Banner>}
    </Screen>
  );
}
