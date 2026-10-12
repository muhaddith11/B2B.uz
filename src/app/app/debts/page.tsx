"use client";

import { useEffect, useState } from "react";
import { formatDate as fmtDate, formatSom } from "@/lib/money";
import { useShop } from "../shop-context";
import type { LinkSummary } from "../types";

type Entry = {
  id: string;
  linkId: string;
  type: "DEBT" | "PAYMENT" | "ADJUSTMENT";
  amount: number;
  date: string;
  dueDate: string | null;
  status: "CONFIRMED" | "PENDING" | "REJECTED";
  orderNumber: number | null;
};

export default function DebtsPage() {
  const { api } = useShop();
  const [data, setData] = useState<{ links: LinkSummary[]; entries: Entry[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<{ links: LinkSummary[]; entries: Entry[] }>("/api/shop/debts").then(setData).catch((e) => setErr(e.message));
  }, [api]);

  if (err) return <p className="p-6 text-app-danger">{err}</p>;
  if (!data) return <p className="p-6 text-app-hint">Yuklanmoqda…</p>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Qarzlarim</h1>
      <div className="mt-3 grid gap-3">
        {data.links.map((l) => {
          const entries = data.entries.filter((e) => e.linkId === l.linkId);
          return (
            <section key={l.linkId} className="rounded-2xl bg-app-card p-3">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-medium">{l.distributor.name}</h2>
                <span className={`font-semibold ${l.overdueAmount > 0 ? "text-app-danger" : ""}`}>{formatSom(l.debt)}</span>
              </div>
              <div className="mt-1 text-xs text-app-hint">
                {l.creditLimit > 0 ? `Limit: ${formatSom(l.creditLimit)} · bo'sh: ${formatSom(l.creditAvailable)}` : "Nasiya berilmagan"}
                {l.nextDue ? ` · muddat: ${fmtDate(l.nextDue)}` : ""}
              </div>
              {l.overdueAmount > 0 && (
                <p className="mt-1 text-sm text-app-danger">
                  Muddati {l.overdueDays} kun o'tgan: {formatSom(l.overdueAmount)}
                </p>
              )}
              {entries.length > 0 && (
                <ul className="mt-2 grid gap-1 border-t border-black/5 pt-2 text-sm">
                  {entries.map((e) => (
                    <li key={e.id} className="flex justify-between gap-2">
                      <span className="text-app-hint">
                        {fmtDate(e.date)} ·{" "}
                        {e.type === "DEBT" ? `Buyurtma №${e.orderNumber ?? "—"}` : e.type === "PAYMENT" ? "To'lov" : "Tuzatish"}
                        {e.status === "PENDING" ? " (tasdiq kutilmoqda)" : ""}
                      </span>
                      <span className={e.amount < 0 ? "text-app-ok" : ""}>{formatSom(e.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {/* "To'lash" tugmasi Payme/Click va chek oqimi bilan keyingi qadamda qo'shiladi */}
            </section>
          );
        })}
      </div>
    </div>
  );
}
