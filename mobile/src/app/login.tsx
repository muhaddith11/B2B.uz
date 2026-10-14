import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { openPrivacyPolicy } from '@/components/account-links';
import { Banner, Button, Card, Divider, Field, ListRow, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { request } from '@/lib/api';
import type { Account } from '@/lib/types';

type Step = 'phone' | 'code' | 'pick';

// Kirish: telefon raqami -> SMS kod -> hisob tanlash (yoki yangi do'kon ochish)
export default function LoginScreen() {
  const c = usePalette();
  const { signIn, setPhoneToken } = useSession();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('+998 ');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [resendIn, setResendIn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const sendCode = () =>
    run(async () => {
      const res = await request<{ phone: string; devCode?: string }>('/api/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
      setDevCode(res.devCode ?? null);
      setCode('');
      setResendIn(60);
      setStep('code');
    });

  const verify = () =>
    run(async () => {
      const res = await request<{ accounts: Account[]; phoneToken: string }>('/api/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      });
      setPhoneToken(res.phoneToken);
      if (res.accounts.length === 0) {
        router.push('/register');
        return;
      }
      if (res.accounts.length === 1) {
        await choose(res.accounts[0]);
        return;
      }
      setAccounts(res.accounts);
      setStep('pick');
    });

  const choose = (a: Account) => signIn({ token: a.token, kind: a.kind, role: a.role });

  const KIND_ICON = { shop: 'storefront-outline', staff: 'business-outline', brand: 'ribbon-outline' } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.card }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 12, marginBottom: 12 }}>
            <Image source={require('../../assets/images/icon.png')} style={{ width: 64, height: 64, borderRadius: 16 }} accessibilityIgnoresInvertColors />
            <View style={{ gap: 4 }}>
              <T size="display">Captar</T>
              <T tone="hint">Distribyutorlardan buyurtma, to'lov va qarz daftari bitta ilovada</T>
            </View>
          </View>

          {step === 'phone' && (
            <>
              <Field
                label="Telefon raqamingiz"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                style={{ fontSize: 20, fontVariant: ['tabular-nums'] }}
              />
              <Button title="Kod olish" onPress={sendCode} loading={busy} />
            </>
          )}

          {step === 'code' && (
            <>
              <T tone="hint">
                <T bold num>
                  {phone}
                </T>{' '}
                raqamiga SMS orqali 6 xonali kod yuborildi.
              </T>
              {devCode && <Banner tone="accent">Sinov rejimi: SMS yuborilmadi, kod {devCode}</Banner>}
              <Field
                label="SMS kod"
                value={code}
                onChangeText={(s) => setCode(s.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                maxLength={6}
                autoFocus
                placeholder="••••••"
                style={{ fontSize: 26, letterSpacing: 10, textAlign: 'center', fontVariant: ['tabular-nums'] }}
              />
              <Button title="Kirish" onPress={verify} loading={busy} disabled={code.length !== 6} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Pressable onPress={() => setStep('phone')} hitSlop={8}>
                  <T size="small" tone="accent" style={{ fontWeight: '600' }}>
                    Raqamni o'zgartirish
                  </T>
                </Pressable>
                <Pressable onPress={sendCode} disabled={resendIn > 0 || busy} hitSlop={8}>
                  <T size="small" tone={resendIn > 0 ? 'hint' : 'accent'} num style={{ fontWeight: '600' }}>
                    {resendIn > 0 ? `Qayta yuborish: ${resendIn} s` : 'Kodni qayta yuborish'}
                  </T>
                </Pressable>
              </View>
            </>
          )}

          {step === 'pick' && (
            <>
              <T tone="hint">Bu raqam bir nechta hisobga bog'langan. Qaysi biri bilan kirasiz?</T>
              <Card style={{ paddingVertical: 8, gap: 8 }}>
                {accounts.map((a, i) => (
                  <View key={a.token} style={{ gap: 8 }}>
                    {i > 0 && <Divider />}
                    <ListRow icon={KIND_ICON[a.kind]} title={a.title} sub={a.subtitle} onPress={() => choose(a)} />
                  </View>
                ))}
              </Card>
              <Button title="Yangi hisob ochish" icon="add" kind="secondary" onPress={() => router.push('/register')} />
            </>
          )}

          {err && <Banner tone="danger">{err}</Banner>}

          <T size="tiny" tone="hint" style={{ textAlign: 'center', marginTop: 8 }}>
            Kirish orqali{' '}
            <T size="tiny" tone="accent" onPress={openPrivacyPolicy}>
              maxfiylik siyosatiga
            </T>{' '}
            rozilik bildirasiz
          </T>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
