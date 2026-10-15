import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { t } from './i18n';

// Rasm: kameradan yoki galereyadan, berilgan nisbatda qirqib olinadi (tovar 5:4, logo va avatar 1:1).
// Natija: yuklash uchun tayyor FormData ("image" maydoni), bekor qilinsa null.
export async function pickImage(fromCamera: boolean, aspect: [number, number] = [1, 1]): Promise<FormData | null> {
  const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error(fromCamera ? t('Kameraga ruxsat berilmagan') : t('Galereyaga ruxsat berilmagan'));
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect };
  const res = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  const a = res.canceled ? null : res.assets?.[0];
  if (!a) return null;
  // HEIC server qabul qilmaydi: kesilgan rasm odatda JPEG bo'ladi
  const type = a.mimeType && a.mimeType !== 'image/heic' ? a.mimeType : 'image/jpeg';
  const name = `rasm.${type.split('/')[1] ?? 'jpg'}`;
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(a.uri)).blob();
    form.append('image', blob, name);
  } else {
    // React Native FormData fayl uchun { uri, name, type } qabul qiladi
    form.append('image', { uri: a.uri, name, type } as unknown as Blob);
  }
  return form;
}

// Tovar rasmi: katalog kartochkasi nisbatida (5:4)
export function pickProductImage(fromCamera: boolean): Promise<FormData | null> {
  return pickImage(fromCamera, [5, 4]);
}
