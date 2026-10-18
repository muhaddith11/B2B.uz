import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { API_URL } from '@/lib/api';
import { buildReport, createDeduper, type CrashReport } from '@/lib/crash-report';
import { secure } from '@/lib/storage';

// Kutilmagan xatoni serverga yuborish (server uni Sentry va logga yozadi). Yuborilmasa jim: xato hisoboti ilovani to'xtatmasin
const firstTime = createDeduper();

export function reportCrash(error: unknown, opts: Pick<CrashReport, 'screen' | 'fatal'> = {}): void {
  const report = buildReport(error, {
    ...opts,
    platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web',
    appVersion: Constants.expoConfig?.version,
  });
  if (!firstTime(report)) return;
  void (async () => {
    try {
      const saved = await secure.get('session');
      const token = saved ? (JSON.parse(saved) as { token?: string }).token : undefined;
      await fetch(`${API_URL}/api/client-errors`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(report),
      });
    } catch {
      /* tarmoq yo'q: hisobot yo'qoladi, ilova ishlayveradi */
    }
  })();
}

type GlobalHandler = (error: unknown, isFatal?: boolean) => void;
type ErrorUtilsLike = { getGlobalHandler: () => GlobalHandler; setGlobalHandler: (h: GlobalHandler) => void };

// Render'dan tashqaridagi xatolar (tugma bosilganda, taymerda): React Native'ning global ushlagichi orqali
export function installCrashReporter(): void {
  const utils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!utils) return;
  const previous = utils.getGlobalHandler();
  utils.setGlobalHandler((error, isFatal) => {
    reportCrash(error, { fatal: !!isFatal, screen: 'global' });
    previous(error, isFatal);
  });
}
