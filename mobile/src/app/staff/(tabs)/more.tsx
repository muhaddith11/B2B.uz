import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AccountLinks } from '@/components/account-links';
import { Badge, Card, Screen, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
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
  const c = usePalette();
  const { signOut } = useSession();
  const { me, can } = useStaff();

  return (
    <Screen gap={8}>
      {me && (
        <Card style={{ gap: 4, marginBottom: 8 }}>
          <T bold>{me.staff.name}</T>
          <T size="small" tone="hint">
            {ROLE_LABEL[me.staff.role]} · {me.staff.phone}
          </T>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <T size="small">{me.distributor.name}</T>
            {me.distributor.status === 'PENDING' && <Badge label="tekshiruvda" tone="warn" />}
          </View>
        </Card>
      )}
      {ITEMS.filter((i) => can(...i.roles)).map((i) => (
        <Pressable key={i.label} onPress={() => router.push(i.href)}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name={i.icon} size={22} color={c.accent} />
            <T style={{ flex: 1 }}>{i.label}</T>
            <Ionicons name="chevron-forward" size={18} color={c.hint} />
          </Card>
        </Pressable>
      ))}
      <Pressable onPress={signOut} style={{ marginTop: 16 }}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="log-out-outline" size={22} color={c.danger} />
          <T tone="danger">Chiqish</T>
        </Card>
      </Pressable>
      <AccountLinks />
    </Screen>
  );
}
