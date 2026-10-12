"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatSom } from "@/lib/money";
import { useShop } from "../shop-context";
import type { DiscoverData } from "../types";

// Yangi distribyutor topish: hudud, toifa, tovar yoki brend bo'yicha
export default function FindPage() {
  const { api, haptic } = useShop();
  const [data, setData] = useState<DiscoverData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category) params.set("category", category);
    const t = setTimeout(() => {
      api<DiscoverData>(`/api/shop/distributors?${params}`)
        .then((d) => {
          setData(d);
          setErr(null);
        })
        .catch((e) => setErr(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [api, query, category]);

  async function request(distributorId: string) {
    setBusyId(distributorId);
    try {
      await api("/api/shop/distributors", { method: "POST", body: JSON.stringify({ distributorId }) });
      setData((d) => d && { ...d, distributors: d.distributors.map((x) => (x.id === distributorId ? { ...x, requested: true } : x)) });
      haptic("success");
    } catch (e) {
      setErr((e as Error).message);
      haptic("error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="sticky top-0 z-10 bg-app-bg p-4 pb-2">
        <Link href="/app" className="text-sm text-app-accent">
          ← Orqaga
        </Link>
        <h1 className="mt-1 text-lg font-semibold">Yangi distribyutor topish</h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Distribyutor, tovar yoki brend"
          className="mt-2 w-full rounded-xl bg-app-card px-3 py-2 text-sm outline-none"
        />
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {[null, ...(data?.categories ?? [])].map((c) => (
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

      {err && <p className="px-4 pb-2 text-sm text-app-danger">{err}</p>}
      {!data && !err && <p className="p-6 text-app-hint">Yuklanmoqda…</p>}

      <ul className="grid gap-2 px-4">
        {data?.distributors.map((d) => (
          <li key={d.id} className="rounded-2xl bg-app-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="font-medium">{d.name}</div>
              {d.servesYou ? (
                <span className="shrink-0 text-xs font-medium text-app-ok">Hududingizga yetkazadi</span>
              ) : (
                <span className="shrink-0 text-xs text-app-hint">Boshqa hudud</span>
              )}
            </div>
            <div className="mt-1 text-sm text-app-hint">{d.categories.join(", ")}</div>
            <div className="mt-2 grid gap-0.5 text-sm">
              <span>
                {d.productCount} ta tovar{d.brands.length > 0 && ` · ${d.brands.join(", ")}`}
              </span>
              <span className="text-app-hint">
                Minimal buyurtma: {formatSom(d.minOrder)} · yetkazish: {d.deliveryDays.join(", ")}
              </span>
              <span className="text-app-hint">Hududlar: {d.districts.join(", ")}</span>
            </div>
            <div className="mt-3">
              {d.requested ? (
                <div className="rounded-xl bg-app-bg py-2 text-center text-sm text-app-hint">So'rov yuborilgan · javob kutilmoqda</div>
              ) : (
                <button
                  onClick={() => request(d.id)}
                  disabled={busyId === d.id}
                  className="w-full rounded-xl bg-app-accent py-2 text-sm font-medium text-app-accent-text disabled:opacity-60"
                >
                  {busyId === d.id ? "Yuborilmoqda…" : "Ulanish so'rovini yuborish"}
                </button>
              )}
            </div>
          </li>
        ))}
        {data && data.distributors.length === 0 && (
          <li className="p-4 text-center text-sm text-app-hint">
            {query || category ? "Hech narsa topilmadi" : "Hozircha yangi distribyutor yo'q: barchasiga ulangansiz"}
          </li>
        )}
      </ul>
    </div>
  );
}
