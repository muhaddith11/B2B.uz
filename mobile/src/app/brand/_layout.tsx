import { Stack } from 'expo-router';

// Tovar egasi ekranlari
export default function BrandLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Orqaga', headerShadowVisible: false, headerTitleStyle: { fontWeight: '600' } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="product/[id]" options={{ title: 'Tovar' }} />
      <Stack.Screen name="distributor/[id]" options={{ title: 'Distribyutor' }} />
      <Stack.Screen name="agreement/[id]" options={{ title: 'Kelishuv' }} />
      <Stack.Screen name="order/[id]" options={{ title: 'Xarid buyurtmasi' }} />
    </Stack>
  );
}
