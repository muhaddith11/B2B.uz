"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { formatSom } from "@/lib/money";
import { useShop } from "../../shop-context";
import { QtyStepper } from "../../qty-stepper";
import type { CatalogData } from "../../types";

export default function CatalogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { api, cart, setQty } = useShop();
  const [data, setData] = useState<CatalogData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api<CatalogData>(`/api/shop/catalog?distributorId=${encodeURIComponent(id)}`).then(setData).catch((e) => setErr(e.message));
  }, [api, id]);

  const categories = useMemo(() => [...new Set(data?.products.map((p) => p.category) ?? [])], [data]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.products ?? []).filter(
      (p) => (!category || p.category === category) && (!q || `${p.name} ${p.brand}`.toLowerCase().includes(q)),
    );
  }, [data, category, query]);

  if (err) return <p className="p-6 text-app-danger">{err}</p>;
  if (!data) return <p className="p-6 text-app-hint">Yuklanmoqda…</p>;

  const inCart = cart[id] ?? {};
  const cartTotal = data.products.reduce((s, p) => s + (inCart[p.id] ?? 0) * p.price, 0);

  return (
    <div>
      <div className="sticky top-0 z-10 bg-app-bg p-4 pb-2">
        <Link href="/app" className="text-sm text-app-accent">
          ← Orqaga
        </Link>
        <h1 className="mt-1 text-lg font-semibold">{data.distributor.name}</h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tovar qidirish"
          className="mt-2 w-full rounded-xl bg-app-card px-3 py-2 text-sm outline-none"
        />
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {[null, ...categories].map((c) => (
            <button
              key={c ?? "all"}
              onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full px-3 py-1 text-sm ${category === c ? "bg-app-accent text-app-accent-text" : "bg-app-card"}`}
            >
              {c ?? "Hammasi"}
            </button>
          ))}
        </div>
      </div>

      <ul className="grid gap-2 px-4">
        {shown.map((p) => {
          const packs = Math.floor((inCart[p.id] ?? 0) / p.packSize);
          return (
            <li key={p.id} className="rounded-2xl bg-app-card p-3">
              <div className="font-medium leading-snug">{p.name}</div>
              <div className="mt-0.5 text-xs text-app-hint">
                {p.brand} · yashikda {p.packSize} {p.unit}
                {p.marked ? " · markirovkali" : ""}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{formatSom(p.price)}</div>
                  <div className="text-xs text-app-hint">yashik: {formatSom(p.price * p.packSize)}</div>
                </div>
                {p.inStock ? (
                  <QtyStepper packs={packs} onChange={(n) => setQty(id, p.id, Math.max(0, n) * p.packSize)} />
                ) : (
                  <span className="text-sm text-app-hint">Tugagan</span>
                )}
              </div>
            </li>
          );
        })}
        {shown.length === 0 && <li className="p-4 text-center text-sm text-app-hint">Hech narsa topilmadi</li>}
      </ul>

      {cartTotal > 0 && (
        <Link
          href="/app/cart"
          className="fixed inset-x-4 bottom-20 mx-auto block max-w-lg rounded-2xl bg-app-accent px-4 py-3 text-center font-medium text-app-accent-text shadow-lg"
        >
          Savatga o'tish · {formatSom(cartTotal)}
        </Link>
      )}
    </div>
  );
}
