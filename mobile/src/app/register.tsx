import { router } from 'expo-router';

import { PressCard, Screen, T } from '@/components/ui';
import { NeedPhone } from '@/components/need-phone';
import { useSession } from '@/context/session';
import { t } from '@/lib/i18n';

// Raqam tasdiqlangan, hisob yo'q: kim sifatida ro'yxatdan o'tadi
export default function RegisterChoice() {
  const { phoneToken } = useSession();
  if (!phoneToken) return <NeedPhone />;

  const options = [
    { href: '/register-shop' as const, title: t("Do'kon egasiman"), text: t("Distribyutorlardan tovar buyurtma qilaman, qarzimni ilovadan to'layman") },
    { href: '/register-distributor' as const, title: t('Distribyutorman'), text: t("Do'konlarga tovar yetkazaman: buyurtma, nasiya, to'lov va agentlarim") },
    { href: '/register-brand' as const, title: t('Tovar egasiman (ishlab chiqaruvchi)'), text: t('Tovarimni distribyutorlarga taklif qilib, kelishuv bilan birga sotaman') },
  ];
  return (
    <Screen>
      <T tone="hint">{t("Bu raqamda hali hisob yo'q. Kim sifatida ro'yxatdan o'tasiz?")}</T>
      {options.map((o) => (
        <PressCard key={o.href} onPress={() => router.push(o.href)}>
          <T bold>{o.title}</T>
          <T size="small" tone="hint">
            {o.text}
          </T>
        </PressCard>
      ))}
    </Screen>
  );
}
