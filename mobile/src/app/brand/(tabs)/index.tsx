import { router } from 'expo-router';
import { View } from 'react-native';

import { AccountLinks, askSignOut } from '@/components/account-links';
import { Badge, Banner, Card, Empty, ErrorState, IconButton, Loading, Money, PressCard, Row, Screen, SectionTitle, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { t } from '@/lib/i18n';
import { formatSom } from '@/lib/money';
import { agreementLabel, type BrandAgreementRow, type BrandMe } from '@/lib/staff-types';
import { useLoad } from '@/lib/use-load';

// Tovar egasi: savdo (distribyutorlar orqali), kelishuvlar va takliflar
export default function BrandHome() {
  const c = usePalette();
  const { signOut } = useSession();
  const me = useLoad<BrandMe>('/api/brand/me');
  const ag = useLoad<{ agreements: BrandAgreementRow[] }>('/api/brand/agreements');

  if (me.error && !me.data) return <ErrorState message={me.error} onRetry={me.retry} />;
  if (!me.data) return <Loading safeTop />;
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
          <T size="title" accessibilityRole="header">
            {d.brand.name}
          </T>
          <T size="small" tone="hint">
            {d.user.name}
          </T>
        </View>
        <IconButton icon="log-out-outline" label={t('Chiqish')} tone="hint" onPress={() => askSignOut(signOut)} />
      </View>
      {d.brand.status === 'PENDING' && (
        <Banner>{t("Hisobingiz platforma tekshiruvida. Tasdiqlangach, distribyutorlarga taklif yubora olasiz. Hozircha tovarlaringizni qo'shib qo'ying.")}</Banner>
      )}

      <Card style={{ gap: 4 }}>
        <T size="small" tone="hint">
          {t("Oxirgi {n} kunda do'konlarga sotilgan", { n: d.sales.days })}
        </T>
        <Money value={d.sales.total} size="title" />
        <T size="small" tone="hint">
          {t('{n} ta faol kelishuv', { n: d.counts.activeAgreements })} · {t('{n} ta tovar', { n: d.counts.products })}
        </T>
      </Card>

      {d.counts.newOrders > 0 && (
        <PressCard onPress={() => router.push('/brand/orders')}>
          <T bold tone="accent">
            {t('{n} ta yangi xarid buyurtmasi ›', { n: d.counts.newOrders })}
          </T>
        </PressCard>
      )}

      {d.sales.distributors.length > 0 && (
        <>
          <SectionTitle>{t("Distribyutorlar bo'yicha")}</SectionTitle>
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
          <SectionTitle>{t("Tovarlar bo'yicha")}</SectionTitle>
          <Card style={{ gap: 6 }}>
            {d.sales.products.map((p) => (
              <Row key={p.name} label={`${p.name} · ${t('{n} dona', { n: p.qty })}`} value={formatSom(p.sum)} />
            ))}
          </Card>
        </>
      )}

      <SectionTitle>{t('Kelishuvlar')}</SectionTitle>
      {!ag.data && !ag.error && <Loading inline rows={2} />}
      {ag.data?.agreements.map((a) => {
        const incoming = a.status === 'PROPOSED' && a.initiatedBy === 'DISTRIBUTOR';
        return (
          <PressCard key={a.id} onPress={() => router.push(`/brand/agreement/${a.id}`)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <T bold style={{ flex: 1 }}>
                {a.distributor.name}
              </T>
              <Badge label={incoming ? t('Sizga taklif') : agreementLabel(a.status)} tone={incoming ? 'warn' : a.status === 'ACTIVE' ? 'ok' : a.status === 'PROPOSED' ? 'accent' : 'hint'} />
            </View>
            <T size="small" tone="hint">
              {a.districts.join(', ')} · {t('chegirma {n}%', { n: a.discountPercent })}
            </T>
          </PressCard>
        );
      })}
      {ag.data && ag.data.agreements.length === 0 && <Empty icon="ribbon-outline">{t('Hali kelishuv yo\'q. "Distribyutorlar" bo\'limidan hamkor toping.')}</Empty>}
      <AccountLinks />
    </Screen>
  );
}
