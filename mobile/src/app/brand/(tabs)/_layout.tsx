import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { usePalette } from '@/constants/theme';

export default function BrandTabs() {
  const c = usePalette();
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: c.accent, tabBarInactiveTintColor: c.hint, headerTitleAlign: 'left' }}>
      <Tabs.Screen name="index" options={{ title: 'Bosh sahifa', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="products" options={{ title: 'Tovarlarim', tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="distributors" options={{ title: 'Distribyutorlar', tabBarIcon: ({ color, size }) => <Ionicons name="business-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="orders" options={{ title: 'Buyurtmalar', tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
