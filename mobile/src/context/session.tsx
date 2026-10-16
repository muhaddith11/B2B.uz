import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { ApiError, request } from '@/lib/api';
import { needsRefresh } from '@/lib/net';
import { savedPushToken } from '@/lib/push';
import { kv, secure } from '@/lib/storage';

// Kim kirgan: do'kon, distribyutor xodimi (rol bilan) yoki tovar egasi
export type AccountKind = 'shop' | 'staff' | 'brand';
export type StaffRole = 'ADMIN' | 'OPERATOR' | 'ACCOUNTANT' | 'AGENT' | 'COURIER';
// refreshedAt: token oxirgi marta qachon olingan yoki yangilangan (ms)
export type Session = { token: string; kind: AccountKind; role?: StaffRole; refreshedAt?: number };

// Savat (faqat do'kon): distribyutor -> tovar -> miqdor (dona)
export type Cart = Record<string, Record<string, number>>;

// everywhere: shu hisobning barcha qurilmalardagi sessiyasi yopiladi (telefon yo'qolsa yoki begona qo'lga tushsa).
// localOnly: server bilan bog'lanmasdan (hisob allaqachon o'chirilgan)
export type SignOutOptions = { everywhere?: boolean; localOnly?: boolean };

type Ctx = {
  ready: boolean;
  session: Session | null;
  signIn: (s: Session) => Promise<void>;
  signOut: (opts?: SignOutOptions) => Promise<void>;
  // SMS kod bilan tasdiqlangan, hali hisobi yo'q raqam: ro'yxatdan o'tish uchun
  phoneToken: string | null;
  setPhoneToken: (t: string | null) => void;
  api: <T>(path: string, init?: RequestInit) => Promise<T>;
  cart: Cart;
  setQty: (distributorId: string, productId: string, qty: number) => void;
  clearDistributor: (distributorId: string) => void;
  cartCount: number;
};

const SessionContext = createContext<Ctx | null>(null);
const SESSION_KEY = 'session';
const CART_KEY = 'shop_cart';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [phoneToken, setPhoneToken] = useState<string | null>(null);
  const [cart, setCart] = useState<Cart>({});

  useEffect(() => {
    (async () => {
      const [saved, savedCart] = await Promise.all([secure.get(SESSION_KEY), kv.get(CART_KEY)]);
      let restored: Session | null = null;
      try {
        const s = saved ? (JSON.parse(saved) as Session) : null;
        if (s?.token && s.kind) restored = s;
      } catch {
        /* eski yoki buzilgan yozuv: qayta kiriladi */
      }
      if (restored) setSession(restored);
      try {
        setCart(JSON.parse(savedCart ?? '{}'));
      } catch {
        /* bo'sh savat */
      }
      setReady(true);
      // Token 30 kun amal qiladi: ilova ochilganda eskirgani yangisiga almashtiriladi (faol foydalanuvchi qayta SMS kutmaydi).
      // Sessiya serverda yopilgan bo'lsa (401), telefondan ham tozalanadi; internet bo'lmasa keyingi ochilishda urinadi
      if (restored && needsRefresh(restored.refreshedAt)) {
        try {
          const { token } = await request<{ token: string }>('/api/auth/refresh', { method: 'POST', token: restored.token });
          const next = { ...restored, token, refreshedAt: Date.now() };
          await secure.set(SESSION_KEY, JSON.stringify(next));
          setSession(next);
        } catch (e) {
          if (e instanceof ApiError && e.status === 401) {
            await Promise.all([secure.remove(SESSION_KEY), kv.remove(CART_KEY)]);
            setCart({});
            setSession(null);
          }
        }
      }
    })();
  }, []);

  const signIn = useCallback(async (s: Session) => {
    const next = { ...s, refreshedAt: Date.now() };
    await secure.set(SESSION_KEY, JSON.stringify(next));
    setPhoneToken(null);
    setSession(next);
  }, []);

  // Telefondagi sessiya va savatni tozalash
  const clearLocal = useCallback(async () => {
    await Promise.all([secure.remove(SESSION_KEY), kv.remove(CART_KEY)]);
    setCart({});
    setSession(null);
  }, []);

  const token = session?.token ?? null;

  // Chiqish: avval serverga aytiladi (bu telefonga hisob bildirishnomalari boshqa kelmasin; everywhere bo'lsa
  // hamma qurilmadagi sessiya yopilsin), keyin telefondan tozalanadi. Internet bo'lmasa ham chiqish to'xtab qolmaydi
  const signOut = useCallback(
    async (opts: SignOutOptions = {}) => {
      if (token && !opts.localOnly) {
        const pushToken = await savedPushToken();
        const call = request('/api/auth/logout', { method: 'POST', token, body: JSON.stringify({ pushToken: pushToken ?? undefined, everywhere: opts.everywhere ?? false }) });
        if (opts.everywhere) {
          // Barcha qurilmalardan chiqish xavfsizlik uchun: server tasdiqlamasa, telefonda ham sessiya qoladi va xato ko'rsatiladi
          // (sessiya serverda allaqachon yopilgan bo'lsa, 401: telefondan tozalash kifoya)
          await call.catch((e) => {
            if (!(e instanceof ApiError && e.status === 401)) throw e;
          });
        } else {
          await Promise.race([call.catch(() => undefined), new Promise((resolve) => setTimeout(resolve, 5000))]);
        }
      }
      await clearLocal();
    },
    [token, clearLocal],
  );

  const api = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      try {
        return await request<T>(path, { ...init, token });
      } catch (e) {
        // Sessiya serverda yopilgan (o'chirilgan hisob, "barcha qurilmalardan chiqish"): faqat telefondan tozalanadi
        if (e instanceof ApiError && e.status === 401) await clearLocal();
        throw e;
      }
    },
    [token, clearLocal],
  );

  const updateCart = useCallback((fn: (prev: Cart) => Cart) => {
    setCart((prev) => {
      const next = fn(prev);
      kv.set(CART_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setQty = useCallback(
    (distributorId: string, productId: string, qty: number) =>
      updateCart((prev) => {
        const forDist = { ...(prev[distributorId] ?? {}) };
        if (qty > 0) forDist[productId] = qty;
        else delete forDist[productId];
        const next = { ...prev, [distributorId]: forDist };
        if (Object.keys(forDist).length === 0) delete next[distributorId];
        return next;
      }),
    [updateCart],
  );

  const clearDistributor = useCallback(
    (distributorId: string) =>
      updateCart((prev) => {
        const next = { ...prev };
        delete next[distributorId];
        return next;
      }),
    [updateCart],
  );

  const cartCount = useMemo(() => Object.values(cart).reduce((s, d) => s + Object.keys(d).length, 0), [cart]);

  return (
    <SessionContext.Provider value={{ ready, session, signIn, signOut, phoneToken, setPhoneToken, api, cart, setQty, clearDistributor, cartCount }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession SessionProvider ichida ishlatiladi');
  return ctx;
}
