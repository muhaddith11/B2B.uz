import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { haptic } from '@/lib/haptics';
import { t } from '@/lib/i18n';
import { pickImage } from '@/lib/product-image';

import { Button, ListRow, Pic, T } from './ui';

function showError(message: string) {
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert(t('Rasm yuklanmadi'), message);
}

// O'zgartiriladigan rasm (avatar, logo, do'kon surati): burchagida kamera belgisi; bosilganda pastki varaq:
// kamera, galereya, olib tashlash. Tizim oynasi Android'da uchtadan ortiq tugma ko'rsatmaydi, shuning uchun o'z varag'imiz
export function PicEdit({
  uri,
  name,
  label,
  path,
  field,
  onChange,
  shape = 'tile',
  size = 56,
  ring,
  canRemove = true,
}: {
  uri: string | null;
  name: string;
  label: string;
  // Yuklash: POST (FormData "image"), olib tashlash: DELETE
  path: string;
  field: 'avatarUrl' | 'logoUrl' | 'imageUrl';
  onChange: (url: string | null) => void;
  shape?: 'tile' | 'circle';
  size?: number;
  ring?: string;
  canRemove?: boolean;
}) {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { api } = useSession();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function choose(fromCamera: boolean) {
    setOpen(false);
    try {
      const form = await pickImage(fromCamera, [1, 1]);
      if (!form) return;
      setBusy(true);
      const res = await api<Partial<Record<typeof field, string>>>(path, { method: 'POST', body: form });
      onChange(res[field] ?? null);
      haptic.success();
    } catch (e) {
      haptic.error();
      showError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setOpen(false);
    setBusy(true);
    try {
      await api(path, { method: 'DELETE' });
      onChange(null);
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const badge = Math.max(22, Math.round(size * 0.36));
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ busy }} disabled={busy} onPress={() => setOpen(true)} hitSlop={4}>
        <Pic uri={uri} name={name} size={size} shape={shape} ring={ring} />
        <View
          style={{
            position: 'absolute',
            right: -3,
            bottom: -3,
            width: badge,
            height: badge,
            borderRadius: badge / 2,
            backgroundColor: c.accent,
            borderWidth: 2,
            borderColor: ring ?? c.card,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="camera" size={Math.round(badge * 0.5)} color="#FFFFFF" />
        </View>
        {busy && (
          <View style={[StyleSheet.absoluteFill, { borderRadius: shape === 'circle' ? size / 2 : Math.round(size * 0.28), backgroundColor: c.overlay, alignItems: 'center', justifyContent: 'center' }]}>
            <ActivityIndicator color="#FFFFFF" />
          </View>
        )}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable style={{ flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' }} onPress={() => setOpen(false)} accessibilityLabel={t('Yopish')}>
          <Pressable style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: insets.bottom + 12, gap: 4 }} onPress={() => {}}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <Pic uri={uri} name={name} size={40} shape={shape} />
              <T size="h2" style={{ flex: 1 }} numberOfLines={2}>
                {label}
              </T>
            </View>
            {Platform.OS !== 'web' && <ListRow icon="camera-outline" title={t('Rasmga olish')} onPress={() => choose(true)} />}
            <ListRow icon="images-outline" title={t('Galereyadan tanlash')} onPress={() => choose(false)} />
            {uri && canRemove && <ListRow icon="trash-outline" tone="danger" title={t('Rasmni olib tashlash')} onPress={remove} />}
            <Button title={t('Bekor qilish')} kind="ghost" onPress={() => setOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
