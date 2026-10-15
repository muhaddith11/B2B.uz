import { Tabs } from 'expo-router';

import { tabIcon, useTabOptions } from '@/components/nav';
import { useSession } from '@/context/session';
import { t } from '@/lib/i18n';

export default function TabsLayout() {
  const options = useTabOptions();
  const { cartCount } = useSession();
  return (
    <Tabs screenOptions={options}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('Bosh sahifa'),
          headerShown: false,
          tabBarIcon: tabIcon('home-outline'),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: t('Savat'),
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarIcon: tabIcon('cart-outline'),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('Buyurtmalar'),
          tabBarIcon: tabIcon('receipt-outline'),
        }}
      />
      <Tabs.Screen
        name="debts"
        options={{
          title: t('Qarzlarim'),
          tabBarIcon: tabIcon('wallet-outline'),
        }}
      />
    </Tabs>
  );
}
