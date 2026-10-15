import { Stack } from 'expo-router';

import { StaffProvider } from '@/context/staff';
import { useStackOptions } from '@/components/nav';
import { t } from '@/lib/i18n';

// Distribyutor xodimi ekranlari: tablar va ichki sahifalar
export default function StaffLayout() {
  const options = useStackOptions();
  return (
    <StaffProvider>
      <Stack screenOptions={options}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="order/[id]" options={{ title: t('Buyurtma') }} />
        <Stack.Screen name="shop/[linkId]" options={{ title: t("Do'kon") }} />
        <Stack.Screen name="shop-new" options={{ title: t("Yangi do'kon qo'shish") }} />
        <Stack.Screen name="new-order/[linkId]" options={{ title: t('Buyurtma olish') }} />
        <Stack.Screen name="requests" options={{ title: t("Ulanish so'rovlari") }} />
        <Stack.Screen name="payments" options={{ title: t("To'lovlar") }} />
        <Stack.Screen name="products" options={{ title: t('Tovarlar') }} />
        <Stack.Screen name="product-new" options={{ title: t('Yangi tovar') }} />
        <Stack.Screen name="brands" options={{ title: t('Tovar egalari') }} />
        <Stack.Screen name="brand/[id]" options={{ title: t('Tovar egasi') }} />
        <Stack.Screen name="team" options={{ title: t('Xodimlar') }} />
        <Stack.Screen name="settings" options={{ title: t('Sozlamalar') }} />
        <Stack.Screen name="payment-methods" options={{ title: t("To'lov usullari") }} />
      </Stack>
    </StaffProvider>
  );
}
