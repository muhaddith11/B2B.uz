import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AuthImage } from '@/components/auth-image';
import { PicEdit } from '@/components/pic-edit';
import { CallLink, CashForm, OrderCard } from '@/components/staff';
import { AbrBar, Badge, Banner, Button, Card, Chip, ErrorState, Field, Loading, LoadMore, Money, Pic, Row, Screen, SectionTitle, T } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useStaff } from '@/context/staff';
import { confirm } from '@/lib/confirm';
import { t, txNote } from '@/lib/i18n';
import { haptic } from '@/lib/haptics';
import { formatAmount, formatDate, formatSom } from '@/lib/money';
import { newRequestKey } from '@/lib/net';
import { channelLabel, type ShopDetail, type StaffLedger } from '@/lib/staff-types';
import { useLoad } from '@/lib/use-load';
import { useMore } from '@/lib/use-paged';

const pickLedger = (r: { entries: StaffLedger[]; nextCursor?: string | null }) => r.entries;

// Do'kon kartasi: qarz, shartlar, buyurtma olish, to'lov qabul qilish, qarz daftari
export default function StaffShopScreen() {
  const c = usePalette();
  const { linkId } = useLocalSearchParams<{ linkId: string }>();
  const { can } = useStaff();
  const { data, error, refreshing, reload, retry } = useLoad<ShopDetail>(`/api/staff/shops/${linkId}`);
  // Kartada eng yangi 100 ta yozuv; eskilari "Yana ko'rsatish" bilan (qoldiq va muddat baribir butun daftar bo'yicha)
  const ledger = useMore(data, data?.ledger ?? null, data?.ledgerCursor, `/api/staff/shops/${linkId}/ledger`, pickLedger);
  const [panel, setPanel] = useState<'cash' | 'terms' | 'adjust' | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  // Qarz daftarini tuzatish (admin va hisobchi): bekor qilinayotgan yozuv
  const [reversing, setReversing] = useState<string | null>(null);
  const corrector = can('ADMIN', 'ACCOUNTANT');

  if (error && !data) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return <Loading rows={2} />;
  const s = data.summary;

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Stack.Screen options={{ title: data.shop.name }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {!data.shop.imageUrl && can('ADMIN', 'OPERATOR', 'AGENT') ? (
          // Surat yo'q: agent do'kon oldida turib qo'yadi (yetkazuvchi do'konni shundan topadi). Almashtirish do'kon egasining ishi
          <PicEdit uri={null} name={data.shop.name} size={64} label={t("Do'kon suratini qo'yish")} path={`/api/staff/shops/${linkId}/image`} field="imageUrl" onChange={() => reload()} canRemove={false} />
        ) : (
          <Pic uri={data.shop.imageUrl} name={data.shop.name} size={64} />
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <T size="h2" numberOfLines={2}>
            {data.shop.name}
          </T>
          <T size="small" tone="hint" numberOfLines={2}>
            {data.shop.address} · {data.shop.district}
          </T>
        </View>
      </View>
      {!data.shop.ownerVerified && (
        <Banner tone="info">{t("Do'kon egasi hali ilovaga kirmagan. Raqamini tasdiqlamaguncha faqat naqd buyurtma olinadi, nasiya va o'tkazma yopiq")}</Banner>
      )}
      <Card style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T size="small" tone="hint">
            {t('Qarz')}
          </T>
          {data.status === 'BLOCKED' && <Badge label={t('Bloklangan')} tone="danger" />}
        </View>
        <Money value={s.debt} size="title" tone={s.overdueAmount > 0 ? 'danger' : 'text'} />
        {data.terms.creditLimit > 0 && (
          <View style={{ marginVertical: 8 }}>
            <AbrBar value={s.debt / data.terms.creditLimit} dye={s.overdueAmount > 0 ? c.danger : c.accent} track={c.field} height={10} label={t('Nasiya limitidan ishlatilgani')} />
          </View>
        )}
        {s.overdueAmount > 0 && (
          <T size="small" tone="danger" num>
            {t("Muddati {n} kun o'tgan: {sum}", { n: s.overdueDays, sum: formatSom(s.overdueAmount) })}
          </T>
        )}
        {s.nextDue && <Row label={t('Eng yaqin muddat')} value={formatDate(s.nextDue)} />}
        <Row
          label={t('Nasiya limiti')}
          value={data.terms.creditLimit > 0 ? t('{sum}, {n} kun', { sum: formatSom(data.terms.creditLimit), n: data.terms.creditDays }) : t('berilmagan')}
        />
        {data.terms.creditLimit > 0 && <Row label={t("Bo'sh nasiya")} value={formatSom(s.creditAvailable)} />}
        <Row label={t('Narx guruhi')} value={data.terms.priceGroup?.name ?? t('Asosiy')} />
        <Row label={t('Agent')} value={data.terms.agent?.name ?? '—'} />
      </Card>

      <Card style={{ gap: 10 }}>
        {data.users.map((u) => (
          <View key={u.phone} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pic uri={u.avatarUrl} name={u.name} size={36} shape="circle" />
            <View style={{ flex: 1 }}>
              <CallLink phone={u.phone} name={u.name} />
            </View>
          </View>
        ))}
      </Card>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {can('ADMIN', 'OPERATOR', 'AGENT') && data.status === 'ACTIVE' && (
          <Button title={t('Buyurtma olish')} style={{ flex: 1 }} onPress={() => router.push(`/staff/new-order/${linkId}`)} />
        )}
        <Button title={t("To'lov qabul qilish")} kind="secondary" style={{ flex: 1 }} onPress={() => setPanel(panel === 'cash' ? null : 'cash')} />
      </View>
      {panel === 'cash' && (
        <Card>
          <CashForm linkId={linkId} onDone={reload} />
        </Card>
      )}
      {corrector && (
        <Button
          title={panel === 'adjust' ? t('Tuzatishni yopish') : t('Tuzatish yozuvi (qaytarilgan tovar, eski qarz)')}
          kind="secondary"
          onPress={() => setPanel(panel === 'adjust' ? null : 'adjust')}
        />
      )}
      {panel === 'adjust' && (
        <AdjustForm
          linkId={linkId}
          onDone={() => {
            setPanel(null);
            reload();
          }}
        />
      )}
      {can('ADMIN') && (
        <Button title={panel === 'terms' ? t('Shartlarni yopish') : t("Nasiya va narx shartlarini o'zgartirish")} kind="secondary" onPress={() => setPanel(panel === 'terms' ? null : 'terms')} />
      )}
      {panel === 'terms' && (
        <TermsForm
          data={data}
          onDone={() => {
            setPanel(null);
            reload();
          }}
        />
      )}

      {data.orders.length > 0 && <SectionTitle>{t('Oxirgi buyurtmalar')}</SectionTitle>}
      {data.orders.slice(0, 5).map((o) => (
        <OrderCard key={o.id} o={o} />
      ))}

      <SectionTitle>{t('Qarz daftari')}</SectionTitle>
      <Card style={{ gap: 8 }}>
        {ledger.items?.length === 0 && (
          <T size="small" tone="hint">
            {t("Yozuv yo'q")}
          </T>
        )}
        {ledger.items?.map((e) => (
          <View key={e.id} style={{ gap: 2, opacity: e.status === 'REJECTED' || e.reversed ? 0.5 : 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <T size="small" tone="hint" num style={{ flex: 1 }}>
                {formatDate(e.date)} ·{' '}
                {e.type === 'DEBT'
                  ? t('Buyurtma №{n}', { n: e.orderNumber ?? '—' })
                  : e.type === 'PAYMENT'
                    ? t("To'lov ({channel})", { channel: channelLabel(e.channel) })
                    : t('Tuzatish')}
                {e.status === 'PENDING'
                  ? ` · ${t('tasdiq kutilmoqda')}`
                  : e.status === 'REJECTED'
                    ? ` · ${t('rad etilgan')}`
                    : e.reversed
                      ? ` · ${t('bekor qilingan')}`
                      : ''}
              </T>
              <T size="small" num tone={e.amount < 0 ? 'ok' : 'text'} style={{ fontWeight: '500' }}>
                {formatSom(e.amount)}
              </T>
            </View>
            {e.note && (
              <T size="tiny" tone="hint">
                {txNote(e.note)}
              </T>
            )}
            {e.receiptUrl && (
              <T size="tiny" tone="accent" accessibilityRole="button" onPress={() => setReceipt(receipt === e.receiptUrl ? null : e.receiptUrl)}>
                {receipt === e.receiptUrl ? t('Chekni yopish') : t("Chekni ko'rish")}
              </T>
            )}
            {receipt === e.receiptUrl && e.receiptUrl && <AuthImage path={e.receiptUrl} style={{ width: '100%', height: 280, borderRadius: 8, backgroundColor: c.bg }} />}
            {corrector && reversible(e) && reversing !== e.id && (
              <T size="tiny" tone="danger" accessibilityRole="button" onPress={() => setReversing(e.id)}>
                {t('Xato yozilgan: bekor qilish')}
              </T>
            )}
            {reversing === e.id && (
              <ReverseForm
                entry={e}
                onClose={() => setReversing(null)}
                onDone={() => {
                  setReversing(null);
                  reload();
                }}
              />
            )}
          </View>
        ))}
      </Card>
      <LoadMore onPress={ledger.more} loading={ledger.loadingMore} error={ledger.moreError} />
    </Screen>
  );
}

// Bekor qilsa bo'ladigan yozuv: tasdiqlangan, hali bekor qilinmagan, o'zi tuzatish emas. Payme va Click to'lovini to'lov tizimi bekor qiladi
function reversible(e: StaffLedger): boolean {
  return e.status === 'CONFIRMED' && !e.reversed && !e.reversesId && e.channel !== 'PAYME' && e.channel !== 'CLICK';
}

// Xato yozilgan to'lov yoki qarzni bekor qilish: teskari yozuv qo'shiladi, sababi do'konga ham boradi
function ReverseForm({ entry, onClose, onDone }: { entry: StaffLedger; onClose: () => void; onDone: () => void }) {
  const { api } = useSession();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    const ok = await confirm({
      title: t('{sum} bekor qilinsinmi?', { sum: formatSom(entry.amount) }),
      message: t("Qarz daftariga teskari yozuv qo'shiladi. Buni qaytarib bo'lmaydi."),
      action: t('Bekor qilish'),
    });
    if (!ok) return;
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/staff/ledger/${entry.id}/reverse`, { method: 'POST', body: JSON.stringify({ reason: reason.trim() }) });
      haptic.success();
      onDone();
    } catch (e) {
      setErr((e as Error).message);
      haptic.error();
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 8, marginTop: 6 }}>
      <Field label={t("Sabab (do'konga ham ko'rinadi)")} value={reason} onChangeText={setReason} placeholder={t('Masalan: summa xato yozilgan')} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title={t('Ortga')} kind="secondary" compact style={{ flex: 1 }} disabled={busy} onPress={onClose} />
        <Button title={t('Bekor qilish')} kind="danger" compact style={{ flex: 1 }} loading={busy} disabled={reason.trim().length < 3} onPress={submit} />
      </View>
      {err && <Banner tone="danger">{err}</Banner>}
    </View>
  );
}

// Tuzatish yozuvi: qaytarilgan tovar va chegirma qarzni kamaytiradi, qog'ozdagi eski qarz uni oshiradi
function AdjustForm({ linkId, onDone }: { linkId: string; onDone: () => void }) {
  const { api } = useSession();
  const [direction, setDirection] = useState<'down' | 'up'>('down');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Takroriy yuborishda (tarmoq uzilishi) yozuv bir marta tushadi
  const [key] = useState(newRequestKey);
  const sum = Number(amount.replace(/\D/g, '')) || 0;

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      await api('/api/staff/ledger', { method: 'POST', body: JSON.stringify({ linkId, amount: direction === 'down' ? -sum : sum, note: note.trim(), clientKey: key }) });
      haptic.success();
      onDone();
    } catch (e) {
      setErr((e as Error).message);
      haptic.error();
      setBusy(false);
    }
  }

  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip label={t('Qarzni kamaytirish')} active={direction === 'down'} onPress={() => setDirection('down')} />
        <Chip label={t('Qarzni oshirish')} active={direction === 'up'} onPress={() => setDirection('up')} />
      </View>
      <Field label={t("Summa, so'm")} value={amount} onChangeText={(v) => setAmount(formatAmount(Number(v.replace(/\D/g, '')) || 0).replace(/^0$/, ''))} keyboardType="number-pad" />
      <Field
        label={t("Sabab (do'konga ham ko'rinadi)")}
        value={note}
        onChangeText={setNote}
        placeholder={direction === 'down' ? t('Masalan: 3 yashik qaytarildi') : t('Masalan: daftardagi eski qarz')}
      />
      <Button title={t('Yozish')} onPress={submit} loading={busy} disabled={sum <= 0 || note.trim().length < 3} />
      {err && <Banner tone="danger">{err}</Banner>}
    </Card>
  );
}

function TermsForm({ data, onDone }: { data: ShopDetail; onDone: () => void }) {
  const { api } = useSession();
  const { me } = useStaff();
  const [priceGroupId, setPriceGroupId] = useState<string | null>(data.terms.priceGroup?.id ?? null);
  const [creditLimit, setCreditLimit] = useState(String(data.terms.creditLimit));
  const [creditDays, setCreditDays] = useState(String(data.terms.creditDays));
  const [blockAfterDays, setBlockAfterDays] = useState(data.terms.blockAfterDays === null ? '' : String(data.terms.blockAfterDays));
  const [agentId, setAgentId] = useState<string | null>(data.terms.agent?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(extra: Record<string, unknown> = {}) {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/staff/shops/${data.linkId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          priceGroupId,
          creditLimit: Number(creditLimit.replace(/\D/g, '')) || 0,
          creditDays: Number(creditDays) || 14,
          blockAfterDays: blockAfterDays === '' ? null : Number(blockAfterDays),
          agentId,
          ...extra,
        }),
      });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  // Bloklash do'konning ishini to'xtatadi: avval so'raladi (blokdan chiqarish so'ralmaydi)
  async function toggleBlock() {
    if (data.status === 'BLOCKED') return save({ status: 'ACTIVE' });
    const ok = await confirm({
      title: t('{name} bloklansinmi?', { name: data.shop.name }),
      message: t("Do'kon yangi buyurtma bera olmaydi. Keyin blokdan chiqarish mumkin."),
      action: t('Bloklash'),
    });
    if (ok) save({ status: 'BLOCKED' });
  }

  return (
    <Card style={{ gap: 10 }}>
      <T size="small" tone="hint">
        {t('Narx guruhi')}
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {me?.priceGroups.map((g) => (
          <Chip key={g.id} label={g.name} active={(priceGroupId ?? me.priceGroups.find((x) => x.isDefault)?.id) === g.id} onPress={() => setPriceGroupId(g.id)} />
        ))}
      </View>
      <Field label={t("Nasiya limiti, so'm (0 = nasiyasiz)")} value={creditLimit} onChangeText={(v) => setCreditLimit(v.replace(/\D/g, ''))} keyboardType="number-pad" />
      <Field label={t('Nasiya muddati, kun')} value={creditDays} onChangeText={(v) => setCreditDays(v.replace(/\D/g, ''))} keyboardType="number-pad" />
      <Field
        label={t("Muddat o'tgach necha kundan keyin nasiya yopiladi (bo'sh = yopilmaydi)")}
        value={blockAfterDays}
        onChangeText={(v) => setBlockAfterDays(v.replace(/\D/g, ''))}
        keyboardType="number-pad"
      />
      {me && me.agents.length > 0 && (
        <>
          <T size="small" tone="hint">
            {t('Agent')}
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {me.agents.map((a) => (
              <Chip key={a.id} label={a.name} active={agentId === a.id} onPress={() => setAgentId(agentId === a.id ? null : a.id)} />
            ))}
          </View>
        </>
      )}
      <Button title={t('Saqlash')} onPress={() => save()} loading={busy} />
      <Button title={data.status === 'BLOCKED' ? t('Blokdan chiqarish') : t("Do'konni bloklash (buyurtma bera olmaydi)")} kind="danger" disabled={busy} onPress={toggleBlock} />
      {err && <Banner tone="danger">{err}</Banner>}
    </Card>
  );
}
