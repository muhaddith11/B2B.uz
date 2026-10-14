import { Alert, Platform } from 'react-native';

import { t } from './i18n';

// Qaytarib bo'lmaydigan amaldan oldin so'rash (bekor qilish, topshirish, bloklash, chiqish).
// Telefonda tizim oynasi, web'da brauzerning confirm oynasi.
export function confirm({ title, message, action, destructive = true }: { title: string; message?: string; action: string; destructive?: boolean }): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(message ? `${title}\n\n${message}` : title));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: t('Ortga'), style: 'cancel', onPress: () => resolve(false) },
        { text: action, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
