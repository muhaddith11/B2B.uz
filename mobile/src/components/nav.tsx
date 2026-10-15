import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FONT, usePalette } from '@/constants/theme';
import { t } from '@/lib/i18n';

type IconName = keyof typeof Ionicons.glyphMap;

// Tab bar: oq, faol tab malina va yorlig'i ostida kichik abr belgisi (bo'yalgan ip va uning uzilgan uchi)
export function useTabOptions() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  return {
    tabBarActiveTintColor: c.current,
    tabBarInactiveTintColor: c.hint,
    headerTitleAlign: 'left' as const,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: c.bg },
    headerTitleStyle: { fontFamily: FONT.display, fontSize: 24, color: c.text },
    tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border, height: 62 + insets.bottom, paddingTop: 6 },
    tabBarBadgeStyle: { backgroundColor: c.accent, color: c.accentText, fontSize: 11, fontFamily: FONT.textSemi },
    tabBarLabel: TabLabel,
  };
}

function TabLabel({ focused, color, children }: { focused: boolean; color: ColorValue; children: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 3 }}>
      <Text style={{ color, fontSize: 10, lineHeight: 12, fontFamily: FONT.textSemi }} numberOfLines={1}>
        {children}
      </Text>
      <View style={{ flexDirection: 'row', gap: 2, height: 3, opacity: focused ? 1 : 0 }}>
        <View style={{ width: 14, height: 3, borderRadius: 1.5, backgroundColor: color }} />
        <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: color }} />
      </View>
    </View>
  );
}

export function tabIcon(name: IconName) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <Ionicons name={name} color={color as string} size={22} />;
  };
}

// Ichki sahifalar sarlavhasi: ekran foni bilan bir xil, soyasiz
export function useStackOptions() {
  const c = usePalette();
  return {
    headerBackTitle: t('Orqaga'),
    headerShadowVisible: false,
    headerStyle: { backgroundColor: c.bg },
    headerTintColor: c.accentInk,
    headerTitleStyle: { fontFamily: FONT.textSemi, fontSize: 17, color: c.text },
    headerBackTitleStyle: { fontFamily: FONT.text },
    contentStyle: { backgroundColor: c.bg },
  };
}
