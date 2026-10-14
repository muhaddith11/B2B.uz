import { useState } from 'react';
import { View } from 'react-native';

import { openPrivacyPolicy } from '@/components/account-links';
import { Banner, Button, Card, Screen, T } from '@/components/ui';
import { useSession } from '@/context/session';
import { t } from '@/lib/i18n';

// Hozir kirgan hisobni o'chirish. Ikki bosqich: avval tushuntirish, keyin tasdiqlash.
export default function DeleteAccount() {
  const { api, signOut } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setErr(null);
    try {
      await api('/api/account/delete', { method: 'POST' });
      // Sessiya o'chgach, ilova o'zi kirish sahifasiga o'tadi
      await signOut();
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

      {!confirming ? (
        <Button title={t("Hisobimni o'chirish")} kind="danger" onPress={() => setConfirming(true)} />
      ) : (
        <View style={{ gap: 10 }}>
          <T tone="danger" bold>
            {t("Haqiqatan ham o'chirilsinmi? Buni qaytarib bo'lmaydi.")}
          </T>
          <Button title={t("Ha, butunlay o'chirish")} kind="danger" loading={busy} onPress={remove} />
          <Button title={t('Bekor qilish')} kind="secondary" disabled={busy} onPress={() => setConfirming(false)} />
        </View>
      )}

      {err && <Banner tone="danger">{err}</Banner>}
    </Screen>
  );
}
