import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Field, T } from '@/components/ui';
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 6, marginBottom: 8 }}>
            <T size="title">Captar</T>
            <T tone="hint">Distribyutorlardan buyurtma, to'lov va qarz daftari bitta ilovada</T>
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
              />
              <Button title="Kod olish" onPress={sendCode} loading={busy} />
            </>
          )}

          {step === 'code' && (
            <>
              <T tone="hint">{phone} raqamiga SMS orqali 6 xonali kod yuborildi.</T>
              {devCode && (
                <T size="small" tone="accent">
                  Sinov rejimi: SMS yuborilmadi, kod {devCode}
                </T>
              )}
              <Field
                label="SMS kod"
                value={code}
                onChangeText={(s) => setCode(s.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                maxLength={6}
                autoFocus
              />
              <Button title="Kirish" onPress={verify} loading={busy} disabled={code.length !== 6} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Pressable onPress={() => setStep('phone')}>
                  <T size="small" tone="accent">
                    Raqamni o'zgartirish
                  </T>
                </Pressable>
                <Pressable onPress={sendCode} disabled={resendIn > 0 || busy}>
                  <T size="small" tone={resendIn > 0 ? 'hint' : 'accent'}>
                    {resendIn > 0 ? `Qayta yuborish: ${resendIn} s` : 'Kodni qayta yuborish'}
                  </T>
                </Pressable>
              </View>
            </>
          )}

          {step === 'pick' && (
            <>
              <T tone="hint">Bu raqam bir nechta hisobga bog'langan. Qaysi biri bilan kirasiz?</T>
              {accounts.map((a) => (
                <Pressable key={a.token} onPress={() => choose(a)}>
                  <Card>
                    <T bold>{a.title}</T>
                    <T size="small" tone="hint">
                      {a.subtitle}
                    </T>
                  </Card>
                </Pressable>
              ))}
              <Button title="+ Yangi hisob ochish" kind="secondary" onPress={() => router.push('/register')} />
            </>
          )}

          {err && (
            <T size="small" tone="danger">
              {err}
            </T>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
