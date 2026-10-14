import { router } from 'expo-router';

import { ShopList } from '@/components/staff';
import { Button, Screen } from '@/components/ui';
import { useStaff } from '@/context/staff';

export default function StaffShops() {
  const { can } = useStaff();
  return (
    <Screen>
      <ShopList
        orderAction={can('ADMIN', 'OPERATOR')}
        header={can('ADMIN', 'OPERATOR') ? <Button title="Yangi do'kon qo'shish" icon="add" kind="secondary" onPress={() => router.push('/staff/shop-new')} /> : null}
      />
    </Screen>
  );
}
