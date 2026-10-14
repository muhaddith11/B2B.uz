import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { View } from 'react-native';

import { AccountLinks } from '@/components/account-links';
import { Badge, Card, Divider, ListRow, Screen, T } from '@/components/ui';
import { useSession } from '@/context/session';
import { useStaff } from '@/context/staff';
import { ROLE_LABEL } from '@/lib/staff-types';
import type { StaffRole } from '@/lib/types';

type Item = { href: Parameters<typeof router.push>[0]; label: string; icon: keyof typeof Ionicons.glyphMap; roles: StaffRole[] };

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
            {ROLE_LABEL[me.staff.role]} · {me.staff.phone}
          </T>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <T size="small">{me.distributor.name}</T>
            {me.distributor.status === 'PENDING' && <Badge label="tekshiruvda" tone="warn" />}
          </View>
        </Card>
      )}
      {items.length > 0 && (
        <Card style={{ paddingVertical: 8, gap: 8 }}>
          {items.map((i, n) => (
            <View key={i.label} style={{ gap: 8 }}>
              {n > 0 && <Divider />}
              <ListRow icon={i.icon} title={i.label} onPress={() => router.push(i.href)} />
            </View>
          ))}
        </Card>
      )}
      <Card style={{ paddingVertical: 8 }}>
        <ListRow icon="log-out-outline" tone="danger" title="Chiqish" onPress={signOut} />
      </Card>
      <AccountLinks />
    </Screen>
  );
}
