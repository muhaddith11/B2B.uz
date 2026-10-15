import { useColorScheme } from 'react-native';

// Captar "Atlas" dunyosi: Marg'ilon atlasidan cheklangan bo'yoq. Yorug' sxema asosiy (do'kon kunduzi, agent ko'chada),
// qorong'i sxema to'liq ikkinchi.
// - indigo (accent, shell): asosiy amal va bosh sahifa tasmasi
// - malina (current): faqat "hozirgi" narsa: joriy bosqich, faol tab, tanlangan chip va tovar
// - za'faron (dye): faqat indigo tasma ustidagi limit bo'yog'i
// - holat ranglari faqat holat uchun
const light = {
  bg: '#F6F5FA', // ekran foni: ipak-oq
  card: '#FFFFFF', // kartochka, ro'yxat, panel
  field: '#EFEEF6', // kiritish maydoni, qidiruv
  text: '#17152E', // siyoh
  hint: '#625F80',
  border: '#E4E2EF',
  accent: '#23205C', // indigo: asosiy tugma
  accentText: '#FFFFFF',
  accentInk: '#3B34A6', // indigo matn va havola
  accentSoft: '#ECEBF8',
  current: '#D11F5E', // malina
  currentSoft: '#FCE8F0',
  danger: '#C42B1C',
  dangerSoft: '#FCEBE9',
  ok: '#1B7F50',
  okSoft: '#E4F4EC',
  warn: '#A85208',
  warnSoft: '#FDF0E1',
  info: '#6B3FA0',
  infoSoft: '#F2ECFA',
  shell: '#23205C', // bosh sahifa tasmasi
  shell2: '#2F2B78', // tasma ustidagi ikkinchi darajali yuza
  shellText: '#FFFFFF',
  shellHint: '#C9C6EA',
  dye: '#F2B705', // za'faron: tasmadagi limit bo'yog'i
  shadow: 'rgba(35, 32, 92, 0.08)',
  overlay: 'rgba(23, 21, 46, 0.45)',
};

const dark: typeof light = {
  bg: '#0E0D1A',
  card: '#171628',
  field: '#211F36',
  text: '#ECEBF7',
  hint: '#A29FC2',
  border: '#2A2843',
  accent: '#4C45C9',
  accentText: '#FFFFFF',
  accentInk: '#A9A4FF',
  accentSoft: '#23214A',
  current: '#FF4F8B',
  currentSoft: '#3A1426',
  danger: '#FF6B5E',
  dangerSoft: '#3A1916',
  ok: '#3CCB8B',
  okSoft: '#11291E',
  warn: '#F5A54A',
  warnSoft: '#33230F',
  info: '#B596F5',
  infoSoft: '#2A1F44',
  shell: '#1E1B4F',
  shell2: '#2B2770',
  shellText: '#FFFFFF',
  shellHint: '#B9B5E6',
  dye: '#F5C431',
  shadow: 'rgba(0, 0, 0, 0)',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export type Palette = typeof light;
export type Tone = 'text' | 'hint' | 'accent' | 'current' | 'danger' | 'ok' | 'warn' | 'info';

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

// Ohang uchun yumshoq fon (holat belgisi, banner)
export function softOf(c: Palette, tone: Tone): string {
  if (tone === 'accent') return c.accentSoft;
  if (tone === 'current') return c.currentSoft;
  if (tone === 'danger') return c.dangerSoft;
  if (tone === 'ok') return c.okSoft;
  if (tone === 'warn') return c.warnSoft;
  if (tone === 'info') return c.infoSoft;
  return c.field;
}

// Shriftlar (root _layout'da yuklanadi). Unbounded faqat summa va sarlavhada, to'rt o'lchamda: 15, 18, 24, 34.
// Qolgan hamma matn Golos Text. Maxsus shriftda fontWeight berilmaydi: og'irlik shrift nomida
export const FONT = {
  display: 'Unbounded_600SemiBold',
  displayBold: 'Unbounded_700Bold',
  displayMedium: 'Unbounded_500Medium',
  text: 'GolosText_400Regular',
  textMedium: 'GolosText_500Medium',
  textSemi: 'GolosText_600SemiBold',
  textBold: 'GolosText_700Bold',
} as const;

// Rasmi yo'q tashkilot yoki odam: nomidan doim bir xil chiqadigan bo'yoq plitkasi (oq bosh harf bilan)
const DYES = ['#0E7A8A', '#5B3A8E', '#2F2B78', '#9A3B2E', '#2F6B3A', '#8A5A12', '#7A2E5C'];
export function dyeOf(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return DYES[h % DYES.length];
}

// O'lchamlar: 4 pt qadam, tegish maydoni kamida 48
export const R = { sm: 10, md: 14, lg: 18, shell: 28, pill: 999 } as const;
export const TOUCH = 48;
