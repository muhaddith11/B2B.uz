import { useColorScheme } from 'react-native';

// Do'kon Mini App'idagi ranglar bilan bir xil: ko'k asosiy rang, qizil qarz/xato, yashil to'lov
const light = {
  bg: '#ffffff',
  card: '#f3f4f6',
  text: '#111827',
  hint: '#6b7280',
  accent: '#2563eb',
  accentText: '#ffffff',
  danger: '#dc2626',
  ok: '#16a34a',
  border: 'rgba(0,0,0,0.08)',
};

const dark: typeof light = {
  bg: '#0b0b0c',
  card: '#1c1c1f',
  text: '#f3f4f6',
  hint: '#9ca3af',
  accent: '#3b82f6',
  accentText: '#ffffff',
  danger: '#f87171',
  ok: '#4ade80',
  border: 'rgba(255,255,255,0.1)',
};

export type Palette = typeof light;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}
