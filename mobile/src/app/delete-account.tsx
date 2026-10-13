import { useState } from 'react';
import { View } from 'react-native';

import { openPrivacyPolicy } from '@/components/account-links';
import { Button, Card, Screen, T } from '@/components/ui';
import { useSession } from '@/context/session';

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
      setErr(e instanceof Error ? e.message : 'Xato');
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Card style={{ gap: 8 }}>
        <T bold>O'chiriladi</T>
        <T size="small">Ismingiz, telefon raqamingiz va bildirishnomalar. Bu hisob bilan boshqa kira olmaysiz.</T>
        <T bold style={{ marginTop: 4 }}>
          Saqlanadi
        </T>
        <T size="small">
          Buyurtma, qarz va to'lov yozuvlari distribyutorning buxgalteriya hisobi uchun qoladi, lekin endi sizning ismingiz va raqamingiz bilan bog'lanmaydi.
        </T>
        <T size="small" tone="accent" onPress={openPrivacyPolicy}>
          Maxfiylik siyosati ›
        </T>
      </Card>

      {!confirming ? (
        <Button title="Hisobimni o'chirish" kind="danger" onPress={() => setConfirming(true)} />
      ) : (
        <View style={{ gap: 10 }}>
          <T tone="danger" bold>
            Haqiqatan ham o'chirilsinmi? Buni qaytarib bo'lmaydi.
          </T>
          <Button title="Ha, butunlay o'chirish" kind="danger" loading={busy} onPress={remove} />
          <Button title="Bekor qilish" kind="secondary" disabled={busy} onPress={() => setConfirming(false)} />
        </View>
      )}

      {err && (
        <T size="small" tone="danger">
          {err}
        </T>
      )}
    </Screen>
  );
}
