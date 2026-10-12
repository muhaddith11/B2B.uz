import { Stack } from 'expo-router';

import { StaffProvider } from '@/context/staff';

// Distribyutor xodimi ekranlari: tablar va ichki sahifalar
export default function StaffLayout() {
  return (
    <StaffProvider>
      <Stack screenOptions={{ headerBackTitle: 'Orqaga' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="order/[id]" options={{ title: 'Buyurtma' }} />
        <Stack.Screen name="shop/[linkId]" options={{ title: "Do'kon" }} />
        <Stack.Screen name="shop-new" options={{ title: "Yangi do'kon qo'shish" }} />
        <Stack.Screen name="new-order/[linkId]" options={{ title: 'Buyurtma olish' }} />
        <Stack.Screen name="requests" options={{ title: "Ulanish so'rovlari" }} />
        <Stack.Screen name="payments" options={{ title: "To'lovlar" }} />
        <Stack.Screen name="products" options={{ title: 'Tovarlar' }} />
        <Stack.Screen name="product-new" options={{ title: 'Yangi tovar' }} />
        <Stack.Screen name="brands" options={{ title: 'Tovar egalari' }} />
        <Stack.Screen name="brand/[id]" options={{ title: 'Tovar egasi' }} />
        <Stack.Screen name="team" options={{ title: 'Xodimlar' }} />
        <Stack.Screen name="settings" options={{ title: 'Sozlamalar' }} />
        <Stack.Screen name="payment-methods" options={{ title: "To'lov usullari" }} />
      </Stack>
    </StaffProvider>
  );
}
