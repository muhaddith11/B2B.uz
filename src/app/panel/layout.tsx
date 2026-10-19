import { Suspense } from "react";
import { db } from "@/lib/db";
import { getStaff } from "@/lib/session";
import { LangSwitch } from "./lang-switch";
import { NavLink } from "./nav-link";
import { panelT } from "./panel-lang";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaff();
  const { lang, t } = await panelT();
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
            <div className="ml-auto flex items-center gap-4 pb-2 sm:order-last">
              <Suspense>
                <LangSwitch lang={lang} />
              </Suspense>
              <form action="/api/panel/login" method="post">
                <input type="hidden" name="action" value="logout" />
                <button className="text-sm text-hint hover:text-ink">{t("Chiqish")}</button>
              </form>
            </div>
            <nav className="flex w-full gap-5 overflow-x-auto sm:w-auto">
              <NavLink href="/panel">{t("Bugun")}</NavLink>
              <NavLink href="/panel/orders">{t("Buyurtmalar")}</NavLink>
              <NavLink href="/panel/products">{t("Tovarlar")}</NavLink>
              <NavLink href="/panel/requests">
                <span className="whitespace-nowrap">
                  {t("Ulanish so'rovlari")}
                  {requests > 0 && <span className="num ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-xs text-white">{requests}</span>}
                </span>
              </NavLink>
            </nav>
          </div>
        </header>
      )}
      {!staff && (
        <div className="mx-auto flex max-w-6xl justify-end px-4 pt-4">
          <Suspense>
            <LangSwitch lang={lang} />
          </Suspense>
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
