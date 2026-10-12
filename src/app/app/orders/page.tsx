"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatSom } from "@/lib/money";
import { useShop } from "../shop-context";
import { PAYMENT_LABEL, STATUS_LABEL, type OrderStatus, type ShopOrder } from "../types";

const STATUS_COLOR: Record<OrderStatus, string> = {
  SENT: "text-app-hint",
  ACCEPTED: "text-app-accent",
  IN_DELIVERY: "text-app-accent",
  DELIVERED: "text-app-ok",
  REJECTED: "text-app-danger",
  CANCELLED: "text-app-hint",
};

export default function OrdersPage() {
  const { api, setQty } = useShop();
  const router = useRouter();
  const [orders, setOrders] = useState<ShopOrder[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<{ orders: ShopOrder[] }>("/api/shop/orders")
      .then((d) => setOrders(d.orders))
      .catch((e) => setErr(e.message));
  }, [api]);

  // Takrorlash: oldingi buyurtmani savatga qaytaradi; narx savatda yangi prays bo'yicha hisoblanadi
  function repeat(o: ShopOrder) {
    for (const it of o.items) setQty(o.distributor.id, it.productId, it.qty);
    router.push("/app/cart");
  }

  if (err) return <p className="p-6 text-app-danger">{err}</p>;
  if (!orders) return <p className="p-6 text-app-hint">Yuklanmoqda…</p>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Buyurtmalarim</h1>
      {orders.length === 0 && <p className="mt-4 text-app-hint">Hali buyurtma yo'q.</p>}
      <ul className="mt-3 grid gap-2">
        {orders.map((o) => {
          const changed = o.items.some((i) => i.deliveredQty !== null && i.deliveredQty !== i.qty);
          return (
            <li key={o.id} className="rounded-2xl bg-app-card p-3">
              <button onClick={() => setOpen(open === o.id ? null : o.id)} className="w-full text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">№{o.number}</span>
                  <span className={`text-sm font-medium ${STATUS_COLOR[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                </div>
                <div className="mt-0.5 text-sm text-app-hint">{o.distributor.name}</div>
                <div className="mt-1 flex justify-between text-sm">
                  <span>
                    {formatDate(o.createdAt)} · {PAYMENT_LABEL[o.paymentType]}
                  </span>
                  <span className="font-medium">{formatSom(o.deliveredTotal ?? o.total)}</span>
                </div>
                {changed && <div className="mt-1 text-xs text-app-danger">Distribyutor miqdorni o'zgartirgan</div>}
                {o.rejectReason && <div className="mt-1 text-xs text-app-danger">Sabab: {o.rejectReason}</div>}
              </button>
              {open === o.id && (
                <div className="mt-2 border-t border-black/5 pt-2">
                  <ul className="grid gap-1 text-sm">
                    {o.items.map((it) => (
                      <li key={it.productId} className="flex justify-between gap-2">
                        <span className="truncate">{it.name}</span>
                        <span className="shrink-0 text-app-hint">
                          {it.deliveredQty !== null && it.deliveredQty !== it.qty ? `${it.deliveredQty}/${it.qty}` : it.qty} dona
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => repeat(o)} className="mt-3 w-full rounded-xl bg-app-bg py-2 text-sm font-medium text-app-accent">
                    Takrorlash
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
