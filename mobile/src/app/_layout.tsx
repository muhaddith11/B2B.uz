import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { usePalette } from '@/constants/theme';
import { LanguageKeyed, LanguageProvider, useLanguage } from '@/context/language';
import { SessionProvider, useSession } from '@/context/session';
import { t } from '@/lib/i18n';
import { onNotificationTap, registerForPush } from '@/lib/push';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const c = usePalette();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  // Sarlavha, tab bar va fon ranglari Captar palitrasidan
  const theme = { ...base, colors: { ...base.colors, primary: c.accent, background: c.bg, card: c.card, text: c.text, border: c.border, notification: c.danger } };
  return (
    <ThemeProvider value={theme}>
      <LanguageProvider>
        <SessionProvider>
          <LanguageKeyed>
            <RootStack />
          </LanguageKeyed>
        </SessionProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

// Har bir hisob turi o'z ekranlarini ko'radi: do'kon, distribyutor xodimi, tovar egasi. Kirmagan: kirish va ro'yxatdan o'tish.
function RootStack() {
  const { ready, session, api } = useSession();
  const { lang } = useLanguage();
  const token = session?.token;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Til almashsa ham qayta yuboriladi: bildirishnomalar yangi tilda keladi
  useEffect(() => {
    if (token) registerForPush((pushToken) => api('/api/push/register', { method: 'POST', body: JSON.stringify({ token: pushToken, lang }) }));
  }, [token, api, lang]);

  useEffect(() => onNotificationTap((url) => router.push(url as Href)), []);

  // Sessiya xotiradan o'qilguncha navigator chizilmaydi (splash ko'rinib turadi): aks holda himoyalangan
  // sahifaga to'g'ridan-to'g'ri havola (masalan, bildirishnomadan) kirish sahifasiga, keyin bosh sahifaga burilib ketadi
  if (!ready) return null;
  const kind = session?.kind;

  return (
    <Stack screenOptions={{ headerBackTitle: t('Orqaga'), headerShadowVisible: false, headerTitleStyle: { fontWeight: '600' } }}>
      <Stack.Protected guard={kind === 'shop'}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="distributor/[id]" options={{ title: t('Katalog') }} />
        <Stack.Screen name="find" options={{ title: t('Yangi distribyutor topish') }} />
        <Stack.Screen name="pay/[id]" options={{ title: t("Qarzni to'lash") }} />
      </Stack.Protected>
      <Stack.Protected guard={kind === 'staff'}>
        <Stack.Screen name="staff" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={kind === 'brand'}>
        <Stack.Screen name="brand" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="delete-account" options={{ title: t("Hisobni o'chirish") }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ title: t("Ro'yxatdan o'tish") }} />
        <Stack.Screen name="register-shop" options={{ title: t("Do'konni ro'yxatdan o'tkazish") }} />
        <Stack.Screen name="register-distributor" options={{ title: t('Distribyutor sifatida') }} />
        <Stack.Screen name="register-brand" options={{ title: t('Tovar egasi sifatida') }} />
      </Stack.Protected>
    </Stack>
  );
}
