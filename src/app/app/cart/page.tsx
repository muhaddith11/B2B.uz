"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatSom } from "@/lib/money";
import { useShop } from "../shop-context";
import { QtyStepper } from "../qty-stepper";
import { PAYMENT_LABEL, type CatalogData, type HomeData, type LinkSummary, type PaymentType } from "../types";

type Group = { link: LinkSummary; catalog: CatalogData };
type Result = { ok: true; number: number } | { ok: false; error: string };

export default function CartPage() {
  const { api, cart, setQty, clearDistributor, haptic } = useShop();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [payment, setPayment] = useState<Record<string, PaymentType>>({});
  const [results, setResults] = useState<Record<string, Result>>({});
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const distIds = Object.keys(cart);
  const distKey = distIds.sort().join(",");

  useEffect(() => {
    (async () => {
      try {
        const home = await api<HomeData>("/api/shop/home");
        const ids = distKey ? distKey.split(",") : [];
        const loaded = await Promise.all(
          ids.map(async (id) => {
            const link = home.links.find((l) => l.distributor.id === id);
            if (!link) return null;
            const catalog = await api<CatalogData>(`/api/shop/catalog?distributorId=${encodeURIComponent(id)}`);
            return { link, catalog };
          }),
        );
        setGroups(loaded.filter((g): g is Group => g !== null));
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, [api, distKey]);

  async function submit() {
    if (!groups) return;
    setSending(true);
    const next: Record<string, Result> = {};
    for (const g of groups) {
      const id = g.catalog.distributor.id;
      const items = Object.entries(cart[id] ?? {}).map(([productId, qty]) => ({ productId, qty }));
      if (items.length === 0) continue;
      try {
        const res = await api<{ number: number }>("/api/shop/orders", {
          method: "POST",
          body: JSON.stringify({ distributorId: id, paymentType: payment[id] ?? "CASH", items }),
        });
        next[id] = { ok: true, number: res.number };
        clearDistributor(id);
      } catch (e) {
        next[id] = { ok: false, error: (e as Error).message };
      }
    }
    setResults(next);
    setSending(false);
    haptic(Object.values(next).every((r) => r.ok) ? "success" : "error");
  }

  if (err) return <p className="p-6 text-app-danger">{err}</p>;

  const sent = Object.entries(results).filter(([, r]) => r.ok) as [string, { ok: true; number: number }][];

  if (distIds.length === 0)
    return (
      <div className="p-6 text-center">
        {sent.length > 0 ? (
          <>
            <h1 className="text-lg font-semibold">Buyurtma yuborildi</h1>
            <p className="mt-2 text-app-hint">Raqam: {sent.map(([, r]) => `№${r.number}`).join(", ")}</p>
            <Link href="/app/orders" className="mt-4 inline-block text-app-accent">
              Buyurtmalarimni ko'rish
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold">Savat bo'sh</h1>
            <Link href="/app" className="mt-4 inline-block text-app-accent">
              Katalogga o'tish
            </Link>
          </>
        )}
      </div>
    );

  if (!groups) return <p className="p-6 text-app-hint">Yuklanmoqda…</p>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Savat</h1>
      {sent.length > 0 && (
        <p className="mt-2 rounded-xl bg-app-card p-3 text-sm text-app-ok">
          Yuborildi: {sent.map(([, r]) => `№${r.number}`).join(", ")}
        </p>
      )}

      {groups.map(({ link, catalog }) => {
        const id = catalog.distributor.id;
        const lines = catalog.products.filter((p) => (cart[id]?.[p.id] ?? 0) > 0);
        if (lines.length === 0) return null;
        const total = lines.reduce((s, p) => s + (cart[id][p.id] ?? 0) * p.price, 0);
        const minLeft = Math.max(0, catalog.distributor.minOrder - total);
        // Muddati o'tgan qarz bo'yicha bloklashni server hal qiladi (distribyutor sozlamasiga qarab)
        const creditOk = link.creditLimit > 0 && link.creditAvailable >= total;
        const pay = payment[id] ?? "CASH";
        const result = results[id];

        return (
          <section key={id} className="mt-4 rounded-2xl bg-app-card p-3">
            <h2 className="font-semibold">{catalog.distributor.name}</h2>
            <ul className="mt-2 divide-y divide-black/5">
              {lines.map((p) => {
                const qty = cart[id][p.id];
                return (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm">{p.name}</div>
                      <div className="text-xs text-app-hint">
                        {qty} {p.unit} · {formatSom(qty * p.price)}
                      </div>
                    </div>
                    <QtyStepper packs={Math.floor(qty / p.packSize)} onChange={(n) => setQty(id, p.id, Math.max(0, n) * p.packSize)} />
                  </li>
                );
              })}
            </ul>

            <div className="mt-2 flex items-center justify-between font-semibold">
              <span>Jami</span>
              <span>{formatSom(total)}</span>
            </div>
            {minLeft > 0 && <p className="mt-1 text-sm text-app-danger">Minimal buyurtmagacha yana {formatSom(minLeft)}</p>}

            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["CASH", "TRANSFER", "CREDIT"] as const).map((t) => {
                const disabled = t === "CREDIT" && !creditOk;
                return (
                  <button
                    key={t}
                    disabled={disabled}
                    onClick={() => setPayment((s) => ({ ...s, [id]: t }))}
                    className={`rounded-xl px-2 py-2 text-sm ${pay === t ? "bg-app-accent text-app-accent-text" : "bg-app-bg"} disabled:opacity-40`}
                  >
                    {PAYMENT_LABEL[t]}
                  </button>
                );
              })}
            </div>
            {link.creditLimit > 0 && (
              <p className="mt-1 text-xs text-app-hint">
                Bo'sh nasiya: {formatSom(link.creditAvailable)}
                {link.overdueAmount > 0 ? " · muddati o'tgan qarz bor" : ""}
              </p>
            )}
            {result && !result.ok && <p className="mt-2 text-sm text-app-danger">{result.error}</p>}
          </section>
        );
      })}

      <button
        onClick={submit}
        disabled={sending}
        className="mt-4 w-full rounded-2xl bg-app-accent py-3 font-medium text-app-accent-text disabled:opacity-50"
      >
        {sending ? "Yuborilmoqda…" : "Buyurtma berish"}
      </button>
    </div>
  );
}
