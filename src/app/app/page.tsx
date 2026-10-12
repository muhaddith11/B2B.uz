"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDate, formatSom } from "@/lib/money";
import { useShop } from "./shop-context";
import type { HomeData } from "./types";

export default function HomePage() {
  const { api, logout } = useShop();
  const [data, setData] = useState<HomeData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<HomeData>("/api/shop/home").then(setData).catch((e) => setErr(e.message));
  }, [api]);

  if (err) return <p className="p-6 text-app-danger">{err}</p>;
  if (!data) return <p className="p-6 text-app-hint">Yuklanmoqda…</p>;

  const totalDebt = data.links.reduce((s, l) => s + l.debt, 0);
  const totalOverdue = data.links.reduce((s, l) => s + l.overdueAmount, 0);
  const nextDue = data.links
    .map((l) => l.nextDue)
    .filter((d): d is string => d !== null)
    .sort()[0];

  return (
    <div className="p-4">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{data.shop.name}</h1>
          <p className="text-sm text-app-hint">{data.user.name}</p>
        </div>
        <button onClick={logout} className="text-sm text-app-hint">
          Chiqish
        </button>
      </header>

      <Link href="/app/debts" className="mt-4 block rounded-2xl bg-app-card p-4">
        <div className="text-sm text-app-hint">Umumiy qarz</div>
        <div className="mt-1 text-2xl font-semibold">{formatSom(totalDebt)}</div>
        {totalOverdue > 0 ? (
          <div className="mt-1 text-sm font-medium text-app-danger">Muddati o'tgan: {formatSom(totalOverdue)}</div>
        ) : nextDue ? (
          <div className="mt-1 text-sm text-app-hint">Eng yaqin to'lov muddati: {formatDate(nextDue)}</div>
        ) : null}
      </Link>

      <h2 className="mt-6 text-base font-semibold">Distribyutorlarim</h2>
      <div className="mt-2 grid gap-2">
        {data.links.map((l) => (
          <Link key={l.linkId} href={`/app/d/${l.distributor.id}`} className="rounded-2xl bg-app-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">{l.distributor.name}</div>
              <span className="shrink-0 text-sm text-app-accent">Katalog</span>
            </div>
            <div className="mt-1 text-sm text-app-hint">
              {l.distributor.categories.join(", ")} · yetkazish: {l.distributor.deliveryDays.join(", ")}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span>Qarz: {formatSom(l.debt)}</span>
              {l.overdueAmount > 0 && <span className="text-app-danger">{l.overdueDays} kun kechikkan</span>}
              {l.activeOrders > 0 && <span className="text-app-hint">Faol buyurtma: {l.activeOrders}</span>}
            </div>
          </Link>
        ))}
        {data.links.length === 0 && (
          <p className="rounded-2xl bg-app-card p-4 text-sm text-app-hint">
            Hali birorta distribyutorga ulanmagansiz. Quyida hududingizdagi distribyutorlarni toping yoki agentdan QR kodni so'rang.
          </p>
        )}
        <Link
          href="/app/find"
          className="rounded-2xl border border-dashed border-app-hint/40 p-4 text-center text-sm font-medium text-app-accent"
        >
          + Yangi distribyutor topish
        </Link>
      </div>

      {data.requests.length > 0 && (
        <>
          <h2 className="mt-6 text-base font-semibold">Ulanish so'rovlarim</h2>
          <div className="mt-2 grid gap-2">
            {data.requests.map((r) => (
              <div key={r.distributorId} className="flex items-center justify-between gap-3 rounded-2xl bg-app-card p-4 text-sm">
                <span className="font-medium">{r.name}</span>
                <span className="shrink-0 text-app-hint">Javob kutilmoqda · {formatDate(r.createdAt)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
