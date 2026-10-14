import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/money";
import { getStaff } from "@/lib/session";
import { approveLinkRequest, rejectLinkRequest } from "../actions";

export const dynamic = "force-dynamic";

// Ilova orqali o'zi topib, ulanishni so'ragan do'konlar
export default async function PanelRequests({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const staff = await getStaff();
  if (!staff) redirect("/panel");
  const { error } = await searchParams;
  const distributorId = staff.distributorId;
  const isAdmin = staff.role === "ADMIN";

  const [requests, groups] = await Promise.all([
    db.shopLink.findMany({
      where: { distributorId, status: "REQUESTED" },
      include: { shop: { include: { users: { where: { role: "OWNER" }, take: 1 } } } },
      orderBy: { createdAt: "asc" },
    }),
    db.priceGroup.findMany({ where: { distributorId }, orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Ulanish so'rovlari</h1>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-1 text-sm text-gray-500">Ilovada sizni topib, ulanishni so'ragan do'konlar. Tasdiqlasangiz, katalogingizni ko'rib buyurtma bera oladi.</p>
      {!isAdmin && <p className="mt-2 text-sm text-amber-700">So'rovlarni faqat admin tasdiqlaydi yoki rad etadi.</p>}

      {requests.length === 0 && <p className="mt-6 text-gray-500">Yangi so'rov yo'q.</p>}

      <div className="mt-4 grid gap-3">
        {requests.map((r) => {
          const owner = r.shop.users[0];
          const servesDistrict = staff.distributor.districts.includes(r.shop.district);
          return (
            <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                <span className="font-semibold">{r.shop.name}</span>
                <span className="text-sm text-gray-600">{r.shop.address}</span>
                <span className={`text-sm ${servesDistrict ? "text-gray-500" : "text-amber-700"}`}>
                  {r.shop.district}
                  {!servesDistrict && " · hududingizdan tashqarida"}
                </span>
                {owner && (
                  <span className="text-sm text-gray-500">
                    {owner.name} · {owner.phone}
                  </span>
                )}
                <span className="ml-auto text-sm text-gray-500">{formatDate(r.createdAt)}</span>
              </div>

              {isAdmin && (
                <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-gray-100 pt-3">
                  <form action={approveLinkRequest} className="flex flex-wrap items-end gap-3">
                    <input type="hidden" name="linkId" value={r.id} />
                    <label className="text-sm">
                      <span className="block text-gray-500">Narx guruhi</span>
                      <select name="priceGroupId" className="mt-1 rounded-lg border border-gray-300 px-3 py-2">
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="block text-gray-500">Nasiya limiti, so'm (0 = nasiyasiz)</span>
                      <input name="creditLimit" defaultValue="0" inputMode="numeric" className="mt-1 w-44 rounded-lg border border-gray-300 px-3 py-2" />
                    </label>
                    <label className="text-sm">
                      <span className="block text-gray-500">Nasiya muddati, kun</span>
                      <input name="creditDays" defaultValue="14" inputMode="numeric" className="mt-1 w-24 rounded-lg border border-gray-300 px-3 py-2" />
                    </label>
                    <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">Tasdiqlash</button>
                  </form>
                  <form action={rejectLinkRequest}>
                    <input type="hidden" name="linkId" value={r.id} />
                    <button className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600">Rad etish</button>
                  </form>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
