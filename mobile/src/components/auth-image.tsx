import { useEffect, useState } from 'react';
import { Image, Platform, type ImageStyle, type StyleProp } from 'react-native';

import { useSession } from '@/context/session';
import { API_URL } from '@/lib/api';

// Ruxsat talab qiladigan rasm (to'lov cheki): token sarlavhada yuboriladi.
// Telefonda Image o'zi sarlavha qo'ya oladi, web'da rasm alohida yuklab olinadi.
export function AuthImage({ path, style }: { path: string; style?: StyleProp<ImageStyle> }) {
  const { session } = useSession();
  const [webUri, setWebUri] = useState<string | null>(null);
  const url = `${API_URL}${path}`;

  useEffect(() => {
    if (Platform.OS !== 'web' || !session) return;
    let revoke: string | null = null;
    fetch(url, { headers: { authorization: `Bearer ${session.token}` } })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (!b) return;
        revoke = URL.createObjectURL(b);
        setWebUri(revoke);
      })
      .catch(() => {});
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [url, session]);

  if (Platform.OS === 'web') return webUri ? <Image source={{ uri: webUri }} style={style} resizeMode="contain" /> : null;
  return <Image source={{ uri: url, headers: { authorization: `Bearer ${session?.token ?? ''}` } }} style={style} resizeMode="contain" />;
}
