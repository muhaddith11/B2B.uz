import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { SessionProvider, useSession } from '@/context/session';
import { onNotificationTap, registerForPush } from '@/lib/push';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SessionProvider>
        <RootStack />
      </SessionProvider>
    </ThemeProvider>
  );
}

// Har bir hisob turi o'z ekranlarini ko'radi: do'kon, distribyutor xodimi, tovar egasi. Kirmagan: kirish va ro'yxatdan o'tish.
function RootStack() {
  const { ready, session, api } = useSession();
  const token = session?.token;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    if (token) registerForPush((t) => api('/api/push/register', { method: 'POST', body: JSON.stringify({ token: t }) }));
  }, [token, api]);

  useEffect(() => onNotificationTap((url) => router.push(url as Href)), []);

  // Sessiya xotiradan o'qilguncha navigator chizilmaydi (splash ko'rinib turadi): aks holda himoyalangan
  // sahifaga to'g'ridan-to'g'ri havola (masalan, bildirishnomadan) kirish sahifasiga, keyin bosh sahifaga burilib ketadi
  if (!ready) return null;
  const kind = session?.kind;

  return (
    <Stack screenOptions={{ headerBackTitle: 'Orqaga' }}>
      <Stack.Protected guard={kind === 'shop'}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="distributor/[id]" options={{ title: 'Katalog' }} />
        <Stack.Screen name="find" options={{ title: 'Yangi distribyutor topish' }} />
        <Stack.Screen name="pay/[id]" options={{ title: "Qarzni to'lash" }} />
      </Stack.Protected>
      <Stack.Protected guard={kind === 'staff'}>
        <Stack.Screen name="staff" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={kind === 'brand'}>
        <Stack.Screen name="brand" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="delete-account" options={{ title: "Hisobni o'chirish" }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ title: "Ro'yxatdan o'tish" }} />
        <Stack.Screen name="register-shop" options={{ title: "Do'konni ro'yxatdan o'tkazish" }} />
        <Stack.Screen name="register-distributor" options={{ title: 'Distribyutor sifatida' }} />
        <Stack.Screen name="register-brand" options={{ title: 'Tovar egasi sifatida' }} />
      </Stack.Protected>
    </Stack>
  );
}
