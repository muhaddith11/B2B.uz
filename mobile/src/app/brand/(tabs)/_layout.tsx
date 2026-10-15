import { Tabs } from 'expo-router';

import { tabIcon, useTabOptions } from '@/components/nav';
import { t } from '@/lib/i18n';

export default function BrandTabs() {
  const options = useTabOptions();
  return (
    <Tabs screenOptions={options}>
      <Tabs.Screen name="index" options={{ headerShown: false, title: t('Bosh sahifa'), tabBarIcon: tabIcon('stats-chart-outline') }} />
      <Tabs.Screen name="products" options={{ title: t('Tovarlarim'), tabBarIcon: tabIcon('cube-outline') }} />
      <Tabs.Screen name="distributors" options={{ title: t('Distribyutorlar'), tabBarIcon: tabIcon('business-outline') }} />
      <Tabs.Screen name="orders" options={{ title: t('Buyurtmalar'), tabBarIcon: tabIcon('receipt-outline') }} />
    </Tabs>
  );
}
