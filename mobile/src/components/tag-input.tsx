import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { usePalette } from '@/constants/theme';
import { t } from '@/lib/i18n';

import { Chip, SearchInput, T } from './ui';

// Bir nechta qiymat: tayyor variantlardan tanlash yoki o'zi yozib qo'shish (hududlar, toifalar)
export function TagInput({
  label,
  value,
  onChange,
  suggestions = [],
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}) {
  const c = usePalette();
  const [text, setText] = useState('');
  const add = (v: string) => {
    const t = v.trim();
    if (t.length >= 2 && !value.includes(t)) onChange([...value, t]);
    setText('');
  };
  const rest = suggestions.filter((s) => !value.includes(s));

  return (
    <View style={{ gap: 6 }}>
      <T size="small" tone="hint" style={{ fontWeight: '500' }}>
        {label}
      </T>
      {value.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {value.map((v) => (
            <Pressable
              key={v}
              onPress={() => onChange(value.filter((x) => x !== v))}
              accessibilityRole="button"
              accessibilityLabel={t('{v}ni olib tashlash', { v })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.accent, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ color: c.accentText, fontSize: 14 }}>{v}</Text>
              <Text style={{ color: c.accentText, fontSize: 14 }}>×</Text>
            </Pressable>
          ))}
        </View>
      )}
      <SearchInput value={text} onChangeText={setText} placeholder={placeholder ?? t("Yozing va qo'shing")} onSubmitEditing={() => add(text)} returnKeyType="done" />
      {text.trim().length >= 2 && (
        <Pressable accessibilityRole="button" onPress={() => add(text)}>
          <T size="small" tone="accent">
            {t(`+ "{v}" ni qo'shish`, { v: text.trim() })}
          </T>
        </Pressable>
      )}
      {rest.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {rest.map((s) => (
            <Chip key={s} label={`+ ${s}`} active={false} onPress={() => add(s)} />
          ))}
        </View>
      )}
    </View>
  );
}
