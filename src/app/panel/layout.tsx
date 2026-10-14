import { db } from "@/lib/db";
import { getStaff } from "@/lib/session";
import { NavLink } from "./nav-link";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaff();
  const requests = staff ? await db.shopLink.count({ where: { distributorId: staff.distributorId, status: "REQUESTED" } }) : 0;
  return (
    <div className="min-h-dvh bg-bg text-ink">
      {staff && (
        <header className="border-b border-line bg-card">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 pt-3">
            <div className="flex items-center gap-3 pb-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent font-bold text-white" aria-hidden>
                C
              </span>
              <div>
                <div className="font-semibold leading-5">{staff.distributor.name}</div>
                <div className="text-xs text-hint">{staff.name}</div>
              </div>
            </div>
            <form action="/api/panel/login" method="post" className="ml-auto pb-2 sm:order-last">
              <input type="hidden" name="action" value="logout" />
              <button className="text-sm text-hint hover:text-ink">Chiqish</button>
            </form>
            <nav className="flex w-full gap-5 overflow-x-auto sm:w-auto">
              <NavLink href="/panel">Bugun</NavLink>
              <NavLink href="/panel/orders">Buyurtmalar</NavLink>
              <NavLink href="/panel/products">Tovarlar</NavLink>
              <NavLink href="/panel/requests">
                <span className="whitespace-nowrap">
                  Ulanish so'rovlari
                  {requests > 0 && <span className="num ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-xs text-white">{requests}</span>}
                </span>
              </NavLink>
            </nav>
          </div>
        </header>
      )}
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
