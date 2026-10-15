import { Tabs } from 'expo-router';

import { tabIcon, useTabOptions } from '@/components/nav';
import { useStaff } from '@/context/staff';
import { t } from '@/lib/i18n';

// Tablar rolga qarab: agent bosh sahifasida do'konlari, yetkazuvchida yetkazishlar
export default function StaffTabs() {
  const options = useTabOptions();
  const { can } = useStaff();
  const agent = can('AGENT');
  const courier = can('COURIER');

  return (
    <Tabs screenOptions={options}>
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          title: agent ? t("Do'konlarim") : courier ? t('Yetkazish') : t('Bosh sahifa'),
          tabBarIcon: tabIcon(agent ? 'storefront-outline' : courier ? 'car-outline' : 'home-outline'),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: agent ? t('Buyurtmalarim') : t('Buyurtmalar'),
          href: courier ? null : undefined,
          tabBarIcon: tabIcon('receipt-outline'),
        }}
      />
      <Tabs.Screen
        name="shops"
        options={{
          title: t("Do'konlar"),
          href: agent || courier ? null : undefined,
          tabBarIcon: tabIcon('storefront-outline'),
        }}
      />
      <Tabs.Screen name="more" options={{ title: t("Ko'proq"), tabBarIcon: tabIcon('menu-outline') }} />
    </Tabs>
  );
}
