import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePalette } from '@/constants/theme';

export default function BrandTabs() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: c.accent, tabBarInactiveTintColor: c.hint, headerTitleAlign: 'left', headerShadowVisible: false, headerStyle: { backgroundColor: c.bg }, headerTitleStyle: { fontSize: 22, fontWeight: '700' }, tabBarLabelStyle: { fontSize: 10, lineHeight: 12, fontWeight: '600' }, tabBarStyle: { borderTopColor: c.border, height: 56 + insets.bottom }, tabBarBadgeStyle: { backgroundColor: c.accent, color: c.accentText, fontSize: 11 } }}>
      <Tabs.Screen name="index" options={{ headerShown: false, title: 'Bosh sahifa', tabBarIcon: ({ color }) => <Ionicons name="stats-chart-outline" color={color} size={22} /> }} />
      <Tabs.Screen name="products" options={{ title: 'Tovarlarim', tabBarIcon: ({ color }) => <Ionicons name="cube-outline" color={color} size={22} /> }} />
      <Tabs.Screen name="distributors" options={{ title: 'Distribyutorlar', tabBarIcon: ({ color }) => <Ionicons name="business-outline" color={color} size={22} /> }} />
      <Tabs.Screen name="orders" options={{ title: 'Buyurtmalar', tabBarIcon: ({ color }) => <Ionicons name="receipt-outline" color={color} size={22} /> }} />
    </Tabs>
  );
}
