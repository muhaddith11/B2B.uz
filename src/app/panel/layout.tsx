import Link from "next/link";
import { db } from "@/lib/db";
import { getStaff } from "@/lib/session";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaff();
  const requests = staff ? await db.shopLink.count({ where: { distributorId: staff.distributorId, status: "REQUESTED" } }) : 0;
  return (
    <div className="min-h-dvh bg-gray-50 text-gray-900">
      {staff && (
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <div>
              <div className="font-semibold">{staff.distributor.name}</div>
              <div className="text-xs text-gray-500">{staff.name}</div>
            </div>
            <nav className="flex gap-4 text-sm">
              <Link href="/panel" className="hover:text-blue-600">
                Bugun
              </Link>
              <Link href="/panel/orders" className="hover:text-blue-600">
                Buyurtmalar
              </Link>
              <Link href="/panel/products" className="hover:text-blue-600">
                Tovarlar
              </Link>
              <Link href="/panel/requests" className="hover:text-blue-600">
                Ulanish so'rovlari
                {requests > 0 && <span className="ml-1 rounded-full bg-blue-600 px-1.5 text-xs text-white">{requests}</span>}
              </Link>
            </nav>
            <form action="/api/panel/login" method="post" className="ml-auto">
              <input type="hidden" name="action" value="logout" />
              <button className="text-sm text-gray-500 hover:text-gray-900">Chiqish</button>
            </form>
          </div>
        </header>
      )}
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
