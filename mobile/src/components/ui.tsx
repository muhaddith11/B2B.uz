import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
  type PressableProps,
  type TextInputProps,
  type TextProps,
  type ViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { R, softOf, TOUCH, usePalette, type Palette, type Tone } from '@/constants/theme';
import { formatAmount } from '@/lib/money';
import { STATUS_LABEL, type OrderStatus } from '@/lib/types';

export type { Tone };
type IconName = keyof typeof Ionicons.glyphMap;
type Size = 'display' | 'title' | 'h2' | 'body' | 'small' | 'tiny';

const SIZES: Record<Size, { fontSize: number; lineHeight: number; fontWeight: '400' | '500' | '600' | '700' }> = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  h2: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  tiny: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
};

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
  return (
    <Text
      style={[SIZES[size], { color: toneColor(c, tone) }, bold && { fontWeight: size === 'display' || size === 'title' ? '700' : '600' }, num && { fontVariant: ['tabular-nums'] }, style]}
      {...rest}
    />
  );
}

// Summa: raqam katta, "so'm" kichikroq
export function Money({ value, size = 'body', tone = 'text', bold = true }: { value: number; size?: Size; tone?: Tone; bold?: boolean }) {
  const small: Size = size === 'display' || size === 'title' ? 'body' : size === 'h2' || size === 'body' ? 'small' : 'tiny';
  return (
    <T size={size} tone={tone} bold={bold} num style={{ flexShrink: 0 }}>
      {formatAmount(value)}
      <T size={small} tone={tone} style={{ fontWeight: '500' }}>
        {' '}so'm
      </T>
    </T>
  );
}

// Oq yuza: yorug' sxemada yumshoq soya, qorong'ida chegara
export function Card({ style, ...rest }: ViewProps) {
  const c = usePalette();
  const dark = useColorScheme() === 'dark';
  return (
    <View
      style={[
        { backgroundColor: c.card, borderRadius: R.lg, padding: 16 },
        dark
          ? { borderWidth: 1, borderColor: c.border }
          : { shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
        style,
      ]}
      {...rest}
    />
  );
}

type ButtonKind = 'primary' | 'secondary' | 'danger' | 'ghost';

function buttonColors(c: Palette, kind: ButtonKind) {
  if (kind === 'primary') return { bg: c.accent, fg: c.accentText };
  if (kind === 'danger') return { bg: c.dangerSoft, fg: c.danger };
  if (kind === 'ghost') return { bg: 'transparent', fg: c.accentInk };
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
      style={({ pressed }) => [
        {
          backgroundColor: col.bg,
          borderRadius: R.md,
          minHeight: compact ? 40 : 52,
          paddingHorizontal: compact ? 14 : 18,
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: off ? 0.45 : pressed ? 0.82 : 1,
        },
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={col.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={compact ? 18 : 20} color={col.fg} />}
          <Text style={{ color: col.fg, fontSize: compact ? 14 : 16, fontWeight: '600' }} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, tone = 'text' }: { icon: IconName; label: string; onPress: () => void; tone?: Tone }) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.field : 'transparent' })}>
      <Ionicons name={icon} size={22} color={toneColor(c, tone)} />
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
        selectionColor={c.accent}
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
            borderWidth: 1.5,
            borderColor: error ? c.danger : focus ? c.accent : 'transparent',
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
        selectionColor={c.accent}
        autoCorrect={false}
        returnKeyType="search"
        style={{ flex: 1, color: c.text, paddingHorizontal: 8, paddingVertical: 10, fontSize: 16 }}
        {...props}
      />
      {props.value ? (
        <Pressable accessibilityLabel="Tozalash" hitSlop={8} onPress={() => props.onChangeText?.('')}>
          <Ionicons name="close-circle" size={18} color={c.hint} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Chip({ label, active, onPress, count }: { label: string; active: boolean; onPress: () => void; count?: number }) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: active ? c.accent : c.card,
        borderColor: active ? c.accent : c.border,
        borderWidth: 1,
        borderRadius: R.pill,
        paddingHorizontal: 14,
        minHeight: 36,
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
        opacity: pressed ? 0.85 : 1,
      })}>
      <Text style={{ color: active ? c.accentText : c.text, fontSize: 14, fontWeight: '500' }}>{label}</Text>
      {count !== undefined && <Text style={{ color: active ? c.accentText : c.hint, fontSize: 13, fontVariant: ['tabular-nums'] }}>{count}</Text>}
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

