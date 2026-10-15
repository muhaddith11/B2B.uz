import Link from "next/link";
import { db } from "@/lib/db";
import { overdue } from "@/lib/ledger";
import { formatSom } from "@/lib/money";
import { ledgerCalcSelect } from "@/lib/shop-summary";
import { devAuthEnabled, getStaff } from "@/lib/session";
import { startOfTashkentDay } from "@/lib/time";
import { requestPanelCode, verifyPanelCode } from "./login-actions";

export const dynamic = "force-dynamic";

export default async function PanelHome({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const staff = await getStaff();
  if (!staff) {
    const params = await searchParams;
    return <Login phone={params.phone} error={params.error} devCode={params.dev} />;
  }

  const distributorId = staff.distributorId;
  const startOfDay = startOfTashkentDay();

  const [newOrders, inDelivery, links, paidToday, requests] = await Promise.all([
    db.order.aggregate({ where: { shopLink: { distributorId }, status: "SENT" }, _count: true, _sum: { total: true } }),
    db.order.count({ where: { shopLink: { distributorId }, status: "IN_DELIVERY" } }),
    db.shopLink.findMany({ where: { distributorId, status: "ACTIVE" }, select: { ledger: { select: ledgerCalcSelect }, shop: { select: { name: true } } } }),
    db.ledgerEntry.aggregate({
      where: { shopLink: { distributorId }, type: "PAYMENT", status: "CONFIRMED", date: { gte: startOfDay } },
      _sum: { amount: true },
    }),
    db.shopLink.count({ where: { distributorId, status: "REQUESTED" } }),
  ]);

  const today = new Date();
  const overdueShops = links
    .map((l) => ({ shop: l.shop.name, ...overdue(l.ledger, today) }))
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.maxDays - a.maxDays);

  const cards = [
    { label: "Yangi buyurtmalar", value: `${newOrders._count} ta`, sub: formatSom(newOrders._sum.total ?? 0), href: "/panel/orders?status=SENT" },
    { label: "Yo'ldagi buyurtmalar", value: `${inDelivery} ta`, href: "/panel/orders?status=IN_DELIVERY" },
    { label: "Muddati o'tgan qarzlar", value: `${overdueShops.length} ta do'kon`, sub: formatSom(overdueShops.reduce((s, x) => s + x.amount, 0)) },
    { label: "Bugun tushgan to'lovlar", value: formatSom(-(paidToday._sum.amount ?? 0)) },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold">Bugun</h1>
      {requests > 0 && (
        <Link
          href="/panel/requests"
          className="mt-4 flex items-center justify-between rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm hover:border-accent"
        >
          <span>
            <span className="font-semibold">{requests} ta yangi do'kon</span> sizga ulanishni so'rayapti
          </span>
          <span className="font-medium text-accent-ink">Ko'rish →</span>
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
          <h2 className="text-lg font-semibold">Muddati o'tgan qarzlar</h2>
          <table className="mt-2 w-full overflow-hidden rounded-xl border border-line bg-card text-sm">
            <thead className="bg-bg text-left text-hint">
              <tr>
                <th className="px-3 py-2 font-medium">Do'kon</th>
                <th className="px-3 py-2 font-medium">Kechikish</th>
                <th className="px-3 py-2 text-right font-medium">Summa</th>
              </tr>
            </thead>
            <tbody>
              {overdueShops.map((x) => (
                <tr key={x.shop} className="border-t border-line">
                  <td className="px-3 py-2">{x.shop}</td>
                  <td className="px-3 py-2">{x.maxDays} kun</td>
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
async function Login({ phone, error, devCode }: { phone?: string; error?: string; devCode?: string }) {
  return (
    <div className="mx-auto grid max-w-md gap-6">
      <div className="grid gap-3">
        <h1 className="text-xl font-semibold">Distribyutor paneli</h1>
        {error && <p className="text-sm text-danger">{error}</p>}
        {!phone ? (
          <form action={requestPanelCode} className="grid gap-3">
            <input name="phone" placeholder="+998 90 123 45 67" inputMode="tel" className="field" />
            <button className="btn btn-primary">Kod olish</button>
          </form>
        ) : (
          <form action={verifyPanelCode} className="grid gap-3">
            <input type="hidden" name="phone" value={phone} />
            <p className="text-sm text-hint">{phone} raqami panel xodimiga tegishli bo'lsa, unga SMS kod yuborildi.</p>
            {devCode && <p className="text-sm text-accent-ink">Sinov rejimi: kod {devCode}</p>}
            <input name="code" inputMode="numeric" maxLength={6} placeholder="SMS kod" className="field" />
            <button className="btn btn-primary">Kirish</button>
          </form>
        )}
      </div>
      {devAuthEnabled() && <DevLogin />}
    </div>
  );
}

async function DevLogin() {
  const staff = await db.staff.findMany({
    where: { role: { in: ["ADMIN", "OPERATOR"] } },
    include: { distributor: true },
    orderBy: [{ distributor: { name: "asc" } }, { role: "asc" }],
  });
  return (
    <div className="mx-auto max-w-md">
      <h2 className="text-lg font-semibold">Sinov rejimi</h2>
      <p className="mt-1 text-sm text-hint">Qaysi xodim nomidan kirasiz?</p>
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
