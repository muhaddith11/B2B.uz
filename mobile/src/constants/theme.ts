import { useColorScheme } from 'react-native';

// Captar ranglari: yorug' sxema asosiy (do'kon kunduzi, agent ko'chada), qorong'i sxema to'liq ikkinchi.
// Ko'k faqat asosiy amal va tanlov uchun; holat ranglari faqat holat uchun.
const light = {
  bg: '#F4F5F7', // ekran foni
  card: '#FFFFFF', // kartochka, ro'yxat, panel
  field: '#F1F3F6', // kiritish maydoni, qidiruv
  text: '#0F172A',
  hint: '#586579',
  border: '#E3E7ED',
  accent: '#1A64D6',
  accentText: '#FFFFFF',
  accentInk: '#1A64D6', // ko'k matn va havola
  accentSoft: '#E8F0FD',
  danger: '#C4261A',
  dangerSoft: '#FDECEA',
  ok: '#0E7A51',
  okSoft: '#E5F5EE',
  warn: '#B54708',
  warnSoft: '#FEF2E4',
  info: '#6941C6',
  infoSoft: '#F1ECFB',
  shadow: 'rgba(15, 23, 42, 0.08)',
  overlay: 'rgba(15, 23, 42, 0.4)',
};

const dark: typeof light = {
  bg: '#0D1117',
  card: '#161B22',
  field: '#1F252E',
  text: '#E6EAF0',
  hint: '#94A0B2',
  border: '#262D38',
  accent: '#2F6FDB',
  accentText: '#FFFFFF',
  accentInk: '#6FA5FA',
  accentSoft: '#16263F',
  danger: '#F97066',
  dangerSoft: '#3A1C1A',
  ok: '#3CCB8B',
  okSoft: '#12291F',
  warn: '#F5A54A',
  warnSoft: '#33240F',
  info: '#A48AFB',
  infoSoft: '#241D3B',
  shadow: 'rgba(0, 0, 0, 0)',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export type Palette = typeof light;
export type Tone = 'text' | 'hint' | 'accent' | 'danger' | 'ok' | 'warn' | 'info';

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

// Ohang uchun yumshoq fon (holat belgisi, banner)
export function softOf(c: Palette, tone: Tone): string {
  if (tone === 'accent') return c.accentSoft;
  if (tone === 'danger') return c.dangerSoft;
  if (tone === 'ok') return c.okSoft;
  if (tone === 'warn') return c.warnSoft;
  if (tone === 'info') return c.infoSoft;
  return c.field;
}

// O'lchamlar: 4 pt qadam, tegish maydoni kamida 48
export const R = { sm: 10, md: 14, lg: 18, pill: 999 } as const;
export const TOUCH = 48;
