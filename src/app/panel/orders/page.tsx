import Link from "next/link";
import { redirect } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { formatDateTime, formatSom } from "@/lib/money";
import { cursorArgs, pageOf } from "@/lib/paging";
import { getStaff } from "@/lib/session";
import { acceptOrder, deliverOrder, rejectOrder, shipOrder } from "../actions";
import { panelT } from "../panel-lang";
import type { PanelKey } from "../texts";

export const dynamic = "force-dynamic";

const PAGE = 50;

const TABS: { status: OrderStatus; label: PanelKey }[] = [
  { status: "SENT", label: "Yangi" },
  { status: "ACCEPTED", label: "Qabul qilingan" },
  { status: "IN_DELIVERY", label: "Yo'lda" },
  { status: "DELIVERED", label: "Topshirilgan" },
  { status: "REJECTED", label: "Rad etilgan" },
];

const PAYMENT: Record<string, PanelKey> = { CASH: "Naqd", TRANSFER: "O'tkazma", CREDIT: "Nasiya" };

export default async function PanelOrders({ searchParams }: { searchParams: Promise<{ status?: string; error?: string; cursor?: string }> }) {
  const staff = await getStaff();
  if (!staff) redirect("/panel");
  const { t } = await panelT();
  const { status: raw, error, cursor } = await searchParams;
  const status = (TABS.find((tab) => tab.status === raw)?.status ?? "SENT") as OrderStatus;
  const page = { limit: PAGE, cursor: cursor?.slice(0, 64) || null };
  // Yangi buyurtmalar navbat bilan (eng eskisi birinchi), qolganlari eng yangisidan
  const dir = status === "SENT" ? "asc" : "desc";

  const rows = await db.order.findMany({
    where: { shopLink: { distributorId: staff.distributorId }, status },
    include: {
      shopLink: { include: { shop: true } },
      items: { include: { product: { select: { name: true, sku: true } } } },
      createdByShopUser: { select: { name: true } },
      createdByStaff: { select: { name: true } },
    },
    orderBy: [{ createdAt: dir }, { id: dir }],
    ...cursorArgs(page),
  });
  const { items: orders, nextCursor } = pageOf(rows, page);

  return (
    <div>
      <h1 className="text-2xl font-semibold">{t("Buyurtmalar")}</h1>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.status}
            href={`/panel/orders?status=${tab.status}`}
            className={`rounded-full px-3 py-1 text-sm ${tab.status === status ? "bg-accent text-white" : "border border-line bg-card"}`}
          >
            {t(tab.label)}
          </Link>
        ))}
      </div>

      {orders.length === 0 && <p className="mt-6 text-hint">{t("Bu holatda buyurtma yo'q.")}</p>}

      <div className="mt-4 grid gap-3">
        {orders.map((o) => (
          <details key={o.id} className="rounded-xl border border-line bg-card">
            <summary className="flex cursor-pointer flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3">
              <span className="font-semibold">№{o.number}</span>
              <span>{o.shopLink.shop.name}</span>
              <span className="text-sm text-hint">{formatDateTime(o.createdAt)}</span>
              <span className="text-sm text-hint">{t(PAYMENT[o.paymentType])}</span>
              <span className="text-sm text-hint">
                {o.source === "AGENT" ? t("Agent: {name}", { name: o.createdByStaff?.name ?? "—" }) : t("Ilova: {name}", { name: o.createdByShopUser?.name ?? "—" })}
              </span>
              <span className="ml-auto font-semibold">{formatSom(o.deliveredTotal ?? o.total)}</span>
            </summary>
            <div className="border-t border-line px-4 py-3">
              <table className="w-full text-sm">
                <thead className="text-left text-hint">
                  <tr>
                    <th className="py-1 font-medium">{t("Artikul")}</th>
                    <th className="py-1 font-medium">{t("Tovar")}</th>
                    <th className="py-1 text-right font-medium">{t("Miqdor")}</th>
                    <th className="py-1 text-right font-medium">{t("Narx")}</th>
                    <th className="py-1 text-right font-medium">{t("Summa")}</th>
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
              {o.rejectReason && <p className="mt-2 text-sm text-danger">{t("Rad etish sababi: {reason}", { reason: o.rejectReason })}</p>}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {o.status === "SENT" && (
                  <>
                    <form action={acceptOrder}>
                      <input type="hidden" name="orderId" value={o.id} />
                      <button className="btn btn-sm btn-primary">{t("Qabul qilish")}</button>
                    </form>
                    <form action={rejectOrder} className="flex gap-2">
                      <input type="hidden" name="orderId" value={o.id} />
                      <input name="reason" placeholder={t("Rad etish sababi")} className="field text-sm" />
                      <button className="rounded-lg border border-danger/40 px-4 py-2 text-sm text-danger">{t("Rad etish")}</button>
                    </form>
                  </>
                )}
                {o.status === "ACCEPTED" && (
                  <form action={shipOrder}>
                    <input type="hidden" name="orderId" value={o.id} />
                    <button className="btn btn-sm btn-primary">{t("Yo'lga chiqarish")}</button>
                  </form>
                )}
                {o.status === "IN_DELIVERY" && (
                  <form action={deliverOrder}>
                    <input type="hidden" name="orderId" value={o.id} />
                    <button className="btn btn-sm btn-primary">{t("Topshirildi")}</button>
                  </form>
                )}
              </div>
            </div>
          </details>
        ))}
      </div>
      {(nextCursor || cursor) && (
        <div className="mt-4 flex gap-4 text-sm">
          {cursor && (
            <Link href={`/panel/orders?status=${status}`} className="text-accent-ink hover:underline">
              {t("Birinchi sahifa")}
            </Link>
          )}
          {nextCursor && (
            <Link href={`/panel/orders?status=${status}&cursor=${nextCursor}`} className="ml-auto text-accent-ink hover:underline">
              {t("Keyingi sahifa →")}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
