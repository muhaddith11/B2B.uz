import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePalette } from '@/constants/theme';
import { useStaff } from '@/context/staff';

// Tablar rolga qarab: agent bosh sahifasida do'konlari, yetkazuvchida yetkazishlar
export default function StaffTabs() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { can } = useStaff();
  const agent = can('AGENT');
  const courier = can('COURIER');

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: c.accent, tabBarInactiveTintColor: c.hint, headerTitleAlign: 'left', headerShadowVisible: false, headerStyle: { backgroundColor: c.bg }, headerTitleStyle: { fontSize: 22, fontWeight: '700' }, tabBarLabelStyle: { fontSize: 10, lineHeight: 12, fontWeight: '600' }, tabBarStyle: { borderTopColor: c.border, height: 56 + insets.bottom }, tabBarBadgeStyle: { backgroundColor: c.accent, color: c.accentText, fontSize: 11 } }}>
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          title: agent ? "Do'konlarim" : courier ? 'Yetkazish' : 'Bosh sahifa',
          tabBarIcon: ({ color }) => <Ionicons name={agent ? 'storefront-outline' : courier ? 'car-outline' : 'home-outline'} color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: agent ? 'Buyurtmalarim' : 'Buyurtmalar',
          href: courier ? null : undefined,
          tabBarIcon: ({ color }) => <Ionicons name="receipt-outline" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="shops"
        options={{
          title: "Do'konlar",
          href: agent || courier ? null : undefined,
          tabBarIcon: ({ color }) => <Ionicons name="storefront-outline" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: "Ko'proq", tabBarIcon: ({ color }) => <Ionicons name="menu-outline" color={color} size={22} /> }}
      />
    </Tabs>
  );
}
