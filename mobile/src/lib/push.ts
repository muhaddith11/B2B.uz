import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { kv } from './storage';

// Shu qurilmaning push tokeni: chiqishda serverga aytiladi, bu telefonga hisob bildirishnomalari boshqa kelmaydi
const PUSH_TOKEN_KEY = 'push_token';
export const savedPushToken = () => kv.get(PUSH_TOKEN_KEY);

// Push bildirishnomalar: faqat haqiqiy qurilmada va EAS loyihasi ulangan (eas init) development/production build'da.
// Expo Go (Android) va web'da push yo'q: jim o'tkazib yuboriladi, ilova odatdagidek ishlaydi.

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

export async function registerForPush(send: (token: string) => Promise<unknown>): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', { name: 'Asosiy', importance: Notifications.AndroidImportance.HIGH });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    await kv.set(PUSH_TOKEN_KEY, data);
    await send(data);
  } catch (e) {
    console.warn('push:', e);
  }
}

// Bildirishnoma bosilganda ochiladigan sahifa (server data.url yuboradi)
export function onNotificationTap(open: (url: string) => void): () => void {
  if (Platform.OS === 'web') return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const url = response.notification.request.content.data?.url;
    if (typeof url === 'string') open(url);
  });
  return () => sub.remove();
}
