import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { usePalette } from '@/constants/theme';
import { useStaff } from '@/context/staff';

// Tablar rolga qarab: agent bosh sahifasida do'konlari, yetkazuvchida yetkazishlar
export default function StaffTabs() {
  const c = usePalette();
  const { can } = useStaff();
  const agent = can('AGENT');
  const courier = can('COURIER');

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: c.accent, tabBarInactiveTintColor: c.hint, headerTitleAlign: 'left' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: agent ? "Do'konlarim" : courier ? 'Yetkazish' : 'Bosh sahifa',
          tabBarIcon: ({ color, size }) => <Ionicons name={agent ? 'storefront-outline' : courier ? 'car-outline' : 'home-outline'} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: agent ? 'Buyurtmalarim' : 'Buyurtmalar',
          href: courier ? null : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="shops"
        options={{
          title: "Do'konlar",
          href: agent || courier ? null : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="storefront-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: "Ko'proq", tabBarIcon: ({ color, size }) => <Ionicons name="menu-outline" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
