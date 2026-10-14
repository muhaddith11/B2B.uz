import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Teginish javobi: qadam tugmasi, tanlov, muhim amal natijasi. Web'da yo'q; xato bo'lsa jim o'tadi.
const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

export const haptic = {
  // Miqdor o'zgardi, chip tanlandi
  tick() {
    if (enabled) Haptics.selectionAsync().catch(() => {});
  },
  // Buyurtma yuborildi, to'lov yozildi, buyurtma qabul qilindi
  success() {
    if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  // Amal bajarilmadi
  error() {
    if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
};
