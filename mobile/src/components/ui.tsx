import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { dyeOf, FONT, R, softOf, TOUCH, usePalette, type Palette, type Tone } from '@/constants/theme';
import { fileUrl } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { t } from '@/lib/i18n';
import { formatAmount, formatSom, formatStepTime } from '@/lib/money';
import { statusLabel, type OrderStatus, type StepTimes } from '@/lib/types';

export type { Tone };
type IconName = keyof typeof Ionicons.glyphMap;
type Size = 'display' | 'title' | 'h2' | 'body' | 'small' | 'tiny';

// Sarlavha va summa: Unbounded, faqat to'rt o'lchamda (34, 24, 18 va kartochkadagi summa 15). Matn: Golos Text
const SIZES: Record<Size, { fontSize: number; lineHeight: number }> = {
  display: { fontSize: 34, lineHeight: 42 },
  title: { fontSize: 24, lineHeight: 30 },
  h2: { fontSize: 18, lineHeight: 24 },
  body: { fontSize: 16, lineHeight: 22 },
  small: { fontSize: 14, lineHeight: 20 },
  tiny: { fontSize: 12, lineHeight: 16 },
};
const DISPLAY: Size[] = ['display', 'title', 'h2'];

// Maxsus shriftda og'irlik shrift nomida: style dagi fontWeight shu yerda mos shriftga aylanadi (Android'da
// fontWeight bilan maxsus shrift tizim shriftiga qaytib qolmasin)
function familyFor(size: Size, weight: TextStyle['fontWeight']): string {
  const w = String(weight ?? '400');
  if (DISPLAY.includes(size)) return size === 'display' || w === '700' || w === 'bold' ? FONT.displayBold : w === '500' ? FONT.displayMedium : FONT.display;
  if (w === '700' || w === 'bold' || w === '800' || w === '900') return FONT.textBold;
  if (w === '600') return FONT.textSemi;
  if (w === '500') return FONT.textMedium;
  return FONT.text;
}

// Android'da bosilganda tizimning to'lqin effekti (ripple), iOS va web'da shaffoflik
const ANDROID = Platform.OS === 'android';
const rippleColor = (c: Palette, onAccent = false) => (onAccent ? 'rgba(255,255,255,0.24)' : c.border);

function toneColor(c: Palette, tone: Tone): string {
  return tone === 'accent' ? c.accentInk : c[tone];
}

// Matn. num: summa va miqdorlar uchun jadval raqamlari (ustunlar bir chiziqda turadi)
export function T({
  size = 'body',
  tone = 'text',
  bold,
  num,
  style,
  ...rest
}: TextProps & { size?: Size; tone?: Tone; bold?: boolean; num?: boolean }) {
  const c = usePalette();
  const styles: StyleProp<TextStyle> = [SIZES[size], { color: toneColor(c, tone) }, num && { fontVariant: ['tabular-nums'] }, style];
  const { fontWeight, ...flat }: TextStyle = StyleSheet.flatten(styles) ?? {};
  return <Text style={[flat, { fontFamily: familyFor(size, bold ? '600' : fontWeight) }]} {...rest} />;
}

// Summa: raqam Unbounded (kichik o'lchamda Golos), "so'm" bir pog'ona kichik va yengil
export function Money({ value, size = 'body', tone = 'text', color, bold = true }: { value: number; size?: Size; tone?: Tone; color?: string; bold?: boolean }) {
  const c = usePalette();
  const col = color ?? toneColor(c, tone);
  const display = size === 'display' || size === 'title' || size === 'h2' || size === 'body';
  const num: TextStyle =
    size === 'display'
      ? { fontFamily: FONT.displayBold, fontSize: 34, lineHeight: 42 }
      : size === 'title'
        ? { fontFamily: FONT.display, fontSize: 24, lineHeight: 30 }
        : size === 'h2'
          ? { fontFamily: FONT.display, fontSize: 18, lineHeight: 24 }
          : size === 'body'
            ? { fontFamily: bold ? FONT.display : FONT.displayMedium, fontSize: 15, lineHeight: 20 }
            : { fontFamily: bold ? FONT.textSemi : FONT.text, ...SIZES[size] };
  const unit = size === 'display' ? 17 : size === 'title' ? 15 : size === 'h2' || size === 'body' ? 13 : size === 'small' ? 12 : 11;
  return (
    <Text style={[num, { color: col, fontVariant: ['tabular-nums'], flexShrink: 0 }]} numberOfLines={display ? 1 : undefined} adjustsFontSizeToFit={size === 'display'}>
      {formatAmount(value)}
      <Text style={{ fontFamily: FONT.textMedium, fontSize: unit, color: col, opacity: 0.8 }}>
        {' '}
        {t("so'm")}
      </Text>
    </Text>
  );
}

