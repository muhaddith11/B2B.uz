"use client";

import { useActionState } from "react";
import { formatSom } from "@/lib/money";
import { priceListAction, type PriceListState } from "./actions";

export function UploadForm() {
  const [state, action, pending] = useActionState<PriceListState, FormData>(priceListAction, { kind: "idle" });

  return (
    <form action={action} className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <input type="file" name="file" accept=".xlsx" required className="text-sm" />
        <button name="mode" value="preview" disabled={pending} className="rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-50">
          Tekshirish
        </button>
        <button
          name="mode"
          value="apply"
          disabled={pending || state.kind !== "preview" || state.errors.length > 0}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Qo'llash
        </button>
        <a href="/panel/products/template" className="text-sm text-blue-600 hover:underline">
          Shablonni yuklab olish
        </a>
      </div>
      <p className="mt-2 text-xs text-gray-500">Avval "Tekshirish": nima o'zgarishini ko'rasiz. Xato bo'lmasa, "Qo'llash" bilan bazaga yoziladi.</p>

      {pending && <p className="mt-3 text-sm text-gray-500">O'qilmoqda…</p>}
      {state.kind === "error" && <p className="mt-3 text-sm text-red-600">{state.message}</p>}
      {(state.kind === "preview" || state.kind === "applied") && (
        <div className="mt-4 grid gap-3 text-sm">
          {state.kind === "applied" && (
            <p className="rounded-lg bg-green-50 p-3 text-green-800">
              Qo'llandi: {state.count} ta tovar yangilandi{state.deactivated ? `, ${state.deactivated} tasi faylda yo'qligi uchun nofaol qilindi` : ""}.
            </p>
          )}
          {state.errors.length > 0 && (
            <div className="rounded-lg bg-red-50 p-3 text-red-800">
              <div className="font-medium">Xatolar ({state.errors.length}): tuzatib, qayta yuklang</div>
              <ul className="mt-1 list-disc pl-5">
                {state.errors.slice(0, 50).map((e) => (
                  <li key={`${e.row}-${e.message}`}>
                    {e.row}-qator: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            Fayldagi tovarlar: <b>{state.count}</b> · yangi: <b>{state.added.length}</b> · narxi o'zgargan: <b>{state.priceChanged.length}</b> · faylda yo'q (nofaol bo'ladi): <b>{state.removed.length}</b>
          </div>
          {state.priceChanged.length > 0 && (
            <table className="w-full">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-1 font-medium">Tovar</th>
                  <th className="py-1 text-right font-medium">Eski narx</th>
                  <th className="py-1 text-right font-medium">Yangi narx</th>
                </tr>
              </thead>
              <tbody>
                {state.priceChanged.slice(0, 100).map((p) => (
                  <tr key={p.name} className="border-t border-gray-100">
                    <td className="py-1">{p.name}</td>
                    <td className="py-1 text-right">{formatSom(p.oldPrice)}</td>
                    <td className={`py-1 text-right ${p.newPrice > p.oldPrice ? "text-red-600" : "text-green-700"}`}>{formatSom(p.newPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {state.added.length > 0 && <p className="text-gray-600">Yangi: {state.added.slice(0, 30).join(", ")}{state.added.length > 30 ? "…" : ""}</p>}
          {state.removed.length > 0 && <p className="text-gray-600">Nofaol bo'ladi: {state.removed.slice(0, 30).join(", ")}{state.removed.length > 30 ? "…" : ""}</p>}
        </div>
      )}
    </form>
  );
}
