import Link from "next/link";
import { db } from "@/lib/db";
import { overdue } from "@/lib/ledger";
import { formatSom } from "@/lib/money";
import { ledgerFacts } from "@/lib/shop-summary";
import { devAuthEnabled, getStaff } from "@/lib/session";
import { startOfTashkentDay } from "@/lib/time";
import { requestPanelCode, verifyPanelCode } from "./login-actions";
import { panelT } from "./panel-lang";
import type { panelText } from "./texts";

type T = ReturnType<typeof panelText>;

export const dynamic = "force-dynamic";

export default async function PanelHome({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const staff = await getStaff();
  const { t } = await panelT();
  if (!staff) {
    const params = await searchParams;
    return <Login t={t} phone={params.phone} error={params.error} devCode={params.dev} />;
  }

  const distributorId = staff.distributorId;
  const startOfDay = startOfTashkentDay();

  const [newOrders, inDelivery, links, paidToday, requests] = await Promise.all([
    db.order.aggregate({ where: { shopLink: { distributorId }, status: "SENT" }, _count: true, _sum: { total: true } }),
    db.order.count({ where: { shopLink: { distributorId }, status: "IN_DELIVERY" } }),
    db.shopLink.findMany({ where: { distributorId, status: "ACTIVE" }, select: { id: true, shop: { select: { name: true } } } }),
    db.ledgerEntry.aggregate({
      where: { shopLink: { distributorId }, type: "PAYMENT", status: "CONFIRMED", date: { gte: startOfDay } },
      _sum: { amount: true },
    }),
    db.shopLink.count({ where: { distributorId, status: "REQUESTED" } }),
  ]);

  const today = new Date();
  const facts = await ledgerFacts(links.map((l) => l.id));
  const overdueShops = links
    .map((l) => ({ shop: l.shop.name, ...overdue(facts.get(l.id)!.entries, today) }))
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.maxDays - a.maxDays);

  const cards = [
    { label: t("Yangi buyurtmalar"), value: t("{n} ta", { n: newOrders._count }), sub: formatSom(newOrders._sum.total ?? 0), href: "/panel/orders?status=SENT" },
    { label: t("Yo'ldagi buyurtmalar"), value: t("{n} ta", { n: inDelivery }), href: "/panel/orders?status=IN_DELIVERY" },
    { label: t("Muddati o'tgan qarzlar"), value: t("{n} ta do'kon", { n: overdueShops.length }), sub: formatSom(overdueShops.reduce((s, x) => s + x.amount, 0)) },
    { label: t("Bugun tushgan to'lovlar"), value: formatSom(-(paidToday._sum.amount ?? 0)) },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold">{t("Bugun")}</h1>
      {requests > 0 && (
        <Link
          href="/panel/requests"
          className="mt-4 flex items-center justify-between rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm hover:border-accent"
        >
          <span>{t("{n} ta yangi do'kon sizga ulanishni so'rayapti", { n: requests })}</span>
          <span className="font-medium text-accent-ink">{t("Ko'rish →")}</span>
        </Link>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const body = (
            <>
              <div className="text-sm text-hint">{c.label}</div>
              <div className="mt-1 text-2xl font-semibold">{c.value}</div>
              {c.sub && <div className="text-sm text-hint">{c.sub}</div>}
            </>
          );
          return c.href ? (
            <Link key={c.label} href={c.href} className="rounded-xl border border-line bg-card p-4 hover:border-accent">
              {body}
            </Link>
          ) : (
            <div key={c.label} className="rounded-xl border border-line bg-card p-4">
              {body}
            </div>
          );
        })}
      </div>

      {overdueShops.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">{t("Muddati o'tgan qarzlar")}</h2>
          <table className="mt-2 w-full overflow-hidden rounded-xl border border-line bg-card text-sm">
            <thead className="bg-bg text-left text-hint">
              <tr>
                <th className="px-3 py-2 font-medium">{t("Do'kon")}</th>
                <th className="px-3 py-2 font-medium">{t("Kechikish")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("Summa")}</th>
              </tr>
            </thead>
            <tbody>
              {overdueShops.map((x) => (
                <tr key={x.shop} className="border-t border-line">
                  <td className="px-3 py-2">{x.shop}</td>
                  <td className="px-3 py-2">{t("{n} kun", { n: x.maxDays })}</td>
                  <td className="px-3 py-2 text-right">{formatSom(x.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

// SMS kod bilan kirish; sinov rejimida demo xodimni tanlab kirish ham bor
async function Login({ t, phone, error, devCode }: { t: T; phone?: string; error?: string; devCode?: string }) {
  return (
    <div className="mx-auto grid max-w-md gap-6">
      <div className="grid gap-3">
        <h1 className="text-xl font-semibold">{t("Distribyutor paneli")}</h1>
        {error && <p className="text-sm text-danger">{error}</p>}
        {!phone ? (
          <form action={requestPanelCode} className="grid gap-3">
            <input name="phone" placeholder="+998 90 123 45 67" inputMode="tel" className="field" />
            <button className="btn btn-primary">{t("Kod olish")}</button>
          </form>
        ) : (
          <form action={verifyPanelCode} className="grid gap-3">
            <input type="hidden" name="phone" value={phone} />
            <p className="text-sm text-hint">{t("{phone} raqami panel xodimiga tegishli bo'lsa, unga SMS kod yuborildi.", { phone })}</p>
            {devCode && <p className="text-sm text-accent-ink">{t("Sinov rejimi: kod {code}", { code: devCode })}</p>}
            <input name="code" inputMode="numeric" maxLength={6} placeholder={t("SMS kod")} className="field" />
            <button className="btn btn-primary">{t("Kirish")}</button>
          </form>
        )}
      </div>
      {devAuthEnabled() && <DevLogin t={t} />}
    </div>
  );
}

async function DevLogin({ t }: { t: T }) {
  const staff = await db.staff.findMany({
    where: { role: { in: ["ADMIN", "OPERATOR"] } },
    include: { distributor: true },
    orderBy: [{ distributor: { name: "asc" } }, { role: "asc" }],
  });
  return (
    <div className="mx-auto max-w-md">
      <h2 className="text-lg font-semibold">{t("Sinov rejimi")}</h2>
      <p className="mt-1 text-sm text-hint">{t("Qaysi xodim nomidan kirasiz?")}</p>
      <div className="mt-4 grid gap-2">
        {staff.map((s) => (
          <form key={s.id} action="/api/panel/login" method="post">
            <input type="hidden" name="staffId" value={s.id} />
            <button className="w-full rounded-xl border border-line bg-card px-4 py-3 text-left hover:border-accent">
              <div className="font-medium">{s.distributor.name}</div>
              <div className="text-sm text-hint">
                {s.name} · {s.role === "ADMIN" ? "admin" : "operator"}
              </div>
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