// Oq yuza: yorug' sxemada yumshoq indigo soya, qorong'ida chegara
export function Card({ style, ...rest }: ViewProps) {
  const c = usePalette();
  const dark = useColorScheme() === 'dark';
  return (
    <View
      style={[
        { backgroundColor: c.card, borderRadius: R.lg, padding: 16 },
        dark
          ? { borderWidth: 1, borderColor: c.border }
          : { shadowColor: '#23205C', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
        style,
      ]}
      {...rest}
    />
  );
}

// light / shell: faqat indigo tasma ustida (oq tugma va tasmaning ikkinchi darajali yuzasi)
type ButtonKind = 'primary' | 'secondary' | 'danger' | 'ghost' | 'light' | 'shell';

function buttonColors(c: Palette, kind: ButtonKind) {
  if (kind === 'primary') return { bg: c.accent, fg: c.accentText };
  if (kind === 'danger') return { bg: c.dangerSoft, fg: c.danger };
  if (kind === 'ghost') return { bg: 'transparent', fg: c.accentInk };
  if (kind === 'light') return { bg: c.card, fg: c.accentInk };
  if (kind === 'shell') return { bg: c.shell2, fg: c.shellText };
  return { bg: c.accentSoft, fg: c.accentInk };
}

export function Button({
  title,
  kind = 'primary',
  icon,
  loading,
  disabled,
  compact,
  style,
  ...rest
}: PressableProps & { title: string; kind?: ButtonKind; icon?: IconName; loading?: boolean; compact?: boolean; style?: ViewProps['style'] }) {
  const c = usePalette();
  const col = buttonColors(c, kind);
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      android_ripple={{ color: rippleColor(c, kind === 'primary' || kind === 'shell') }}
      style={({ pressed }) => [
        {
          backgroundColor: col.bg,
          borderRadius: R.md,
          overflow: 'hidden',
          minHeight: compact ? 40 : 52,
          paddingHorizontal: compact ? 14 : 18,
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: off ? 0.45 : pressed && !ANDROID ? 0.82 : 1,
        },
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={col.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={compact ? 18 : 20} color={col.fg} />}
          <Text style={{ color: col.fg, fontSize: compact ? 14 : 16, fontFamily: FONT.textSemi, flexShrink: 1 }} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, tone = 'text', color, background }: { icon: IconName; label: string; onPress: () => void; tone?: Tone; color?: string; background?: string }) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      android_ripple={{ color: rippleColor(c, !!background), borderless: true, radius: 22 }}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: background ?? (pressed && !ANDROID ? c.field : 'transparent'),
        opacity: background && pressed && !ANDROID ? 0.8 : 1,
      })}>
      <Ionicons name={icon} size={22} color={color ?? toneColor(c, tone)} />
    </Pressable>
  );
}

