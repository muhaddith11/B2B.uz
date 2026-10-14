import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePalette } from '@/constants/theme';
import { t } from '@/lib/i18n';

export default function BrandTabs() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: c.accent, tabBarInactiveTintColor: c.hint, headerTitleAlign: 'left', headerShadowVisible: false, headerStyle: { backgroundColor: c.bg }, headerTitleStyle: { fontSize: 22, fontWeight: '700' }, tabBarLabelStyle: { fontSize: 10, lineHeight: 12, fontWeight: '600' }, tabBarStyle: { borderTopColor: c.border, height: 56 + insets.bottom }, tabBarBadgeStyle: { backgroundColor: c.accent, color: c.accentText, fontSize: 11 } }}>
      <Tabs.Screen name="index" options={{ headerShown: false, title: t('Bosh sahifa'), tabBarIcon: ({ color }) => <Ionicons name="stats-chart-outline" color={color} size={22} /> }} />
      <Tabs.Screen name="products" options={{ title: t('Tovarlarim'), tabBarIcon: ({ color }) => <Ionicons name="cube-outline" color={color} size={22} /> }} />
      <Tabs.Screen name="distributors" options={{ title: t('Distribyutorlar'), tabBarIcon: ({ color }) => <Ionicons name="business-outline" color={color} size={22} /> }} />
      <Tabs.Screen name="orders" options={{ title: t('Buyurtmalar'), tabBarIcon: ({ color }) => <Ionicons name="receipt-outline" color={color} size={22} /> }} />
    </Tabs>
  );
}
