import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { View } from 'react-native';

import { AccountLinks } from '@/components/account-links';
import { PicEdit } from '@/components/pic-edit';
import { ProfileCard } from '@/components/profile';
import { subscriptionText } from '@/components/subscription';
import { Badge, Card, Divider, ListRow, Pic, Screen, T } from '@/components/ui';
import { useStaff } from '@/context/staff';
import { t, type Key } from '@/lib/i18n';
import { BRANDS_ENABLED } from '@/lib/features';
import { roleLabel } from '@/lib/staff-types';
import type { StaffRole } from '@/lib/types';

type Item = { href: Parameters<typeof router.push>[0]; label: Key; icon: keyof typeof Ionicons.glyphMap; roles: StaffRole[] };

const ITEMS: Item[] = [
  { href: '/staff/requests', label: "Ulanish so'rovlari", icon: 'person-add-outline', roles: ['ADMIN', 'OPERATOR'] },
  { href: '/staff/payments', label: "To'lovlar va cheklar", icon: 'cash-outline', roles: ['ADMIN', 'ACCOUNTANT', 'OPERATOR'] },
  { href: '/staff/products', label: 'Tovarlar va narxlar', icon: 'cube-outline', roles: ['ADMIN', 'OPERATOR', 'AGENT'] },
  ...(BRANDS_ENABLED ? [{ href: '/staff/brands', label: 'Tovar egalari va kelishuvlar', icon: 'ribbon-outline', roles: ['ADMIN'] } satisfies Item] : []),
  { href: '/staff/team', label: 'Xodimlar', icon: 'people-outline', roles: ['ADMIN'] },
  { href: '/staff/payment-methods', label: "To'lov usullari (karta, Payme, Click)", icon: 'card-outline', roles: ['ADMIN'] },
  { href: '/staff/settings', label: 'Kompaniya sozlamalari', icon: 'settings-outline', roles: ['ADMIN'] },
];

export default function StaffMore() {
  const { me, can, reload } = useStaff();
  const items = ITEMS.filter((i) => can(...i.roles));

  return (
    <Screen>
      {me && <ProfileCard name={me.staff.name} sub={`${roleLabel(me.staff.role)} · ${me.staff.phone}`} avatarUrl={me.staff.avatarUrl} onAvatar={() => reload()} />}
      {me && (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          {can('ADMIN') ? (
            <PicEdit uri={me.distributor.logoUrl} name={me.distributor.name} size={52} label={t('Kompaniya logosi')} path="/api/staff/logo" field="logoUrl" onChange={() => reload()} />
          ) : (
            <Pic uri={me.distributor.logoUrl} name={me.distributor.name} size={52} />
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <T bold numberOfLines={2} style={{ flexShrink: 1 }}>
                {me.distributor.name}
              </T>
              {me.distributor.status === 'PENDING' && <Badge label={t("to'xtatilgan")} tone="danger" />}
            </View>
            <T size="small" tone={me.subscription.state === 'ACTIVE' ? 'hint' : me.subscription.state === 'GRACE' ? 'warn' : 'danger'}>
              {t('Obuna · {status}', { status: subscriptionText(me.subscription) })}
            </T>
          </View>
        </Card>
      )}
      {items.length > 0 && (
        <Card style={{ paddingVertical: 8, gap: 8 }}>
          {items.map((i, n) => (
            <View key={i.label} style={{ gap: 8 }}>
              {n > 0 && <Divider />}
              <ListRow icon={i.icon} title={t(i.label)} onPress={() => router.push(i.href)} />
            </View>
          ))}
        </Card>
      )}
      <AccountLinks />
    </Screen>
  );
}