export function Field({ label, error, style, onFocus, onBlur, ...rest }: TextInputProps & { label: string; error?: string | null }) {
  const c = usePalette();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <T size="small" tone="hint" style={{ fontWeight: '500' }}>
        {label}
      </T>
      <TextInput
        placeholderTextColor={c.hint}
        selectionColor={c.accentInk}
        cursorColor={c.accentInk}
        onFocus={(e) => {
          setFocus(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocus(false);
          onBlur?.(e);
        }}
        style={[
          {
            backgroundColor: c.field,
            color: c.text,
            borderRadius: R.md,
            paddingHorizontal: 14,
            paddingVertical: 14,
            minHeight: 52,
            fontSize: 16,
            fontFamily: FONT.text,
            borderWidth: 1.5,
            borderColor: error ? c.danger : focus ? c.accentInk : 'transparent',
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <T size="small" tone="danger">
          {error}
        </T>
      ) : null}
    </View>
  );
}

export function SearchInput(props: TextInputProps) {
  const c = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, borderRadius: R.md, borderWidth: 1, borderColor: c.border, paddingHorizontal: 12, minHeight: TOUCH - 4 }}>
      <Ionicons name="search" size={18} color={c.hint} />
      <TextInput
        placeholderTextColor={c.hint}
        selectionColor={c.accentInk}
        cursorColor={c.accentInk}
        autoCorrect={false}
        returnKeyType="search"
        style={{ flex: 1, color: c.text, paddingHorizontal: 8, paddingVertical: 10, fontSize: 16, fontFamily: FONT.text }}
        {...props}
      />
      {props.value ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('Tozalash')} hitSlop={8} onPress={() => props.onChangeText?.('')}>
          <Ionicons name="close-circle" size={18} color={c.hint} />
        </Pressable>
      ) : null}
    </View>
  );
}

// Tanlangan chip malina: "hozirgi" tanlov
export function Chip({ label, active, onPress, count }: { label: string; active: boolean; onPress: () => void; count?: number }) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => {
        if (!active) haptic.tick();
        onPress();
      }}
      android_ripple={{ color: rippleColor(c, active) }}
      style={({ pressed }) => ({
        backgroundColor: active ? c.current : c.card,
        borderColor: active ? c.current : c.border,
        borderWidth: 1,
        borderRadius: R.pill,
        overflow: 'hidden',
        paddingHorizontal: 14,
        minHeight: 36,
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
        opacity: pressed && !ANDROID ? 0.85 : 1,
      })}>
      <Text style={{ color: active ? '#FFFFFF' : c.text, fontSize: 14, fontFamily: active ? FONT.textSemi : FONT.textMedium }}>{label}</Text>
      {count !== undefined && <Text style={{ color: active ? '#FFFFFF' : c.hint, fontSize: 13, fontFamily: FONT.textMedium, fontVariant: ['tabular-nums'] }}>{count}</Text>}
    </Pressable>
  );
}

// Qiymat o'zgarganda yengil sakrash (birinchi chizishda emas); tizimda harakat kamaytirilgan bo'lsa Reanimated o'zi o'chiradi
function useBump(value: unknown) {
  const scale = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    scale.value = withSequence(withTiming(1.06, { duration: 90 }), withSpring(1, { damping: 12, stiffness: 220 }));
  }, [value, scale]);
  return useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
}

