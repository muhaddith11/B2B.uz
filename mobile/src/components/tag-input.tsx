import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { usePalette } from '@/constants/theme';

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
      <T size="small" tone="hint">
        {label}
      </T>
      {value.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {value.map((v) => (
            <Pressable
              key={v}
              onPress={() => onChange(value.filter((x) => x !== v))}
              accessibilityLabel={`${v}ni olib tashlash`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.accent, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ color: c.accentText, fontSize: 14 }}>{v}</Text>
              <Text style={{ color: c.accentText, fontSize: 14 }}>×</Text>
            </Pressable>
          ))}
        </View>
      )}
      <SearchInput value={text} onChangeText={setText} placeholder={placeholder ?? "Yozing va qo'shing"} onSubmitEditing={() => add(text)} returnKeyType="done" />
      {text.trim().length >= 2 && (
        <Pressable onPress={() => add(text)}>
          <T size="small" tone="accent">
            + "{text.trim()}" ni qo'shish
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
