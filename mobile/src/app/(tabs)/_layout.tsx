import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';

export default function TabsLayout() {
  const c = usePalette();
  const { cartCount } = useSession();
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: c.accent, tabBarInactiveTintColor: c.hint, headerTitleAlign: 'left' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Bosh sahifa',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Savat',
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Buyurtmalar',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="debts"
        options={{
          title: 'Qarzlarim',
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
