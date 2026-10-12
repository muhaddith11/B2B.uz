"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type TelegramWebApp = {
  initData: string;
  ready: () => void;
  expand: () => void;
  HapticFeedback?: { notificationOccurred: (t: "success" | "error" | "warning") => void };
};
declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

type Status = "loading" | "dev-login" | "needs-registration" | "ready" | "error";
// Savat: distribyutor -> tovar -> miqdor (dona)
export type Cart = Record<string, Record<string, number>>;

export type RegisterFields = { shopName: string; address: string; district: string; ownerName: string; phone: string };

type Ctx = {
  status: Status;
  error: string | null;
  api: <T>(path: string, init?: RequestInit) => Promise<T>;
  loginAsDev: (shopUserId: string) => Promise<void>;
  logout: () => void;
  // Ro'yxatdan o'tish: Telegram ichida initData bilan, sinov rejimida usiz
  inTelegram: boolean;
  firstName: string;
  register: (fields: RegisterFields) => Promise<void>;
  startRegistration: () => void;
  cancelRegistration: () => void;
  cart: Cart;
  setQty: (distributorId: string, productId: string, qty: number) => void;
  clearDistributor: (distributorId: string) => void;
  cartCount: number;
  haptic: (t: "success" | "error" | "warning") => void;
};

const ShopContext = createContext<Ctx | null>(null);
const TOKEN_KEY = "shop_token";
const CART_KEY = "shop_cart";

function readStorage(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    /* sessionStorage yopiq bo'lishi mumkin */
  }
}

async function waitForTelegram(ms = 1500): Promise<TelegramWebApp | null> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const wa = window.Telegram?.WebApp;
    if (wa) return wa;
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const [initData, setInitData] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    try {
      setCart(JSON.parse(localStorage.getItem(CART_KEY) ?? "{}"));
    } catch {
      /* bo'sh savat */
    }
    (async () => {
      const wa = await waitForTelegram();
      if (wa?.initData) {
        wa.ready();
        wa.expand();
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ initData: wa.initData }),
        });
        const data = await res.json();
        if (data.token) {
          setToken(data.token);
          setStatus("ready");
        } else if (data.needsRegistration) {
          setInitData(wa.initData);
          setFirstName(data.firstName ?? "");
          setStatus("needs-registration");
        }
        else {
          setError(data.error ?? "Kirishda xato");
          setStatus("error");
        }
        return;
      }
      const saved = readStorage(TOKEN_KEY);
      if (saved) {
        setToken(saved);
        setStatus("ready");
      } else setStatus("dev-login");
    })();
  }, []);

  const api = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      const res = await fetch(path, {
        ...init,
        headers: { "content-type": "application/json", authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        writeStorage(TOKEN_KEY, null);
        setToken(null);
        setStatus("dev-login");
      }
      if (!res.ok) throw new Error(data.error ?? "Xato");
      return data as T;
    },
    [token],
  );

  const loginAsDev = useCallback(async (shopUserId: string) => {
    const res = await fetch("/api/auth/dev", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ shopUserId }),
    });
    const data = await res.json();
    if (!data.token) throw new Error(data.error ?? "Kirishda xato");
    writeStorage(TOKEN_KEY, data.token);
    setToken(data.token);
    setStatus("ready");
  }, []);

  const register = useCallback(
    async (fields: RegisterFields) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...fields, initData: initData ?? undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.token) throw new Error(data.error ?? "Ro'yxatdan o'tishda xato");
      if (!initData) writeStorage(TOKEN_KEY, data.token);
      setToken(data.token);
      setStatus("ready");
    },
    [initData],
  );

  const startRegistration = useCallback(() => setStatus("needs-registration"), []);
  const cancelRegistration = useCallback(() => setStatus("dev-login"), []);

  const logout = useCallback(() => {
    writeStorage(TOKEN_KEY, null);
    setToken(null);
    setCart({});
    localStorage.removeItem(CART_KEY);
    setStatus("dev-login");
  }, []);

  const persist = (next: Cart) => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(next));
    } catch {
      /* saqlanmasa ham ishlayveradi */
    }
    return next;
  };

  const setQty = useCallback((distributorId: string, productId: string, qty: number) => {
    setCart((prev) => {
      const forDist = { ...(prev[distributorId] ?? {}) };
      if (qty > 0) forDist[productId] = qty;
      else delete forDist[productId];
      const next = { ...prev, [distributorId]: forDist };
      if (Object.keys(forDist).length === 0) delete next[distributorId];
      return persist(next);
    });
  }, []);

  const clearDistributor = useCallback((distributorId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[distributorId];
      return persist(next);
    });
  }, []);

  const cartCount = useMemo(() => Object.values(cart).reduce((s, d) => s + Object.keys(d).length, 0), [cart]);

  const haptic = useCallback((t: "success" | "error" | "warning") => {
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(t);
  }, []);

  return (
    <ShopContext.Provider
      value={{
        status,
        error,
        api,
        loginAsDev,
        logout,
        inTelegram: initData !== null,
        firstName,
        register,
        startRegistration,
        cancelRegistration,
        cart,
        setQty,
        clearDistributor,
        cartCount,
        haptic,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop ShopProvider ichida ishlatiladi");
  return ctx;
}
