// Jest: ekranlar haqiqiy komponentlar bilan chiziladi, faqat tashqi narsalar soxta: server (fetch, helpers.tsx),
// telefon xotirasi, navigatsiya, brauzer va animatsiya

// Animatsiya: Reanimated 4.7 ning o'z mock'i Jest'da ishga tushmaydi (JSReanimated'da setCSSEventHandler yo'q),
// shuning uchun ui.tsx ishlatadigan qismi oddiy View va darhol oxirgi qiymatga o'tadigan funksiyalar bilan almashtirilgan
jest.mock('react-native-reanimated', () => {
  const { View, Text, Image, ScrollView } = require('react-native');
  const same = <T,>(v: T) => v;
  const Animated = { View, Text, Image, ScrollView, createAnimatedComponent: same };
  return {
    __esModule: true,
    default: Animated,
    ...Animated,
    Easing: { linear: same, ease: same, exp: same, quad: same, cubic: same, in: () => same, out: () => same, inOut: () => same, bezier: () => same },
    useSharedValue: <T,>(value: T) => ({ value }),
    useAnimatedStyle: (style: () => object) => style(),
    withTiming: same,
    withSpring: same,
    withDelay: (_ms: number, animation: unknown) => animation,
    withRepeat: same,
    withSequence: (...steps: unknown[]) => steps[steps.length - 1],
  };
});
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// Shifrlangan xotira o'rniga oddiy Map: test oldindan sessiya yozadi va kirgandan keyin nima saqlanganini tekshiradi
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

// Navigatsiya: ekran alohida chiziladi, o'tishlar faqat yoziladi. useFocusEffect: ekran ochilganda bir marta
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
    useLocalSearchParams: jest.fn(() => ({})),
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
  };
});

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => ({ type: 'dismiss' })) }));

// Ekran chekkalari (notch, tizim paneli): kutubxonaning o'z Jest mock'i, nol qiymatlar bilan
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// Ikonkalar: shrift fayli Jest'dagi asset registry'da topilmaydi (RN 0.88 + jest-expo); ikonka o'rnida nomi chiziladi
jest.mock('@expo/vector-icons/Ionicons', () => {
  const { createElement } = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name }: { name: string }) => createElement(Text, null, `[${name}]`);
  Icon.glyphMap = {};
  return { __esModule: true, default: Icon };
});

// Push bildirishnomalar: expo-notifications native modulsiz yuklanmaydi; testlardagi jarayonlarga aloqasi yo'q
jest.mock('@/lib/push', () => ({
  savedPushToken: jest.fn(async () => null),
  registerForPush: jest.fn(),
  onNotificationTap: jest.fn(() => () => {}),
}));
