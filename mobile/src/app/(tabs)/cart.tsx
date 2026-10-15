import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Banner, Button, Card, Divider, Empty, ErrorState, Loading, Money, Pic, QtyStepper, T } from '@/components/ui';
import { R, usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { haptic } from '@/lib/haptics';
import { t, tx } from '@/lib/i18n';
import { formatSom } from '@/lib/money';
import { paymentLabel, type CatalogData, type HomeData, type LinkSummary, type PaymentType } from '@/lib/types';

type Group = { link: LinkSummary; catalog: CatalogData };
type Result = { ok: true; number: number } | { ok: false; error: string };

const PAY_ICON: Record<PaymentType, 'cash-outline' | 'swap-horizontal-outline' | 'time-outline'> = {
  CASH: 'cash-outline',
  TRANSFER: 'swap-horizontal-outline',
  CREDIT: 'time-outline',
};

// Savatdagi har bir distribyutor uchun alohida buyurtma yuboriladi
export default function CartScreen() {
  const c = usePalette();
  const { api, cart, setQty, clearDistributor } = useSession();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [payment, setPayment] = useState<Record<string, PaymentType>>({});
  const [results, setResults] = useState<Record<string, Result>>({});
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const distKey = Object.keys(cart).sort().join(',');

  // Savatdagi distribyutorlar katalogi (narx va minimal buyurtma uchun); alive: ekran yopilgach javob yozilmaydi
  const load = useCallback(
    async (alive: () => boolean) => {
      try {
        const ids = distKey ? distKey.split(',') : [];
        if (ids.length === 0) {
          if (alive()) setGroups([]);
          return;
        }
        const home = await api<HomeData>('/api/shop/home');
        const loaded = await Promise.all(
          ids.map(async (id) => {
            const link = home.links.find((l) => l.distributor.id === id);
            if (!link) return null;
            const catalog = await api<CatalogData>(`/api/shop/catalog?distributorId=${encodeURIComponent(id)}`);
            return { link, catalog };
          }),
        );
        if (alive()) {
          setGroups(loaded.filter((g): g is Group => g !== null));
          setErr(null);
        }
      } catch (e) {
        if (alive()) setErr((e as Error).message);
      }
    },
    [api, distKey],
  );

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      load(() => alive);
      return () => {
        alive = false;
      };
    }, [load]),
  );

  async function submit() {
    if (!groups) return;
    setSending(true);
    const next: Record<string, Result> = {};
    for (const g of groups) {
      const id = g.catalog.distributor.id;
      const items = Object.entries(cart[id] ?? {}).map(([productId, qty]) => ({ productId, qty }));
      if (items.length === 0) continue;
      try {
        const res = await api<{ number: number }>('/api/shop/orders', {
          method: 'POST',
          body: JSON.stringify({ distributorId: id, paymentType: payment[id] ?? 'CASH', items }),
        });
        next[id] = { ok: true, number: res.number };
        clearDistributor(id);
      } catch (e) {
        next[id] = { ok: false, error: (e as Error).message };
      }
    }
    setResults(next);
    setSending(false);
    if (Object.values(next).some((r) => !r.ok)) haptic.error();
    else haptic.success();
  }

  if (err && !groups) {
    return (
      <ErrorState
        message={err}
        onRetry={() => {
          setErr(null);
          load(() => true);
        }}
      />
    );
  }

  const sent = Object.values(results).filter((r): r is { ok: true; number: number } => r.ok);
  const numbers = sent.map((r) => `№${r.number}`).join(', ');

  if (!distKey)
    return (
      <View style={{ flex: 1, padding: 24, gap: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        {sent.length > 0 ? (
          <>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.okSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="checkmark" size={40} color={c.ok} />
            </View>
            <T size="title" accessibilityRole="header">
              {t('Buyurtma yuborildi')}
            </T>
            <T tone="hint" style={{ textAlign: 'center' }}>
              {t('{numbers}. Distribyutor qabul qilganda xabar keladi.', { numbers })}
            </T>
            <Button title={t("Buyurtmalarimni ko'rish")} onPress={() => router.push('/orders')} style={{ alignSelf: 'stretch' }} />
          </>
        ) : (
          <Empty icon="cart-outline" action={<Button title={t('Distribyutorni tanlash')} kind="secondary" onPress={() => router.push('/')} />}>
            {t("Savat bo'sh. Distribyutor katalogidan tovar qo'shing.")}
          </Empty>
        )}
      </View>
    );

  if (!groups) return <Loading rows={2} />;

  const active = groups.filter(({ catalog }) => catalog.products.some((p) => (cart[catalog.distributor.id]?.[p.id] ?? 0) > 0));
  const totalOf = (catalog: CatalogData) => catalog.products.reduce((x, p) => x + (cart[catalog.distributor.id]?.[p.id] ?? 0) * p.price, 0);
  const grand = active.reduce((s, { catalog }) => s + totalOf(catalog), 0);
  // Minimal buyurtmaga yetmagan distribyutor bo'lsa, yuborib bo'lmaydi (server ham rad etadi)
  const short = active.filter(({ catalog }) => totalOf(catalog) < catalog.distributor.minOrder);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 140 }}>
        {sent.length > 0 && <Banner tone="ok">{t('Yuborildi: {numbers}', { numbers })}</Banner>}

        {active.map(({ link, catalog }) => {
          const id = catalog.distributor.id;
          const lines = catalog.products.filter((p) => (cart[id]?.[p.id] ?? 0) > 0);
          const total = lines.reduce((s, p) => s + (cart[id][p.id] ?? 0) * p.price, 0);
          const minLeft = Math.max(0, catalog.distributor.minOrder - total);
          // Muddati o'tgan qarz bo'yicha bloklashni server hal qiladi (distribyutor sozlamasiga qarab)
          const creditOk = link.creditLimit > 0 && link.creditAvailable >= total;
          const pay = payment[id] ?? 'CASH';
          const result = results[id];

          return (
            <Card key={id} style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <Pic uri={catalog.distributor.logoUrl} name={catalog.distributor.name} size={36} />
                <T size="h2" numberOfLines={1} style={{ flex: 1 }}>
                  {catalog.distributor.name}
                </T>
                <Pressable accessibilityRole="button" onPress={() => router.push(`/distributor/${id}`)} hitSlop={8}>
                  <T size="small" tone="accent" style={{ fontWeight: '600' }}>
                    {t("Yana qo'shish")}
                  </T>
                </Pressable>
              </View>

              {lines.map((p, i) => {
                const qty = cart[id][p.id];
                return (
                  <View key={p.id} style={{ gap: 8 }}>
                    {i > 0 && <Divider />}
                    {/* Nom to'liq kenglikda: hisoblagich yonida siqilib qolmaydi (ruschada "2 коробки" uzunroq) */}
                    <T size="small" bold numberOfLines={2}>
                      {p.name}
                    </T>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <T size="tiny" tone="hint" num>
                          {qty} {tx(p.unit)} × {formatSom(p.price)}
                        </T>
                        <Money value={qty * p.price} size="small" />
                      </View>
                      <QtyStepper packs={Math.floor(qty / p.packSize)} onChange={(n) => setQty(id, p.id, Math.max(0, n) * p.packSize)} />
                    </View>
                  </View>
                );
              })}

              {minLeft > 0 && <Banner tone="warn">{t('Minimal buyurtmagacha yana {sum}', { sum: formatSom(minLeft) })}</Banner>}

              <View style={{ gap: 8 }}>
                <T size="small" tone="hint" style={{ fontWeight: '500' }}>
                  {t("To'lov usuli")}
                </T>
                <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup">
                  {(['CASH', 'TRANSFER', 'CREDIT'] as const).map((type) => {
                    const disabled = type === 'CREDIT' && !creditOk;
                    const on = pay === type;
                    return (
                      <Pressable
                        key={type}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: on, disabled }}
                        disabled={disabled}
                        onPress={() => {
                          if (!on) haptic.tick();
                          setPayment((s) => ({ ...s, [id]: type }));
                        }}
                        style={{
                          flex: 1,
                          minHeight: 64,
                          borderRadius: R.md,
                          borderWidth: 1.5,
                          borderColor: on ? c.accent : c.border,
                          backgroundColor: on ? c.accentSoft : c.card,
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          paddingHorizontal: 4,
                          opacity: disabled ? 0.45 : 1,
                        }}>
                        <Ionicons name={PAY_ICON[type]} size={20} color={on ? c.accentInk : c.hint} />
                        <T size="small" tone={on ? 'accent' : 'text'} numberOfLines={1} style={{ fontWeight: '600' }}>
                          {paymentLabel(type)}
                        </T>
                      </Pressable>
                    );
                  })}
                </View>
                {link.creditLimit > 0 && (
                  <T size="tiny" tone={link.overdueAmount > 0 ? 'danger' : 'hint'} num>
                    {t("Bo'sh nasiya: {sum}", { sum: formatSom(link.creditAvailable) })}
                    {link.overdueAmount > 0 ? ` · ${t("muddati o'tgan qarz bor")}` : ''}
                  </T>
                )}
              </View>

              <Divider />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <T bold>{t('Jami')}</T>
                <Money value={total} size="h2" />
              </View>
              {result && !result.ok && <Banner tone="danger">{result.error}</Banner>}
            </Card>
          );
        })}
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, gap: 10, backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <T tone="hint" style={{ flexShrink: 1 }}>
            {active.length > 1 ? t('{n} ta distribyutorga alohida', { n: active.length }) : t("Hammasi bo'lib")}
          </T>
          <Money value={grand} size="h2" />
        </View>
        {short.length > 0 && (
          <T size="small" tone="warn" num>
            {short.length === 1 && active.length === 1
              ? t('Minimal buyurtmaga yetmagan')
              : t('Minimal buyurtmaga yetmagan: {names}', { names: short.map(({ catalog }) => catalog.distributor.name).join(', ') })}
          </T>
        )}
        <Button
          title={active.length > 1 ? t('{n} ta buyurtma yuborish', { n: active.length }) : t('Buyurtma berish')}
          icon="paper-plane-outline"
          onPress={submit}
          loading={sending}
          disabled={short.length > 0}
        />
      </View>
    </View>
  );
}
