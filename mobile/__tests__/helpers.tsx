import AsyncStorage from '@react-native-async-storage/async-storage';
import { render } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { Text } from 'react-native';

import { LanguageProvider } from '@/context/language';
import { SessionProvider, useSession, type Cart, type Session } from '@/context/session';

// Soxta server: "METHOD /yo'l" -> javob. Har so'rov calls ga yoziladi (tana JSON bo'lsa o'qilgan holda)
type Reply = { status?: number; body?: unknown } | Error;
type Handler = (call: Call) => Reply;
export type Call = { method: string; path: string; body: unknown; headers: Record<string, string> };

export function mockServer(routes: Record<string, Handler>) {
  const calls: Call[] = [];
  globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const method = (init.method ?? 'GET').toUpperCase();
    const raw = init.body;
    const body = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const call: Call = { method, path: url.pathname + url.search, body, headers: (init.headers ?? {}) as Record<string, string> };
    calls.push(call);
    const handler = routes[`${method} ${url.pathname}`];
    if (!handler) throw new Error(`Kutilmagan so'rov: ${method} ${call.path}`);
    const reply = handler(call);
    if (reply instanceof Error) throw reply;
    const status = reply.status ?? 200;
    return { ok: status < 400, status, json: async () => reply.body ?? {} } as Response;
  }) as typeof fetch;
  return {
    calls,
    // Shu yo'lga ketgan so'rovlar
    to: (method: string, path: string) => calls.filter((c) => c.method === method && c.path.split('?')[0] === path),
  };
}

// Kirgan do'kon egasi va (ixtiyoriy) savat bilan: SessionProvider ularni telefon xotirasidan o'qiydi
export const SHOP_SESSION: Session = { token: 'tok-shop', kind: 'shop', refreshedAt: Date.now() };

export async function signedIn(session: Session | null, cart: Cart = {}) {
  const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;
  store.clear();
  if (session) store.set('session', JSON.stringify(session));
  await AsyncStorage.clear();
  await AsyncStorage.setItem('shop_cart', JSON.stringify(cart));
  // Matnlar o'zbekcha: testlar ekrandagi matn bo'yicha qidiradi
  await AsyncStorage.setItem('lang', 'uz');
}

export function savedSession(): Session | null {
  const raw = (SecureStore as unknown as { __store: Map<string, string> }).__store.get('session');
  return raw ? JSON.parse(raw) : null;
}

// Joriy sessiya va savatni ekranga chiqaradi: test kirish yoki savat tozalanganini ko'radi
function Probe() {
  const { ready, session, cart } = useSession();
  return <Text testID="probe">{ready ? `${session?.kind ?? 'none'}|${JSON.stringify(cart)}` : 'loading'}</Text>;
}

export async function renderWithSession(ui: React.ReactElement) {
  return render(
    <LanguageProvider>
      <SessionProvider>
        {ui}
        <Probe />
      </SessionProvider>
    </LanguageProvider>,
  );
}
