import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { useSession } from '@/context/session';
import type { StaffMe } from '@/lib/staff-types';
import type { StaffRole } from '@/lib/types';

type Ctx = { me: StaffMe | null; error: string | null; reload: () => Promise<void>; can: (...roles: StaffRole[]) => boolean };

const StaffContext = createContext<Ctx | null>(null);

// Xodim, uning roli va distribyutori: barcha xodim ekranlari uchun bir marta yuklanadi
export function StaffProvider({ children }: { children: React.ReactNode }) {
  const { api, session } = useSession();
  const [me, setMe] = useState<StaffMe | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setMe(await api<StaffMe>('/api/staff/me'));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [api]);

  useEffect(() => {
    let alive = true;
    api<StaffMe>('/api/staff/me')
      .then((m) => {
        if (!alive) return;
        setMe(m);
        setError(null);
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [api]);

  // Server javobidan oldin ham rol ma'lum (kirishda saqlangan), shuning uchun tablar darhol to'g'ri chiziladi
  const role = me?.staff.role ?? session?.role;
  const can = useCallback((...roles: StaffRole[]) => !!role && roles.includes(role), [role]);

  return <StaffContext.Provider value={{ me, error, reload, can }}>{children}</StaffContext.Provider>;
}

export function useStaff() {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error('useStaff StaffProvider ichida ishlatiladi');
  return ctx;
}
