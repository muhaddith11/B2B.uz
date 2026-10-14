import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';

export default function TabsLayout() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { cartCount } = useSession();
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: c.accent, tabBarInactiveTintColor: c.hint, headerTitleAlign: 'left', headerShadowVisible: false, headerStyle: { backgroundColor: c.bg }, headerTitleStyle: { fontSize: 22, fontWeight: '700' }, tabBarLabelStyle: { fontSize: 10, lineHeight: 12, fontWeight: '600' }, tabBarStyle: { borderTopColor: c.border, height: 56 + insets.bottom }, tabBarBadgeStyle: { backgroundColor: c.accent, color: c.accentText, fontSize: 11 } }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Bosh sahifa',
          headerShown: false,
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Savat',
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarIcon: ({ color }) => <Ionicons name="cart-outline" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Buyurtmalar',
          tabBarIcon: ({ color }) => <Ionicons name="receipt-outline" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="debts"
        options={{
          title: 'Qarzlarim',
          tabBarIcon: ({ color }) => <Ionicons name="wallet-outline" color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}