// Yashik soni. 0 bo'lsa dumaloq indigo "+", bosilganda o'z joyida "− 2 +" ga aylanadi (savatda dona saqlanadi)
export function QtyStepper({ packs, onChange, label = true, full }: { packs: number; onChange: (packs: number) => void; label?: boolean; full?: boolean }) {
  const c = usePalette();
  const bump = useBump(packs);
  const change = (n: number) => {
    haptic.tick();
    onChange(n);
  };
  if (packs === 0) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Savatga qo'shish")}
        onPress={() => change(1)}
        hitSlop={6}
        android_ripple={{ color: rippleColor(c, true), borderless: true, radius: 22 }}
        style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', opacity: pressed && !ANDROID ? 0.85 : 1 })}>
        <Ionicons name="add" size={26} color={c.accentText} />
      </Pressable>
    );
  }
  const side = { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' } as const;
  const ripple = { color: rippleColor(c), borderless: true, radius: 22 };
  return (
    <Animated.View
      style={[bump, { flexDirection: 'row', alignItems: 'center', backgroundColor: c.accentSoft, borderRadius: 22, height: 44 }, full && { flex: 1, justifyContent: 'space-between' }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={packs === 1 ? t('Savatdan olib tashlash') : t('Kamaytirish')}
        onPress={() => change(packs - 1)}
        android_ripple={ripple}
        style={side}>
        <Ionicons name={packs === 1 ? 'trash-outline' : 'remove'} size={20} color={c.accentInk} />
      </Pressable>
      <T bold num tone="accent" numberOfLines={1} style={{ minWidth: label ? 64 : 24, textAlign: 'center', flexShrink: 1 }}>
        {label ? t('{n} yashik', { n: packs }) : packs}
      </T>
      <Pressable accessibilityRole="button" accessibilityLabel={t("Ko'paytirish")} onPress={() => change(packs + 1)} android_ripple={ripple} style={side}>
        <Ionicons name="add" size={22} color={c.accentInk} />
      </Pressable>
    </Animated.View>
  );
}

function initials(name: string, two: boolean): string {
  const words = name.replace(/["«»'"]/g, '').trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.charAt(0) ?? '?';
  const second = two && words.length > 1 ? words[words.length - 1].charAt(0) : '';
  return (first + second).toUpperCase();
}

// Rasm: tashkilot (do'kon, distribyutor, tovar egasi) yumaloq kvadrat plitkada, odam doirada.
// Rasm bo'lmasa nomidan doim bir xil chiqadigan bo'yoq plitkasida oq bosh harf. ring: tasma ustida oq halqa
export function Pic({ uri, name, size = 44, shape = 'tile', ring }: { uri?: string | null; name: string; size?: number; shape?: 'tile' | 'circle'; ring?: string }) {
  const radius = shape === 'circle' ? size / 2 : Math.round(size * 0.28);
  const box = { width: size, height: size, borderRadius: radius, overflow: 'hidden' as const };
  const edge = ring ? { borderWidth: 2, borderColor: ring } : null;
  if (uri) {
    return <Image source={{ uri: fileUrl(uri) }} style={[box, edge]} contentFit="cover" transition={150} accessibilityIgnoresInvertColors accessibilityLabel={name} />;
  }
  return (
    <View style={[box, edge, { backgroundColor: dyeOf(name), alignItems: 'center', justifyContent: 'center' }]} accessibilityLabel={name}>
      <Text style={{ color: '#FFFFFF', fontFamily: FONT.textBold, fontSize: Math.round(size * (shape === 'circle' ? 0.36 : 0.42)) }}>{initials(name, shape === 'circle')}</Text>
    </View>
  );
}

// Tovar rasmi; rasm bo'lmasa nomning bosh harfi bo'yoq plitkasida
export function Thumb({ uri, name, size = 56 }: { uri?: string | null; name: string; size?: number | '100%' }) {
  const c = usePalette();
  const box = { width: size, height: size === '100%' ? undefined : size, aspectRatio: size === '100%' ? 1.25 : undefined, borderRadius: R.md, backgroundColor: c.field } as const;
  if (uri) return <Image source={{ uri: fileUrl(uri) }} style={box} contentFit="cover" transition={150} accessibilityIgnoresInvertColors />;
  return (
    <View style={[box, { alignItems: 'center', justifyContent: 'center', backgroundColor: dyeOf(name) }]}>
      <Text style={{ color: '#FFFFFF', fontSize: typeof size === 'number' ? Math.round(size * 0.4) : 30, fontFamily: FONT.textBold }}>{name.trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}

// ---- Abr chizig'i (Captar'ning imzo elementi) ----
// Atlas iplari to'qishdan oldin bo'yaladi va rang chegarasi bulutdek (abr) yoyiladi. Chiziq ingichka iplardan iborat,
// har ipning bo'yog'i biroz boshqa joyda tugaydi: chet pog'onali. Qiymat o'zgarganda bo'yoq iplar bo'ylab birin-ketin
// yoyiladi (tizimda harakat kamaytirilgan bo'lsa Reanimated sakrashsiz qo'yadi)
const OFFSETS = [-3, 4, -6, 5, -1, -5, 3, -2];

function AbrThread({ top, height, width, color, delay, animateIn }: { top: number; height: number; width: number; color: string; delay: number; animateIn: boolean }) {
  const w = useSharedValue(animateIn ? 0 : width);
  const first = useRef(true);
  useEffect(() => {
    if (first.current && !animateIn) {
      first.current = false;
      return;
    }
    first.current = false;
    w.value = withDelay(delay, withTiming(width, { duration: 560, easing: Easing.out(Easing.exp) }));
  }, [width, delay, animateIn, w]);
  const st = useAnimatedStyle(() => ({ width: w.value }));
  return <Animated.View style={[{ position: 'absolute', left: 0, top, height, backgroundColor: color, borderTopRightRadius: height / 2, borderBottomRightRadius: height / 2 }, st]} />;
}

export function AbrBar({
  value,
  dye,
  track,
  height = 14,
  animateIn = false,
  label,
}: {
  value: number;
  dye: string;
  track: string;
  height?: number;
  animateIn?: boolean;
  label?: string;
}) {
  const [w, setW] = useState(0);
  const v = Math.max(0, Math.min(1, value));
  const rows = Math.max(3, Math.round(height / 2));
  const rowH = height / rows;
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      accessible={!!label}
      accessibilityRole={label ? 'progressbar' : undefined}
      accessibilityLabel={label}
      accessibilityValue={label ? { min: 0, max: 100, now: Math.round(v * 100) } : undefined}
      style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}>
      {w > 0 &&
        Array.from({ length: rows }, (_, i) => {
          // To'liq yoki bo'sh bo'lsa chet tekis; oraliqda har ip o'z joyida tugaydi
          const width = v <= 0 ? 0 : v >= 1 ? w : Math.max(2, Math.min(w, v * w + OFFSETS[i % OFFSETS.length]));
          return <AbrThread key={i} top={i * rowH} height={rowH} width={width} color={dye} delay={i * 35} animateIn={animateIn} />;
        })}
    </View>
  );
}

// Indigo tasma: bosh sahifalar tepasida, pastki burchaklari yumaloq; tizim paneli matni oq
export function ShellBand({ children, gap = 16 }: { children: React.ReactNode; gap?: number }) {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: c.shell, borderBottomLeftRadius: R.shell, borderBottomRightRadius: R.shell, paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 22, gap }}>
      <StatusBar style="light" />
      {children}
    </View>
  );
}

