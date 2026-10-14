import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, View } from 'react-native';

import { Chip, T } from '@/components/ui';
import { useLanguage } from '@/context/language';
import { API_URL } from '@/lib/api';
import { confirm } from '@/lib/confirm';
import { getLang, t, type Lang } from '@/lib/i18n';

// Maxfiylik siyosati saytda turadi (do'konlarga ham shu manzil beriladi); ruscha matni ?lang=ru da
export function openPrivacyPolicy() {
  WebBrowser.openBrowserAsync(`${API_URL}/maxfiylik${getLang() === 'ru' ? '?lang=ru' : ''}`);
}

// Chiqishdan oldin so'raladi: qayta kirish uchun SMS kod kerak bo'ladi
export async function askSignOut(signOut: () => Promise<void>) {
  const ok = await confirm({ title: t('Hisobdan chiqasizmi?'), message: t("Qayta kirish uchun SMS kod kerak bo'ladi."), action: t('Chiqish') });
  if (ok) await signOut();
}

// Til tanlash: tugmalar har doim o'z tilida yoziladi, shunda tilni bilmagan odam ham topadi
const LANGS: { value: Lang; label: string }[] = [
  { value: 'uz', label: "O'zbekcha" },
  { value: 'ru', label: 'Русский' },
];

export function LanguageSwitch() {
  const { lang, setLang } = useLanguage();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={t('Til')}>
      {LANGS.map((l) => (
        <Chip key={l.value} label={l.label} active={lang === l.value} onPress={() => setLang(l.value)} />
      ))}
    </View>
  );
}

// Profil pastidagi havolalar: til, maxfiylik siyosati va hisobni o'chirish (App Store, Google Play talabi)
export function AccountLinks() {
  return (
    <View style={{ gap: 16, marginTop: 16 }}>
      <LanguageSwitch />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20 }}>
        <Pressable accessibilityRole="link" onPress={openPrivacyPolicy} hitSlop={8}>
          <T size="small" tone="hint">
            {t('Maxfiylik siyosati')}
          </T>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/delete-account')} hitSlop={8}>
          <T size="small" tone="danger">
            {t("Hisobni o'chirish")}
          </T>
        </Pressable>
      </View>
    </View>
  );
}
