import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, View } from 'react-native';

import { T } from '@/components/ui';
import { API_URL } from '@/lib/api';

// Maxfiylik siyosati saytda turadi (do'konlarga ham shu manzil beriladi)
export function openPrivacyPolicy() {
  WebBrowser.openBrowserAsync(`${API_URL}/maxfiylik`);
}

// Profil pastidagi havolalar: maxfiylik siyosati va hisobni o'chirish (App Store, Google Play talabi)
export function AccountLinks() {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 16 }}>
      <Pressable onPress={openPrivacyPolicy} hitSlop={8}>
        <T size="small" tone="hint">
          Maxfiylik siyosati
        </T>
      </Pressable>
      <Pressable onPress={() => router.push('/delete-account')} hitSlop={8}>
        <T size="small" tone="danger">
          Hisobni o'chirish
        </T>
      </Pressable>
    </View>
  );
}
