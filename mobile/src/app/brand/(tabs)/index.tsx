import { router } from 'expo-router';
import { View } from 'react-native';

import { AccountLinks } from '@/components/account-links';
import { PicEdit } from '@/components/pic-edit';
import { ProfileCard } from '@/components/profile';
import { AbrBar, Badge, Banner, Card, Count, Empty, ErrorState, ListRow, Loading, Money, Pic, PressCard, Row, Screen, SectionTitle, ShellBand, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { formatSom } from '@/lib/money';
import { agreementLabel, type BrandAgreementRow, type BrandMe } from '@/lib/staff-types';
import { useLoad } from '@/lib/use-load';

// Tovar egasi: savdo (distribyutorlar orqali), kelishuvlar va takliflar
export default function BrandHome() {
  const c = usePalette();
  const me = useLoad<BrandMe>('/api/brand/me');
  const ag = useLoad<{ agreements: BrandAgreementRow[] }>('/api/brand/agreements');

  if (me.error && !me.data) return <ErrorState message={me.error} onRetry={me.retry} />;
  if (!me.data) return <Loading safeTop />;
  const d = me.data;
  const maxSum = Math.max(1, ...d.sales.distributors.map((x) => x.sum));

  const setData = me.setData;

  return (
    <Screen
      band={
        <ShellBand>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <PicEdit
              uri={d.brand.logoUrl}
              name={d.brand.name}
              size={52}
              ring={c.shell}
              label={t('Brend logosi')}
              path="/api/brand/logo"
              field="logoUrl"
              onChange={(logoUrl) => setData({ ...d, brand: { ...d.brand, logoUrl } })}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <T bold numberOfLines={1} accessibilityRole="header" style={{ color: c.shellText, fontSize: 17 }}>
                {d.brand.name}
              </T>
              <T size="small" numberOfLines={1} style={{ color: c.shellHint }}>
                {d.user.name}
              </T>
            </View>
          </View>
          <View style={{ gap: 4 }}>
            <T size="small" style={{ color: c.shellHint }}>
              {t("Oxirgi {n} kunda do'konlarga sotilgan", { n: d.sales.days })}
            </T>
            <Money value={d.sales.total} size="display" color={c.shellText} />
            <T size="small" style={{ color: c.shellHint }}>
              {t('{n} ta faol kelishuv', { n: d.counts.activeAgreements })} · {t('{n} ta tovar', { n: d.counts.products })}
            </T>
          </View>
        </ShellBand>
      }
      refreshing={me.refreshing}
      onRefresh={() => {
        me.reload();
        ag.reload();
      }}>
      {d.brand.status === 'PENDING' && (
        <Banner>{t("Hisobingiz platforma tekshiruvida. Tasdiqlangach, distribyutorlarga taklif yubora olasiz. Hozircha tovarlaringizni qo'shib qo'ying.")}</Banner>
      )}

      {d.counts.newOrders > 0 && (
        <Card style={{ paddingVertical: 8 }}>
          <ListRow icon="cube-outline" title={t('{n} ta yangi xarid buyurtmasi', { n: d.counts.newOrders })} right={<Count n={d.counts.newOrders} />} onPress={() => router.push('/brand/orders')} />
        </Card>
      )}

      {d.sales.distributors.length > 0 && (
        <>
          <SectionTitle>{t("Distribyutorlar bo'yicha")}</SectionTitle>
          <Card style={{ gap: 10 }}>
            {d.sales.distributors.map((x) => (
              <View key={x.distributorId} style={{ gap: 6 }}>
                <Row label={x.name} value={formatSom(x.sum)} />
                <AbrBar value={x.sum / maxSum} dye={c.accent} track={c.field} height={10} />
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <Pic uri={a.distributor.logoUrl} name={a.distributor.name} size={40} />
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
      <SectionTitle>{t('Profil')}</SectionTitle>
      <ProfileCard name={d.user.name} sub={d.user.phone} avatarUrl={d.user.avatarUrl} onAvatar={(avatarUrl) => setData({ ...d, user: { ...d.user, avatarUrl } })} />
      <AccountLinks />
    </Screen>
  );
}
