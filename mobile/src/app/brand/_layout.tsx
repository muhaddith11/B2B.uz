import { Stack } from 'expo-router';

import { t } from '@/lib/i18n';

// Tovar egasi ekranlari
export default function BrandLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: t('Orqaga'), headerShadowVisible: false, headerTitleStyle: { fontWeight: '600' } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="product/[id]" options={{ title: t('Tovar') }} />
      <Stack.Screen name="distributor/[id]" options={{ title: t('Distribyutor') }} />
      <Stack.Screen name="agreement/[id]" options={{ title: t('Kelishuv') }} />
      <Stack.Screen name="order/[id]" options={{ title: t('Xarid buyurtmasi') }} />
    </Stack>
  );
}