// Yashik soni. 0 bo'lsa dumaloq "+", bosilganda o'z joyida "− 2 +" ga aylanadi (savatda dona saqlanadi)
export function QtyStepper({ packs, onChange, label = true, full }: { packs: number; onChange: (packs: number) => void; label?: boolean; full?: boolean }) {
  const c = usePalette();
  const bump = useBump(packs);
  if (packs === 0) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Savatga qo'shish"
        onPress={() => onChange(1)}
        hitSlop={6}
        style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
        <Ionicons name="add" size={26} color={c.accentText} />
      </Pressable>
    );
  }
  const side = { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' } as const;
  return (
    <Animated.View
      style={[bump,{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.accentSoft, borderRadius: 22, height: 44 }, full && { flex: 1, justifyContent: 'space-between' }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={packs === 1 ? 'Savatdan olib tashlash' : 'Kamaytirish'} onPress={() => onChange(packs - 1)} style={side}>
        <Ionicons name={packs === 1 ? 'trash-outline' : 'remove'} size={20} color={c.accentInk} />
      </Pressable>
      <T bold num tone="accent" style={{ minWidth: label ? 64 : 24, textAlign: 'center' }} accessibilityLabel={`${packs} yashik`}>
        {packs}
        {label ? ' yashik' : ''}
      </T>
      <Pressable accessibilityRole="button" accessibilityLabel="Ko'paytirish" onPress={() => onChange(packs + 1)} style={side}>
        <Ionicons name="add" size={22} color={c.accentInk} />
      </Pressable>
    </Animated.View>
  );
}

// Tovar rasmi; rasm bo'lmasa nomning bosh harfi yumshoq fonda
export function Thumb({ uri, name, size = 56 }: { uri?: string | null; name: string; size?: number | '100%' }) {
  const c = usePalette();
  const box = { width: size, height: size === '100%' ? undefined : size, aspectRatio: size === '100%' ? 1.25 : undefined, borderRadius: R.md, backgroundColor: c.accentSoft } as const;
  if (uri) return <Image source={{ uri }} style={box} contentFit="cover" transition={150} />;
  return (
    <View style={[box, { alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: c.accentInk, fontSize: typeof size === 'number' ? size * 0.4 : 30, fontWeight: '700', opacity: 0.75 }}>{name.trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export function Loading() {
  const c = usePalette();
  return (
    <View style={{ padding: 40, alignItems: 'center' }}>
      <ActivityIndicator color={c.accent} />
    </View>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ padding: 16 }}>
      <Banner tone="danger">{children}</Banner>
    </View>
  );
}

// Pastga tortib yangilanadigan ekran
export function Screen({
  children,
  refreshing,
  onRefresh,
  gap = 12,
  bottom = 32,
  safeTop,
}: {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  gap?: number;
  bottom?: number;
  // Sarlavhasiz ekran (bosh sahifa): yuqoridan tizim paneli uchun joy
  safeTop?: boolean;
}) {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingTop: safeTop ? insets.top + 8 : 16, gap, paddingBottom: bottom }}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} /> : undefined}>
      {children}
    </ScrollView>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, minHeight: 28 }}>
      <T size="h2">{children}</T>
      {right}
    </View>
  );
}

