import { db } from "@/lib/db";
import { formatDate, formatSom } from "@/lib/money";
import { devAuthEnabled, getAdmin } from "@/lib/session";
import { adminLogout, devAdminLogin, requestAdminCode, setBrandStatus, setDistributorStatus, verifyAdminCode } from "./actions";

export const dynamic = "force-dynamic";

// Platforma admini: yangi distribyutor va tovar egalarini tekshirib tasdiqlaydi
export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await getAdmin();
  const params = await searchParams;
  if (!admin) return <Login phone={params.phone} error={params.error} devCode={params.dev} />;

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [distributors, brands, shops, orders] = await Promise.all([
    db.distributor.findMany({
      include: { staff: { where: { role: "ADMIN" }, take: 1 }, _count: { select: { links: { where: { status: "ACTIVE" } }, products: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    db.brand.findMany({ include: { users: { take: 1 }, _count: { select: { products: true, agreements: { where: { status: "ACTIVE" } } } } }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] }),
    db.shop.count(),
    db.order.aggregate({ where: { status: "DELIVERED", updatedAt: { gte: since } }, _count: true, _sum: { deliveredTotal: true } }),
  ]);

  return (
    <div className="min-h-dvh bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="font-semibold">Savdo platformasi · admin</div>
          <form action={adminLogout}>
            <button className="text-sm text-gray-500 hover:text-gray-900">Chiqish</button>
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
            <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-sm text-gray-500">{label}</div>
              <div className="mt-1 text-lg font-semibold">{value}</div>
            </div>
          ))}
        </div>

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
    <div className={`flex flex-wrap items-center gap-4 rounded-xl border bg-white p-4 ${pending ? "border-amber-300" : "border-gray-200"}`}>
      <div className="min-w-0 flex-1">
        <div className="font-medium">
          {title} {pending && <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">tekshiruvda</span>}
        </div>
        {lines.map((l) => (
          <div key={l} className="text-sm text-gray-500">
            {l}
          </div>
        ))}
      </div>
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value={pending ? "ACTIVE" : "PENDING"} />
        <button className={pending ? "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white" : "rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600"}>
          {pending ? "Tasdiqlash" : "To'xtatish"}
        </button>
      </form>
    </div>
  );
}

function Login({ phone, error, devCode }: { phone?: string; error?: string; devCode?: string }) {
  return (
    <main className="mx-auto grid max-w-sm gap-4 p-6 pt-24">
      <h1 className="text-xl font-semibold">Platforma admini</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!phone ? (
        <form action={requestAdminCode} className="grid gap-3">
          <input name="phone" placeholder="+998 90 123 45 67" className="rounded-lg border border-gray-300 px-3 py-2" />
          <button className="rounded-lg bg-blue-600 py-2 font-medium text-white">Kod olish</button>
        </form>
      ) : (
        <form action={verifyAdminCode} className="grid gap-3">
          <input type="hidden" name="phone" value={phone} />
          <p className="text-sm text-gray-600">{phone} raqamiga SMS kod yuborildi.</p>
          {devCode && <p className="text-sm text-blue-600">Sinov rejimi: kod {devCode}</p>}
          <input name="code" inputMode="numeric" maxLength={6} placeholder="SMS kod" className="rounded-lg border border-gray-300 px-3 py-2" />
          <button className="rounded-lg bg-blue-600 py-2 font-medium text-white">Kirish</button>
        </form>
      )}
      {devAuthEnabled() && (
        <form action={devAdminLogin}>
          <button className="w-full rounded-lg border border-gray-300 py-2 text-sm text-gray-600">Sinov rejimida kirish</button>
        </form>
      )}
    </main>
  );
}
