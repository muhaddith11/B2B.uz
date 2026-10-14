import { router } from 'expo-router';
import { View } from 'react-native';

import { usePalette } from '@/constants/theme';
import { t } from '@/lib/i18n';

import { Button, T } from './ui';

// Ro'yxatdan o'tish ekrani raqam tasdiqlanmasdan ochilsa (masalan, ilova qayta ishga tushganda)
export function NeedPhone() {
  const c = usePalette();
  return (
    <View style={{ flex: 1, padding: 24, gap: 12, backgroundColor: c.bg }}>
      <T>{t('Avval telefon raqamingizni tasdiqlang.')}</T>
      <Button title={t('Kirish sahifasiga')} onPress={() => router.replace('/login')} />
    </View>
  );
}
