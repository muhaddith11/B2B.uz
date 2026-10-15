import { GolosText_400Regular } from '@expo-google-fonts/golos-text/400Regular';
import { GolosText_500Medium } from '@expo-google-fonts/golos-text/500Medium';
import { GolosText_600SemiBold } from '@expo-google-fonts/golos-text/600SemiBold';
import { GolosText_700Bold } from '@expo-google-fonts/golos-text/700Bold';
import { Unbounded_500Medium } from '@expo-google-fonts/unbounded/500Medium';
import { Unbounded_600SemiBold } from '@expo-google-fonts/unbounded/600SemiBold';
import { Unbounded_700Bold } from '@expo-google-fonts/unbounded/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { useStackOptions } from '@/components/nav';
import { FONT, usePalette } from '@/constants/theme';
import { LanguageKeyed, LanguageProvider, useLanguage } from '@/context/language';
import { SessionProvider, useSession } from '@/context/session';
import { t } from '@/lib/i18n';
import { onNotificationTap, registerForPush } from '@/lib/push';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const c = usePalette();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  // Sarlavha, tab bar va fon ranglari Captar palitrasidan; navigatsiya matni Golos Text
  const font = (fontFamily: string) => ({ fontFamily, fontWeight: 'normal' as const });
  const theme = {
    ...base,
    colors: { ...base.colors, primary: c.accent, background: c.bg, card: c.card, text: c.text, border: c.border, notification: c.danger },
    fonts: { regular: font(FONT.text), medium: font(FONT.textMedium), bold: font(FONT.textSemi), heavy: font(FONT.textBold) },
  };
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
  const options = useStackOptions();
  const token = session?.token;
  // Shriftlar ilova ichida (internet kerak emas); yuklanmasa ham ilova tizim shrifti bilan ochiladi
  const [fontsLoaded, fontError] = useFonts({
    Unbounded_500Medium,
    Unbounded_600SemiBold,
    Unbounded_700Bold,
    GolosText_400Regular,
    GolosText_500Medium,
    GolosText_600SemiBold,
    GolosText_700Bold,
  });
  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready && fontsReady) SplashScreen.hideAsync();
  }, [ready, fontsReady]);

  // Til almashsa ham qayta yuboriladi: bildirishnomalar yangi tilda keladi
  useEffect(() => {
    if (token) registerForPush((pushToken) => api('/api/push/register', { method: 'POST', body: JSON.stringify({ token: pushToken, lang }) }));
  }, [token, api, lang]);

  useEffect(() => onNotificationTap((url) => router.push(url as Href)), []);

  // Sessiya xotiradan o'qilguncha navigator chizilmaydi (splash ko'rinib turadi): aks holda himoyalangan
  // sahifaga to'g'ridan-to'g'ri havola (masalan, bildirishnomadan) kirish sahifasiga, keyin bosh sahifaga burilib ketadi
  if (!ready || !fontsReady) return null;
  const kind = session?.kind;

  return (
    <Stack screenOptions={options}>
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
