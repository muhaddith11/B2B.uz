import { router } from 'expo-router';
import { View } from 'react-native';

import { AccountLinks } from '@/components/account-links';
import { Badge, Banner, Card, Empty, ErrorText, IconButton, Loading, PressCard, Row, Screen, SectionTitle, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { formatSom } from '@/lib/money';
import { AGREEMENT_LABEL, type BrandAgreementRow, type BrandMe } from '@/lib/staff-types';
import { useLoad } from '@/lib/use-load';

// Tovar egasi: savdo (distribyutorlar orqali), kelishuvlar va takliflar
export default function BrandHome() {
  const c = usePalette();
  const { signOut } = useSession();
  const me = useLoad<BrandMe>('/api/brand/me');
  const ag = useLoad<{ agreements: BrandAgreementRow[] }>('/api/brand/agreements');

  if (me.error && !me.data) return <ErrorText>{me.error}</ErrorText>;
  if (!me.data) return <Loading />;
  const d = me.data;
  const maxSum = Math.max(1, ...d.sales.distributors.map((x) => x.sum));

  return (
    <Screen
      safeTop
      refreshing={me.refreshing}
      onRefresh={() => {
        me.reload();
        ag.reload();
      }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <T size="title">{d.brand.name}</T>
          <T size="small" tone="hint">
            {d.user.name}
          </T>
        </View>
        <IconButton icon="log-out-outline" label="Chiqish" tone="hint" onPress={signOut} />
      </View>
      {d.brand.status === 'PENDING' && <Banner>Hisobingiz platforma tekshiruvida. Tasdiqlangach, distribyutorlarga taklif yubora olasiz. Hozircha tovarlaringizni qo'shib qo'ying.</Banner>}

      <Card style={{ gap: 4 }}>
        <T size="small" tone="hint">
          Oxirgi {d.sales.days} kunda do'konlarga sotilgan
        </T>
        <T size="title">{formatSom(d.sales.total)}</T>
        <T size="small" tone="hint">
          {d.counts.activeAgreements} ta faol kelishuv · {d.counts.products} ta tovar
        </T>
      </Card>

      {d.counts.newOrders > 0 && (
        <PressCard onPress={() => router.push('/brand/orders')}>
          <T bold tone="accent">
            {d.counts.newOrders} ta yangi xarid buyurtmasi ›
          </T>
        </PressCard>
      )}

      {d.sales.distributors.length > 0 && (
        <>
          <SectionTitle>Distribyutorlar bo'yicha</SectionTitle>
          <Card style={{ gap: 10 }}>
            {d.sales.distributors.map((x) => (
              <View key={x.distributorId} style={{ gap: 4 }}>
                <Row label={x.name} value={formatSom(x.sum)} />
                <View style={{ height: 6, borderRadius: 3, backgroundColor: c.border }}>
                  <View style={{ width: `${(x.sum / maxSum) * 100}%`, height: 6, borderRadius: 3, backgroundColor: c.accent }} />
                </View>
              </View>
            ))}
          </Card>
          <SectionTitle>Tovarlar bo'yicha</SectionTitle>
          <Card style={{ gap: 6 }}>
            {d.sales.products.map((p) => (
              <Row key={p.name} label={`${p.name} · ${p.qty} dona`} value={formatSom(p.sum)} />
            ))}
          </Card>
        </>
      )}

      <SectionTitle>Kelishuvlar</SectionTitle>
      {ag.data?.agreements.map((a) => {
        const incoming = a.status === 'PROPOSED' && a.initiatedBy === 'DISTRIBUTOR';
        return (
          <PressCard key={a.id} onPress={() => router.push(`/brand/agreement/${a.id}`)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <T bold style={{ flex: 1 }}>
                {a.distributor.name}
              </T>
              <Badge label={incoming ? 'Sizga taklif' : AGREEMENT_LABEL[a.status]} tone={incoming ? 'warn' : a.status === 'ACTIVE' ? 'ok' : a.status === 'PROPOSED' ? 'accent' : 'hint'} />
            </View>
            <T size="small" tone="hint">
              {a.districts.join(', ')} · chegirma {a.discountPercent}%
            </T>
          </PressCard>
        );
      })}
      {ag.data && ag.data.agreements.length === 0 && <Empty>Hali kelishuv yo'q. "Distribyutorlar" bo'limidan hamkor toping.</Empty>}
      <AccountLinks />
    </Screen>
  );
}