// Skeleton: ma'lumot o'rnida kartochka shakllari yumshoq miltillaydi (aylanuvchi belgi o'rniga)
function SkeletonBlock({ width, height = 14 }: { width: number | `${number}%`; height?: number }) {
  const c = usePalette();
  return <View style={{ width, height, borderRadius: height / 2, backgroundColor: c.field }} />;
}

// inline: ekran ichida (o'z chekkasi bor joyda), aks holda butun ekran o'rnida
export function Loading({ rows = 3, safeTop, inline }: { rows?: number; safeTop?: boolean; inline?: boolean }) {
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(0.5, { duration: 700 }), withTiming(1, { duration: 700 })), -1);
  }, [opacity]);
  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const pad = inline ? 0 : 16;
  return (
    <Animated.View style={[{ padding: pad, paddingTop: safeTop ? insets.top + 8 : pad, gap: 12 }, pulse]} accessibilityRole="progressbar" accessibilityLabel={t('Yuklanmoqda')}>
      {Array.from({ length: rows }, (_, i) => (
        <Card key={i} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <SkeletonBlock width="55%" height={16} />
            <SkeletonBlock width="20%" height={16} />
          </View>
          <SkeletonBlock width="75%" />
          <SkeletonBlock width="40%" />
        </Card>
      ))}
    </Animated.View>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ padding: 16 }}>
      <Banner tone="danger">{children}</Banner>
    </View>
  );
}

// Ma'lumot yuklanmadi (masalan, internet yo'q): sababi va qayta urinish tugmasi
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const c = usePalette();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="alert-circle-outline" size={28} color={c.danger} />
      </View>
      <T tone="hint" style={{ textAlign: 'center', maxWidth: 300 }}>
        {message}
      </T>
      <Button title={t('Qayta urinish')} icon="refresh" kind="secondary" onPress={onRetry} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}

