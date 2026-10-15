import { db } from "@/lib/db";
import { formatDate, formatSom } from "@/lib/money";
import { devAuthEnabled, getAdmin } from "@/lib/session";
import { publicUrl } from "@/lib/checkout";
import { MONTH_OPTIONS, monthlyPrice, platformClick, platformPayme, subscriptionInfo, subscriptionLabel, WARN_DAYS } from "@/lib/subscription";
import { DAY_MS } from "@/lib/time";
import {
  adminLogout,
  devAdminLogin,
  extendSubscriptionAction,
  requestAdminCode,
  setBrandStatus,
  setDistributorStatus,
  setSubscriptionPriceAction,
  verifyAdminCode,
} from "./actions";
import { ConfirmButton } from "./confirm-button";

export const dynamic = "force-dynamic";

// Platforma admini: yangi distribyutor va tovar egalarini tekshirib tasdiqlaydi
export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await getAdmin();
  const params = await searchParams;
  if (!admin) return <Login phone={params.phone} error={params.error} devCode={params.dev} />;

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const q = (params.q ?? "").trim();
  const [distributors, brands, shops, orders, subscriptions] = await Promise.all([
    db.distributor.findMany({
      include: { staff: { where: { role: "ADMIN" }, take: 1 }, _count: { select: { links: { where: { status: "ACTIVE" } }, products: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    db.brand.findMany({ include: { users: { take: 1 }, _count: { select: { products: true, agreements: { where: { status: "ACTIVE" } } } } }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] }),
    db.shop.count(),
    db.order.aggregate({ where: { status: "DELIVERED", updatedAt: { gte: since } }, _count: true, _sum: { deliveredTotal: true } }),
    loadSubscriptions(q),
  ]);

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent font-bold text-white" aria-hidden>
              C
            </span>
            <span className="font-semibold">Captar · admin</span>
          </div>
          <form action={adminLogout}>
            <button className="text-sm text-hint hover:text-ink">Chiqish</button>
          </form>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6">
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ["Distribyutorlar", `${distributors.filter((d) => d.status === "ACTIVE").length} faol`],
            ["Tovar egalari", `${brands.filter((b) => b.status === "ACTIVE").length} faol`],
            ["Do'konlar", `${shops} ta`],
            ["30 kunlik savdo", `${formatSom(orders._sum.deliveredTotal ?? 0)} · ${orders._count} buyurtma`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-line bg-card p-4">
              <div className="text-sm text-hint">{label}</div>
              <div className="mt-1 text-lg font-semibold">{value}</div>
            </div>
          ))}
        </div>

        {params.error && <p className="text-sm text-danger">{params.error}</p>}
        {params.ok && <p className="text-sm text-ok">{params.ok}</p>}
        <SubscriptionSection q={q} {...subscriptions} />

        <Section title="Distribyutorlar">
          {distributors.map((d) => (
            <Row
              key={d.id}
              pending={d.status === "PENDING"}
              title={d.name}
              lines={[
                `${d.districts.join(", ")} · ${d.categories.join(", ")}`,
                `${d.staff[0] ? `${d.staff[0].name}, ${d.staff[0].phone}` : "admin yo'q"} · STIR: ${d.inn ?? "—"} · ${formatDate(d.createdAt)}`,
                `${d._count.links} do'kon · ${d._count.products} tovar`,
              ]}
              action={setDistributorStatus}
              id={d.id}
            />
          ))}
        </Section>

        <Section title="Tovar egalari">
          {brands.map((b) => (
            <Row
              key={b.id}
              pending={b.status === "PENDING"}
              title={b.name}
              lines={[
                b.categories.join(", "),
                `${b.users[0] ? `${b.users[0].name}, ${b.users[0].phone}` : "—"} · STIR: ${b.inn ?? "—"} · ${formatDate(b.createdAt)}`,
                `${b._count.products} tovar · ${b._count.agreements} faol kelishuv`,
              ]}
              action={setBrandStatus}
              id={b.id}
            />
          ))}
        </Section>
      </main>
    </div>
  );
}

// Obuna bo'limi uchun: oylik narx va tashkilotlar. Qidiruvsiz: muddati yaqin yoki o'tgan tashkilotlar
async function loadSubscriptions(q: string) {
  const soon = new Date(Date.now() + WARN_DAYS * DAY_MS);
  const byName = { name: { contains: q, mode: "insensitive" as const } };
  const [price, distributors, shops] = await Promise.all([
    monthlyPrice(),
    db.distributor.findMany({
      where: q ? { OR: [byName, { staff: { some: { phone: { contains: q } } } }] } : { paidUntil: { lt: soon } },
      orderBy: { paidUntil: "asc" },
      take: 30,
    }),
    db.shop.findMany({
      where: q ? { OR: [byName, { users: { some: { phone: { contains: q } } } }] } : { paidUntil: { lt: soon } },
      orderBy: { paidUntil: "asc" },
      take: 30,
    }),
  ]);
  const orgs = [...distributors.map((d) => ({ kind: "distributor" as const, org: d })), ...shops.map((s) => ({ kind: "shop" as const, org: s }))].sort(
    (a, b) => a.org.paidUntil.getTime() - b.org.paidUntil.getTime(),
  );
  return { price, orgs };
}

