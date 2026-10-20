import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { AppState, Linking, Modal, Platform, View } from 'react-native';

import { Button, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { request } from '@/lib/api';
import { t } from '@/lib/i18n';
import { isOutdated, shouldRecheck } from '@/lib/version';

type VersionInfo = { minVersion: string; storeUrl: { ios: string; android: string } };

// Shu build'ning versiyasi (app.json "version"). OTA update faqat aynan shu versiyali build'ga tushadi
// (runtimeVersion: appVersion), shuning uchun update kelgandan keyin ham bu qiymat to'g'ri
const APP_VERSION = Constants.expoConfig?.version;

// Ilova ochilganda va orqa fondan qaytganda:
// - serverdan eng kichik ishlaydigan versiyani so'raydi; bu ilova eskiroq bo'lsa, yopib bo'lmaydigan "Yangilash" oynasi
// - OTA update bo'lsa, fonda yuklab oladi: keyingi ochilishda ishga tushadi (ishlab turgan ekran to'satdan qayta yuklanmaydi).
//   Sovuq ochilishda buni expo-updates o'zi qiladi (app.json updates, odatiy ON_LOAD)
// Internet bo'lmasa yoki server javob bermasa, hech narsa to'xtatilmaydi
export function UpdateGate() {
  const [storeUrl, setStoreUrl] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let lastCheck = 0;

    const checkVersion = async () => {
      try {
        const info = await request<VersionInfo>('/api/app/version');
        setStoreUrl(isOutdated(APP_VERSION, info.minVersion) ? (Platform.OS === 'ios' ? info.storeUrl.ios : info.storeUrl.android) : null);
      } catch {
        // tarmoq xatosi: keyingi safar tekshiriladi
      }
    };

    const fetchUpdate = async () => {
      if (__DEV__ || !Updates.isEnabled) return;
      try {
        const res = await Updates.checkForUpdateAsync();
        if (res.isAvailable) await Updates.fetchUpdateAsync();
      } catch {
        // update serveri javob bermadi: keyingi ochilishda expo-updates o'zi qayta urinadi
      }
    };

    lastCheck = Date.now();
    checkVersion();
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !shouldRecheck(lastCheck)) return;
      lastCheck = Date.now();
      checkVersion();
      fetchUpdate();
    });
    return () => sub.remove();
  }, []);

  if (!storeUrl) return null;
  return <UpdateRequired storeUrl={storeUrl} />;
}

function UpdateRequired({ storeUrl }: { storeUrl: string }) {
  const c = usePalette();
  // onRequestClose bo'sh: Android "orqaga" tugmasi bilan yopilmaydi
  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: c.bg, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-up-circle-outline" size={34} color={c.accentInk} />
        </View>
        <T size="h2" style={{ textAlign: 'center' }}>
          {t('Yangi versiya chiqdi')}
        </T>
        <T tone="hint" style={{ textAlign: 'center', maxWidth: 300 }}>
          {t("Ilovaning bu versiyasi endi ishlamaydi. Davom etish uchun uni do'kondan yangilang")}
        </T>
        <Button title={t('Yangilash')} icon="download-outline" onPress={() => Linking.openURL(storeUrl)} style={{ alignSelf: 'stretch' }} />
      </View>
    </Modal>
  );
}