// Pastga tortib yangilanadigan ekran. sticky: birinchi bola (qidiruv, filtr) tepada yopishib turadi.
// band: bosh sahifaning indigo tasmasi (ekran chekkasigacha, tepadan tizim paneli ostidan boshlanadi)
export function Screen({
  children,
  refreshing,
  onRefresh,
  gap = 12,
  bottom = 32,
  safeTop,
  sticky,
  band,
}: {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  gap?: number;
  bottom?: number;
  // Sarlavhasiz ekran (bosh sahifa): yuqoridan tizim paneli uchun joy
  safeTop?: boolean;
  sticky?: boolean;
  band?: React.ReactNode;
}) {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const refresh = onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={band ? c.shellText : c.accentInk} colors={[c.accent]} /> : undefined;
  if (band) {
    return (
      <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: bottom }} keyboardShouldPersistTaps="handled" refreshControl={refresh}>
        {/* iOS'da pastga tortilganda tasma ustida oq bo'shliq ko'rinmasin */}
        <View style={{ position: 'absolute', top: -1000, left: 0, right: 0, height: 1000, backgroundColor: c.shell }} />
        {band}
        <View style={{ padding: 16, paddingTop: 20, gap }}>{children}</View>
      </ScrollView>
    );
  }
  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingTop: safeTop ? insets.top + 8 : 16, gap, paddingBottom: bottom }}
      keyboardShouldPersistTaps="handled"
      stickyHeaderIndices={sticky ? [0] : undefined}
      refreshControl={refresh}>
      {children}
    </ScrollView>
  );
}

// Sahifalangan ro'yxat oxirida keyingi sahifa tugmasi (usePaged). Keyingi sahifa bo'lmasa hech narsa ko'rinmaydi
export function LoadMore({ onPress, loading, error }: { onPress: (() => void) | null; loading?: boolean; error?: string | null }) {
  if (!onPress) return null;
  return (
    <View style={{ gap: 8 }}>
      {error && <Banner tone="danger">{error}</Banner>}
      <Button title={t("Yana ko'rsatish")} icon="chevron-down" kind="ghost" onPress={onPress} loading={loading} />
    </View>
  );
}

// Yopishqoq sarlavha foni: ostidan o'tayotgan ro'yxat ko'rinmasin (ekran chekkasigacha)
export function StickyBar({ children, gap = 8 }: { children: React.ReactNode; gap?: number }) {
  const c = usePalette();
  return <View style={{ backgroundColor: c.bg, marginHorizontal: -16, paddingHorizontal: 16, marginTop: -16, paddingTop: 16, paddingBottom: 4, gap }}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, minHeight: 28, gap: 12 }}>
      <T size="h2" accessibilityRole="header" style={{ flexShrink: 1 }}>
        {children}
      </T>
      {right}
    </View>
  );
}

// Holat belgisi: yumshoq fon, rangli matn
export function Badge({ label, tone = 'hint' }: { label: string; tone?: Tone }) {
  const c = usePalette();
  return (
    <View style={{ borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: softOf(c, tone), alignSelf: 'flex-start' }}>
      <Text style={{ color: toneColor(c, tone), fontSize: 12, lineHeight: 16, fontFamily: FONT.textSemi }}>{label}</Text>
    </View>
  );
}

export const ORDER_TONE: Record<OrderStatus, Tone> = {
  SENT: 'accent',
  ACCEPTED: 'info',
  IN_DELIVERY: 'warn',
  DELIVERED: 'ok',
  REJECTED: 'danger',
  CANCELLED: 'hint',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge label={statusLabel(status)} tone={ORDER_TONE[status]} />;
}

// Buyurtma yo'li: to'rt bo'lakli abr chizig'i, har doim bir joyda va bir o'lchamda. O'tilgan bo'laklar indigo,
// joriy bo'lak malina bo'yoq bilan yarim bo'yalgan (abr cheti); vaqt ma'lum bo'lsa har bosqich ostida.
// Holat ekran ochiq turganda o'zgarsa, yangi joriy bo'lak bo'yog'i yoyilib keladi
const STEPS: OrderStatus[] = ['SENT', 'ACCEPTED', 'IN_DELIVERY', 'DELIVERED'];
const stepTime = (s: OrderStatus, times: StepTimes) =>
  s === 'SENT' ? times.createdAt : s === 'ACCEPTED' ? times.acceptedAt : s === 'IN_DELIVERY' ? times.dispatchedAt : times.deliveredAt;

