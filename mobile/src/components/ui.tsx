import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type TextProps,
  type ViewProps,
} from 'react-native';

import { usePalette, type Palette } from '@/constants/theme';

type Tone = 'text' | 'hint' | 'accent' | 'danger' | 'ok';
type Size = 'title' | 'h2' | 'body' | 'small' | 'tiny';

const SIZES: Record<Size, { fontSize: number; lineHeight: number; fontWeight: '400' | '500' | '600' | '700' }> = {
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  h2: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  tiny: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
};

export function T({
  size = 'body',
  tone = 'text',
  bold,
  style,
  ...rest
}: TextProps & { size?: Size; tone?: Tone; bold?: boolean }) {
  const c = usePalette();
  return <Text style={[SIZES[size], { color: c[tone] }, bold && { fontWeight: '600' }, style]} {...rest} />;
}

export function Card({ style, ...rest }: ViewProps) {
  const c = usePalette();
  return <View style={[{ backgroundColor: c.card, borderRadius: 16, padding: 14 }, style]} {...rest} />;
}

type ButtonKind = 'primary' | 'secondary' | 'danger';

function buttonColors(c: Palette, kind: ButtonKind) {
  if (kind === 'primary') return { bg: c.accent, fg: c.accentText, border: c.accent };
  if (kind === 'danger') return { bg: 'transparent', fg: c.danger, border: c.danger };
  return { bg: c.card, fg: c.accent, border: c.card };
}

export function Button({
  title,
  kind = 'primary',
  loading,
  disabled,
  compact,
  style,
  ...rest
}: PressableProps & { title: string; kind?: ButtonKind; loading?: boolean; compact?: boolean; style?: ViewProps['style'] }) {
  const c = usePalette();
  const col = buttonColors(c, kind);
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={off}
      style={({ pressed }) => [
        {
          backgroundColor: col.bg,
          borderColor: col.border,
          borderWidth: 1,
          borderRadius: 12,
          paddingVertical: compact ? 8 : 13,
          paddingHorizontal: compact ? 14 : 16,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: off ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={col.fg} />
      ) : (
        <Text style={{ color: col.fg, fontSize: compact ? 14 : 16, fontWeight: '600' }}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({ label, style, ...rest }: TextInputProps & { label: string }) {
  const c = usePalette();
  return (
    <View style={{ gap: 4 }}>
      <T size="small" tone="hint">
        {label}
      </T>
      <TextInput
        placeholderTextColor={c.hint}
        style={[{ backgroundColor: c.card, color: c.text, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 }, style]}
        {...rest}
      />
    </View>
  );
}

export function SearchInput(props: TextInputProps) {
  const c = usePalette();
  return (
    <TextInput
      placeholderTextColor={c.hint}
      autoCorrect={false}
      style={{ backgroundColor: c.card, color: c.text, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 }}
      {...props}
    />
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const c = usePalette();
  return (
    <Pressable
      onPress={onPress}
      style={{ backgroundColor: active ? c.accent : c.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
      <Text style={{ color: active ? c.accentText : c.text, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

// Miqdor yashik bilan tanlanadi, savatda esa dona saqlanadi
export function QtyStepper({ packs, onChange }: { packs: number; onChange: (packs: number) => void }) {
  const c = usePalette();
  if (packs === 0) return <Button title="Qo'shish" compact onPress={() => onChange(1)} />;
  const btn = { width: 38, height: 38, borderRadius: 10, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' } as const;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Pressable accessibilityLabel="Kamaytirish" onPress={() => onChange(packs - 1)} style={btn}>
        <Text style={{ color: c.text, fontSize: 20 }}>−</Text>
      </Pressable>
      <T size="small" bold style={{ minWidth: 64, textAlign: 'center' }}>
        {packs} yashik
      </T>
      <Pressable accessibilityLabel="Ko'paytirish" onPress={() => onChange(packs + 1)} style={btn}>
        <Text style={{ color: c.text, fontSize: 20 }}>+</Text>
      </Pressable>
    </View>
  );
}

export function Loading() {
  const c = usePalette();
  return (
    <View style={{ padding: 32, alignItems: 'center' }}>
      <ActivityIndicator color={c.accent} />
    </View>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <T size="small" tone="danger" style={{ padding: 16 }}>
      {children}
    </T>
  );
}

// Pastga tortib yangilanadigan ekran
export function Screen({
  children,
  refreshing,
  onRefresh,
  gap = 12,
}: {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  gap?: number;
}) {
  const c = usePalette();
  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, gap, paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}>
      {children}
    </ScrollView>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
      <T size="h2">{children}</T>
      {right}
    </View>
  );
}

export function Badge({ label, tone = 'hint' }: { label: string; tone?: 'hint' | 'accent' | 'ok' | 'danger' | 'warn' }) {
  const c = usePalette();
  const color = tone === 'warn' ? '#b45309' : c[tone];
  return (
    <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: color, alignSelf: 'flex-start' }}>
      <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

export function Banner({ children, tone = 'warn' }: { children: React.ReactNode; tone?: 'warn' | 'accent' | 'danger' }) {
  const c = usePalette();
  const color = tone === 'warn' ? '#b45309' : c[tone];
  return (
    <View style={{ borderRadius: 12, padding: 12, borderWidth: 1, borderColor: color }}>
      <Text style={{ color, fontSize: 14, lineHeight: 20 }}>{children}</Text>
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
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <T size="small" tone="hint">
        {label}
      </T>
      <T size="small" tone={tone} style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </T>
    </View>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <T size="small" tone="hint" style={{ textAlign: 'center', padding: 24 }}>
      {children}
    </T>
  );
}

// Bosiladigan karta (ro'yxat elementi)
export function PressCard({ onPress, children, style }: { onPress: () => void; children: React.ReactNode; style?: ViewProps['style'] }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <Card style={[{ gap: 4 }, style]}>{children}</Card>
    </Pressable>
  );
}
