import Link from "next/link";
import { redirect } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { formatDateTime, formatSom } from "@/lib/money";
import { getStaff } from "@/lib/session";
import { acceptOrder, deliverOrder, rejectOrder, shipOrder } from "../actions";

export const dynamic = "force-dynamic";

const TABS: { status: OrderStatus; label: string }[] = [
  { status: "SENT", label: "Yangi" },
  { status: "ACCEPTED", label: "Qabul qilingan" },
  { status: "IN_DELIVERY", label: "Yo'lda" },
  { status: "DELIVERED", label: "Topshirilgan" },
  { status: "REJECTED", label: "Rad etilgan" },
];

const PAYMENT: Record<string, string> = { CASH: "Naqd", TRANSFER: "O'tkazma", CREDIT: "Nasiya" };

export default async function PanelOrders({ searchParams }: { searchParams: Promise<{ status?: string; error?: string }> }) {
  const staff = await getStaff();
  if (!staff) redirect("/panel");
  const { status: raw, error } = await searchParams;
  const status = (TABS.find((t) => t.status === raw)?.status ?? "SENT") as OrderStatus;

  const orders = await db.order.findMany({
    where: { shopLink: { distributorId: staff.distributorId }, status },
    include: {
      shopLink: { include: { shop: true } },
      items: { include: { product: { select: { name: true, sku: true } } } },
      createdByShopUser: { select: { name: true } },
      createdByStaff: { select: { name: true } },
    },
    orderBy: { createdAt: status === "SENT" ? "asc" : "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Buyurtmalar</h1>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.status}
            href={`/panel/orders?status=${t.status}`}
            className={`rounded-full px-3 py-1 text-sm ${t.status === status ? "bg-accent text-white" : "border border-line bg-card"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {orders.length === 0 && <p className="mt-6 text-hint">Bu holatda buyurtma yo'q.</p>}

      <div className="mt-4 grid gap-3">
        {orders.map((o) => (
          <details key={o.id} className="rounded-xl border border-line bg-card">
            <summary className="flex cursor-pointer flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3">
              <span className="font-semibold">№{o.number}</span>
              <span>{o.shopLink.shop.name}</span>
              <span className="text-sm text-hint">{formatDateTime(o.createdAt)}</span>
              <span className="text-sm text-hint">{PAYMENT[o.paymentType]}</span>
              <span className="text-sm text-hint">
                {o.source === "AGENT" ? `Agent: ${o.createdByStaff?.name ?? "—"}` : `Ilova: ${o.createdByShopUser?.name ?? "—"}`}
              </span>
              <span className="ml-auto font-semibold">{formatSom(o.deliveredTotal ?? o.total)}</span>
            </summary>
            <div className="border-t border-line px-4 py-3">
              <table className="w-full text-sm">
                <thead className="text-left text-hint">
                  <tr>
                    <th className="py-1 font-medium">Artikul</th>
                    <th className="py-1 font-medium">Tovar</th>
                    <th className="py-1 text-right font-medium">Miqdor</th>
                    <th className="py-1 text-right font-medium">Narx</th>
                    <th className="py-1 text-right font-medium">Summa</th>
                  </tr>
                </thead>
                <tbody>
                  {o.items.map((it) => (
                    <tr key={it.id} className="border-t border-line">
                      <td className="py-1 text-hint">{it.product.sku}</td>
                      <td className="py-1">{it.product.name}</td>
                      <td className="py-1 text-right">{it.deliveredQty ?? it.qty}</td>
                      <td className="py-1 text-right">{formatSom(it.price)}</td>
                      <td className="py-1 text-right">{formatSom((it.deliveredQty ?? it.qty) * it.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {o.rejectReason && <p className="mt-2 text-sm text-danger">Rad etish sababi: {o.rejectReason}</p>}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {o.status === "SENT" && (
                  <>
                    <form action={acceptOrder}>
                      <input type="hidden" name="orderId" value={o.id} />
                      <button className="btn btn-sm btn-primary">Qabul qilish</button>
                    </form>
                    <form action={rejectOrder} className="flex gap-2">
                      <input type="hidden" name="orderId" value={o.id} />
                      <input name="reason" placeholder="Rad etish sababi" className="field text-sm" />
                      <button className="rounded-lg border border-danger/40 px-4 py-2 text-sm text-danger">Rad etish</button>
                    </form>
                  </>
                )}
                {o.status === "ACCEPTED" && (
                  <form action={shipOrder}>
                    <input type="hidden" name="orderId" value={o.id} />
                    <button className="btn btn-sm btn-primary">Yo'lga chiqarish</button>
                  </form>
                )}
                {o.status === "IN_DELIVERY" && (
                  <form action={deliverOrder}>
                    <input type="hidden" name="orderId" value={o.id} />
                    <button className="btn btn-sm btn-primary">Topshirildi</button>
                  </form>
                )}
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
