import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Kirish tokeni: telefonda shifrlangan xotirada. SecureStore web'da yo'q, brauzerda sinovda localStorage.
export const secure = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS !== 'web') return SecureStore.getItemAsync(key);
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS !== 'web') return SecureStore.setItemAsync(key, value);
    try {
      localStorage.setItem(key, value);
    } catch {
      /* saqlanmasa, keyingi safar qayta kiriladi */
    }
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS !== 'web') return SecureStore.deleteItemAsync(key);
    try {
      localStorage.removeItem(key);
    } catch {
      /* yo'q bo'lsa ham mayli */
    }
  },
};

// Maxfiy bo'lmagan ma'lumotlar (savat)
export const kv = {
  get: (key: string) => AsyncStorage.getItem(key).catch(() => null),
  set: (key: string, value: string) => AsyncStorage.setItem(key, value).catch(() => {}),
  remove: (key: string) => AsyncStorage.removeItem(key).catch(() => {}),
};