// Holat belgisi: yumshoq fon, rangli matn
export function Badge({ label, tone = 'hint' }: { label: string; tone?: Tone }) {
  const c = usePalette();
  return (
    <View style={{ borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: softOf(c, tone), alignSelf: 'flex-start' }}>
      <Text style={{ color: toneColor(c, tone), fontSize: 12, lineHeight: 16, fontWeight: '600' }}>{label}</Text>
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
  return <Badge label={STATUS_LABEL[status]} tone={ORDER_TONE[status]} />;
}

// Buyurtma yo'li: to'rt bosqich har doim bir joyda va bir o'lchamda
const STEPS: OrderStatus[] = ['SENT', 'ACCEPTED', 'IN_DELIVERY', 'DELIVERED'];

export function StatusSteps({ status }: { status: OrderStatus }) {
  const c = usePalette();
  if (status === 'REJECTED' || status === 'CANCELLED') return <StatusBadge status={status} />;
  const at = STEPS.indexOf(status);
  return (
    <View style={{ gap: 8 }} accessibilityLabel={`Holat: ${STATUS_LABEL[status]}`}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {STEPS.map((s, i) => (
          <View key={s} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= at ? toneColor(c, ORDER_TONE[status]) : c.border }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {STEPS.map((s, i) => (
          <Text
            key={s}
            numberOfLines={1}
            style={{ flex: 1, fontSize: 12, lineHeight: 16, fontWeight: i === at ? '700' : '500', color: i === at ? toneColor(c, ORDER_TONE[status]) : c.hint }}>
            {STATUS_LABEL[s]}
          </Text>
        ))}
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
      <Text style={{ flex: 1, color: toneColor(c, tone), fontSize: 14, lineHeight: 20, fontWeight: '500' }}>{children}</Text>
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

export function Divider() {
  const c = usePalette();
  return <View style={{ height: 1, backgroundColor: c.border }} />;
}

export function Empty({ children, icon = 'file-tray-outline', action }: { children: React.ReactNode; icon?: IconName; action?: React.ReactNode }) {
  const c = usePalette();
  return (
    <View style={{ alignItems: 'center', padding: 32, gap: 12 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.field, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={26} color={c.hint} />
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

// Suzuvchi savat tugmasi: soni o'zgarganda yumshoq sakraydi
export function CartBar({ label, sub, total, onPress, disabled }: { label: string; sub?: string | null; total: number; onPress: () => void; disabled?: boolean }) {
  const c = usePalette();
  const anim = useBump(label);
  return (
    <Animated.View style={[{ position: 'absolute', left: 16, right: 16, bottom: 16 }, anim]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: 56,
          borderRadius: R.lg,
          backgroundColor: c.accent,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
          shadowColor: c.accent,
          shadowOpacity: 0.3,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingVertical: 8 }}>
          <Ionicons name="cart-outline" size={22} color={c.accentText} />
          <View style={{ flexShrink: 1 }}>
            <Text style={{ color: c.accentText, fontSize: 16, fontWeight: '600' }}>{label}</Text>
            {sub ? <Text style={{ color: c.accentText, fontSize: 12, opacity: 0.9, fontVariant: ['tabular-nums'] }} numberOfLines={1}>{sub}</Text> : null}
          </View>
        </View>
        <Text style={{ color: c.accentText, fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'], flexShrink: 0, marginLeft: 12 }} numberOfLines={1}>
          {formatAmount(total)} so'm
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// Ro'yxat qatori: belgi, matn, o'ng tomonda son yoki qiymat, strelka
export function ListRow({
  icon,
  title,
  sub,
  right,
  tone = 'accent',
  onPress,
  muted,
}: {
  icon: IconName;
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
      <View style={{ width: 40, height: 40, borderRadius: R.sm, backgroundColor: softOf(c, muted ? 'hint' : tone), alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={20} color={muted ? c.hint : toneColor(c, tone)} />
      </View>
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
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
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
      <Text style={{ color: c.accentText, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{n}</Text>
    </View>
  );
}