export function StatusSteps({ status, times }: { status: OrderStatus; times?: StepTimes }) {
  const c = usePalette();
  // Oldingi holat (React'ning "oldingi render qiymati" usuli): o'zgarsa, yangi joriy bo'lak bo'yog'i yoyilib keladi
  const [seen, setSeen] = useState(status);
  const [changed, setChanged] = useState(false);
  if (seen !== status) {
    setSeen(status);
    setChanged(true);
  }
  if (status === 'REJECTED' || status === 'CANCELLED') return <StatusBadge status={status} />;
  const at = STEPS.indexOf(status);
  const done = status === 'DELIVERED';
  return (
    <View style={{ gap: 8 }} accessible accessibilityLabel={t('Holat: {status}', { status: statusLabel(status) })}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {STEPS.map((s, i) =>
          i < at || done ? (
            <View key={s} style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: c.accent }} />
          ) : i === at ? (
            <View key={s} style={{ flex: 1 }}>
              <AbrBar key={status} value={0.6} dye={c.current} track={c.border} height={10} animateIn={changed} />
            </View>
          ) : (
            <View key={s} style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: c.border }} />
          ),
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {STEPS.map((s, i) => {
          const time = times && i <= at ? stepTime(s, times) : null;
          const now = i === at;
          return (
            <View key={s} style={{ flex: 1, gap: 1 }}>
              <Text numberOfLines={1} style={{ fontSize: 12, lineHeight: 16, fontFamily: now ? FONT.textBold : FONT.textMedium, color: now ? (done ? c.ok : c.current) : c.hint }}>
                {statusLabel(s)}
              </Text>
              {time ? <Text style={{ fontSize: 11, lineHeight: 14, fontFamily: FONT.text, color: c.hint, fontVariant: ['tabular-nums'] }}>{formatStepTime(time)}</Text> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function Banner({ children, tone = 'warn', icon }: { children: React.ReactNode; tone?: Tone; icon?: IconName }) {
  const c = usePalette();
  const name: IconName = icon ?? (tone === 'danger' || tone === 'warn' ? 'alert-circle-outline' : tone === 'ok' ? 'checkmark-circle-outline' : 'information-circle-outline');
  return (
    <View style={{ borderRadius: R.md, padding: 12, backgroundColor: softOf(c, tone), flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <Ionicons name={name} size={20} color={toneColor(c, tone)} />
      <Text style={{ flex: 1, color: toneColor(c, tone), fontSize: 14, lineHeight: 20, fontFamily: FONT.textMedium }}>{children}</Text>
    </View>
  );
}

// Holat bo'yicha filtr: gorizontal chiplar
export function Segmented<V extends string>({ value, options, onChange }: { value: V; options: { value: V; label: string }[]; onChange: (v: V) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {options.map((o) => (
        <Chip key={o.value} label={o.label} active={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </ScrollView>
  );
}

export function Row({ label, value, tone }: { label: string; value: React.ReactNode; tone?: Tone }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, minHeight: 22, alignItems: 'center' }}>
      <T size="small" tone="hint" style={{ flexShrink: 1 }}>
        {label}
      </T>
      <T size="small" tone={tone} num style={{ flexShrink: 1, textAlign: 'right', fontWeight: '500' }}>
        {value}
      </T>
    </View>
  );
}

// Bitta chiziq qalinligi: ajratgichlar hammasi bir xil ingichka
export function Divider() {
  const c = usePalette();
  return <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: c.border }} />;
}

export function Empty({ children, icon = 'file-tray-outline', action }: { children: React.ReactNode; icon?: IconName; action?: React.ReactNode }) {
  const c = usePalette();
  return (
    <View style={{ alignItems: 'center', padding: 32, gap: 12 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={26} color={c.accentInk} />
      </View>
      <T size="small" tone="hint" style={{ textAlign: 'center', maxWidth: 280 }}>
        {children}
      </T>
      {action}
    </View>
  );
}

// Bosiladigan karta (ro'yxat elementi)
export function PressCard({ onPress, children, style }: { onPress: () => void; children: React.ReactNode; style?: ViewProps['style'] }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] })}>
      <Card style={[{ gap: 6 }, style]}>{children}</Card>
    </Pressable>
  );
}

// Suzuvchi savat tugmasi (indigo): soni o'zgarganda yumshoq sakraydi
export function CartBar({ label, sub, total, onPress, disabled }: { label: string; sub?: string | null; total: number; onPress: () => void; disabled?: boolean }) {
  const c = usePalette();
  const anim = useBump(label);
  return (
    <Animated.View style={[{ position: 'absolute', left: 16, right: 16, bottom: 16 }, anim]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        android_ripple={{ color: rippleColor(c, true) }}
        style={({ pressed }) => ({
          minHeight: 60,
          borderRadius: R.lg,
          backgroundColor: c.accent,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: disabled ? 0.5 : pressed && !ANDROID ? 0.9 : 1,
          shadowColor: c.accent,
          shadowOpacity: 0.3,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingVertical: 8 }}>
          <Ionicons name="cart-outline" size={22} color={c.accentText} />
          <View style={{ flexShrink: 1 }}>
            <Text style={{ color: c.accentText, fontSize: 16, fontFamily: FONT.textSemi }}>{label}</Text>
            {sub ? (
              <Text style={{ color: c.shellHint, fontSize: 12, fontFamily: FONT.text, fontVariant: ['tabular-nums'] }} numberOfLines={1}>
                {sub}
              </Text>
            ) : null}
          </View>
        </View>
        <Text style={{ color: c.accentText, fontSize: 15, fontFamily: FONT.display, fontVariant: ['tabular-nums'], flexShrink: 0, marginLeft: 12 }} numberOfLines={1}>
          {formatSom(total)}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// Ro'yxat qatori: belgi, matn, o'ng tomonda son yoki qiymat, strelka
export function ListRow({
  icon,
  pic,
  title,
  sub,
  right,
  tone = 'accent',
  onPress,
  muted,
}: {
  icon: IconName;
  // Tashkilot yoki odam rasmi: berilsa belgi o'rnida turadi (rasm bo'lmasa bo'yoq plitkasi)
  pic?: { uri: string | null; name: string; shape?: 'tile' | 'circle' };
  title: string;
  sub?: string;
  right?: React.ReactNode;
  tone?: Tone;
  onPress?: () => void;
  muted?: boolean;
}) {
  const c = usePalette();
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: TOUCH, opacity: muted ? 0.6 : 1 }}>
      {pic ? (
        <Pic uri={pic.uri} name={pic.name} size={40} shape={pic.shape} />
      ) : (
        <View style={{ width: 40, height: 40, borderRadius: R.sm, backgroundColor: softOf(c, muted ? 'hint' : tone), alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={20} color={muted ? c.hint : toneColor(c, tone)} />
        </View>
      )}
      <View style={{ flex: 1, gap: 1 }}>
        <T style={{ fontWeight: '500' }} numberOfLines={2}>
          {title}
        </T>
        {sub ? (
          <T size="small" tone="hint" num numberOfLines={1}>
            {sub}
          </T>
        ) : null}
      </View>
      {right}
      {onPress && <Ionicons name="chevron-forward" size={18} color={c.hint} />}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} android_ripple={{ color: rippleColor(c) }} style={({ pressed }) => ({ opacity: pressed && !ANDROID ? 0.7 : 1 })}>
      {body}
    </Pressable>
  );
}

// Son belgisi (vazifalar ro'yxatida)
export function Count({ n, tone = 'accent' }: { n: number; tone?: Tone }) {
  const c = usePalette();
  if (n <= 0) return null;
  return (
    <View style={{ minWidth: 28, height: 28, borderRadius: 14, paddingHorizontal: 8, backgroundColor: tone === 'danger' ? c.danger : c.accent, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: c.accentText, fontSize: 14, fontFamily: FONT.textBold, fontVariant: ['tabular-nums'] }}>{n}</Text>
    </View>
  );
}
