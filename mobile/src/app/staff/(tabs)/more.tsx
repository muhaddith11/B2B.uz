import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { View } from 'react-native';

import { AccountLinks, askSignOut } from '@/components/account-links';
import { subscriptionText } from '@/components/subscription';
import { Badge, Card, Divider, ListRow, Screen, T } from '@/components/ui';
import { useSession } from '@/context/session';
import { useStaff } from '@/context/staff';
import { t, type Key } from '@/lib/i18n';
import { roleLabel } from '@/lib/staff-types';
import type { StaffRole } from '@/lib/types';

type Item = { href: Parameters<typeof router.push>[0]; label: Key; icon: keyof typeof Ionicons.glyphMap; roles: StaffRole[] };

const ITEMS: Item[] = [
  { href: '/staff/requests', label: "Ulanish so'rovlari", icon: 'person-add-outline', roles: ['ADMIN', 'OPERATOR'] },
  { href: '/staff/payments', label: "To'lovlar va cheklar", icon: 'cash-outline', roles: ['ADMIN', 'ACCOUNTANT', 'OPERATOR'] },
  { href: '/staff/products', label: 'Tovarlar va narxlar', icon: 'cube-outline', roles: ['ADMIN', 'OPERATOR', 'AGENT'] },
  { href: '/staff/brands', label: 'Tovar egalari va kelishuvlar', icon: 'ribbon-outline', roles: ['ADMIN'] },
  { href: '/staff/team', label: 'Xodimlar', icon: 'people-outline', roles: ['ADMIN'] },
  { href: '/staff/payment-methods', label: "To'lov usullari (karta, Payme, Click)", icon: 'card-outline', roles: ['ADMIN'] },
  { href: '/staff/settings', label: 'Kompaniya sozlamalari', icon: 'settings-outline', roles: ['ADMIN'] },
];

export default function StaffMore() {
  const { signOut } = useSession();
  const { me, can } = useStaff();
  const items = ITEMS.filter((i) => can(...i.roles));

  return (
    <Screen>
      {me && (
        <Card style={{ gap: 6 }}>
          <T size="h2">{me.staff.name}</T>
          <T size="small" tone="hint" num>
            {roleLabel(me.staff.role)} · {me.staff.phone}
          </T>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <T size="small">{me.distributor.name}</T>
            {me.distributor.status === 'PENDING' && <Badge label={t('tekshiruvda')} tone="warn" />}
          </View>
          <T size="small" tone={me.subscription.state === 'ACTIVE' ? 'hint' : me.subscription.state === 'GRACE' ? 'warn' : 'danger'}>
            {t('Obuna · {status}', { status: subscriptionText(me.subscription) })}
          </T>
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
      <Card style={{ paddingVertical: 8 }}>
        <ListRow icon="log-out-outline" tone="danger" title={t('Chiqish')} onPress={() => askSignOut(signOut)} />
      </Card>
      <AccountLinks />
    </Screen>
  );
}
