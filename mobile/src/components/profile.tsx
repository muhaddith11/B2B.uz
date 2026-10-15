import { View } from 'react-native';

import { askSignOut } from '@/components/account-links';
import { PicEdit } from '@/components/pic-edit';
import { Button, Card, T } from '@/components/ui';
import { useSession } from '@/context/session';
import { t } from '@/lib/i18n';

// Profil: o'z rasmi (avatar), ism, rol yoki telefon va chiqish. Har uch rolning bosh sahifasi pastida
export function ProfileCard({ name, sub, avatarUrl, onAvatar }: { name: string; sub: string; avatarUrl: string | null; onAvatar: (url: string | null) => void }) {
  const { signOut } = useSession();
  return (
    <Card style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <PicEdit uri={avatarUrl} name={name} shape="circle" size={56} label={t('Profil rasmi')} path="/api/me/avatar" field="avatarUrl" onChange={onAvatar} />
        <View style={{ flex: 1, gap: 2 }}>
          <T bold numberOfLines={1}>
            {name}
          </T>
          <T size="small" tone="hint" numberOfLines={2}>
            {sub}
          </T>
        </View>
      </View>
      <Button title={t('Chiqish')} icon="log-out-outline" kind="secondary" compact onPress={() => askSignOut(signOut)} />
    </Card>
  );
}