// Obuna: oylik narx, tashkilot qidirish va qo'lda uzaytirish (bank o'tkazmasi kabi saytdan tashqari to'lovlar uchun)
function SubscriptionSection({ q, price, orgs }: { q: string } & Awaited<ReturnType<typeof loadSubscriptions>>) {
  return (
    <Section title="Obuna">
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-line bg-card p-4">
        <form action={setSubscriptionPriceAction} className="flex items-end gap-2">
          <label className="grid gap-1 text-sm text-hint">
            Oylik narx, so'm
            <input name="price" defaultValue={price} inputMode="numeric" className="w-40 field text-ink" />
          </label>
          <button className="btn btn-sm btn-primary">Saqlash</button>
        </form>
        <form className="flex items-end gap-2">
          <input name="q" defaultValue={q} placeholder="Nomi yoki telefon" className="w-56 field" />
          <button className="rounded-lg border border-line px-4 py-2 text-sm text-hint">Qidirish</button>
        </form>
      </div>
      <p className="text-sm text-hint">
        Platforma kassalari (Vercel env: PLATFORM_PAYME_*, PLATFORM_CLICK_*). Payme: {platformPayme() ? "ulangan" : "ulanmagan"}, kabinetga manzil{" "}
        <code>{publicUrl()}/api/subscription/payme</code>. Click: {platformClick() ? "ulangan" : "ulanmagan"}, manzillar <code>{publicUrl()}/api/subscription/click/prepare</code> va{" "}
        <code>.../complete</code>. To'lov sahifasi: <code>{publicUrl()}/obuna</code>
      </p>
      {!q && <p className="text-sm text-hint">Muddati {WARN_DAYS} kun ichida tugaydigan yoki tugagan tashkilotlar:</p>}
      {orgs.length === 0 && <p className="text-sm text-hint">Topilmadi.</p>}
      {orgs.map(({ kind, org }) => {
        const info = subscriptionInfo(org);
        return (
          <div
            key={`${kind}:${org.id}`}
            className={`flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4 ${info.state === "EXPIRED" ? "border-danger/40" : info.state === "GRACE" ? "border-warn/40" : "border-line"}`}
          >
            <div className="min-w-0 flex-1">
              <div className="font-medium">
                {org.name} <span className="ml-1 text-xs text-hint">{kind === "distributor" ? "distribyutor" : "do'kon"}</span>
              </div>
              <div className="text-sm text-hint">{subscriptionLabel(info)}</div>
            </div>
            <form action={extendSubscriptionAction} className="flex items-center gap-2">
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="id" value={org.id} />
              <input type="hidden" name="q" value={q} />
              <select name="months" defaultValue="1" className="rounded-lg border border-line px-2 py-2 text-sm">
                {MONTH_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    +{m} oy
                  </option>
                ))}
              </select>
              <button className="rounded-lg border border-line px-4 py-2 text-sm text-hint">Uzaytirish</button>
            </form>
          </div>
        );
      })}
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-2 grid gap-2">{children}</div>
    </section>
  );
}

function Row({ pending, title, lines, action, id }: { pending: boolean; title: string; lines: string[]; action: (f: FormData) => Promise<void>; id: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4 ${pending ? "border-warn/40" : "border-line"}`}>
      <div className="min-w-0 flex-1">
        <div className="font-medium">
          {title} {pending && <span className="ml-2 rounded bg-warn-soft px-2 py-0.5 text-xs text-warn">tekshiruvda</span>}
        </div>
        {lines.map((l) => (
          <div key={l} className="text-sm text-hint">
            {l}
          </div>
        ))}
      </div>
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value={pending ? "ACTIVE" : "PENDING"} />
        {pending ? (
          <button className="btn btn-sm btn-primary">Tasdiqlash</button>
        ) : (
          <ConfirmButton message={`${title}: to'xtatilsinmi? Do'konlar va hamkorlar uni ko'rmay qoladi.`} className="btn btn-sm btn-danger">
            To'xtatish
          </ConfirmButton>
        )}
      </form>
    </div>
  );
}

function Login({ phone, error, devCode }: { phone?: string; error?: string; devCode?: string }) {
  return (
    <main className="mx-auto grid max-w-sm gap-4 p-6 pt-24">
      <h1 className="text-xl font-semibold">Platforma admini</h1>
      {error && <p className="text-sm text-danger">{error}</p>}
      {!phone ? (
        <form action={requestAdminCode} className="grid gap-3">
          <input name="phone" placeholder="+998 90 123 45 67" className="field" />
          <button className="btn btn-primary">Kod olish</button>
        </form>
      ) : (
        <form action={verifyAdminCode} className="grid gap-3">
          <input type="hidden" name="phone" value={phone} />
          <p className="text-sm text-hint">{phone} raqami adminlar ro'yxatida bo'lsa, unga SMS kod yuborildi.</p>
          {devCode && <p className="text-sm text-accent-ink">Sinov rejimi: kod {devCode}</p>}
          <input name="code" inputMode="numeric" maxLength={6} placeholder="SMS kod" className="field" />
          <button className="btn btn-primary">Kirish</button>
        </form>
      )}
      {devAuthEnabled() && (
        <form action={devAdminLogin}>
          <button className="w-full rounded-lg border border-line py-2 text-sm text-hint">Sinov rejimida kirish</button>
        </form>
      )}
    </main>
  );
}
