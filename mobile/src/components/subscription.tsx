import { Banner } from '@/components/ui';
import { t } from '@/lib/i18n';
import { formatDate } from '@/lib/money';
import type { Subscription } from '@/lib/types';

// Shuncha kun qolganda eslatma chiqadi (server bilan bir xil: src/lib/subscription.ts WARN_DAYS)
const WARN_DAYS = 14;

// Obuna holati matni. Ilovada faqat holat ko'rinadi: narx va to'lov tugmasi yo'q (to'lov ilovadan tashqarida)
export function subscriptionText(s: Subscription): string {
  const date = formatDate(s.paidUntil);
  if (s.state === 'EXPIRED') return t('Muddati tugagan ({date})', { date });
  if (s.state === 'GRACE') return t('Muddati tugadi ({date})', { date });
  return s.trial ? t('Tekin davr: {date} gacha', { date }) : t('Faol: {date} gacha', { date });
}

// Muddat yaqinlashganda, tugaganda va yopilganda ogohlantirish; boshqa paytda hech narsa ko'rinmaydi
export function SubscriptionBanner({ s, who }: { s?: Subscription; who: 'shop' | 'distributor' }) {
  if (!s) return null;
  if (s.state === 'EXPIRED') {
    return (
      <Banner tone="danger">
        {who === 'shop'
          ? t("Obuna muddati tugagan: yangi buyurtma berib bo'lmaydi. Qarzlar va to'lovlar ishlayveradi.")
          : t("Obuna muddati tugagan: yangi buyurtma olib ham, qabul qilib ham bo'lmaydi. Qarzlar va to'lovlar ishlayveradi.")}
      </Banner>
    );
  }
  if (s.state === 'GRACE') {
    return (
      <Banner tone="warn">{t('Obuna muddati {date} da tugadi. {blocks} dan yangi buyurtmalar yopiladi.', { date: formatDate(s.paidUntil), blocks: formatDate(s.blocksAt) })}</Banner>
    );
  }
  if (s.daysLeft <= WARN_DAYS) {
    return (
      <Banner tone="info">{s.trial ? t('Tekin davr {date} da tugaydi.', { date: formatDate(s.paidUntil) }) : t('Obuna {date} da tugaydi.', { date: formatDate(s.paidUntil) })}</Banner>
    );
  }
  return null;
}
