"use client";

import { startTransition, useActionState, useState } from "react";
import { formatSom } from "@/lib/money";
import { priceListAction, type PriceListState } from "./actions";

export function UploadForm() {
  const [state, action, pending] = useActionState<PriceListState, FormData>(priceListAction, { kind: "idle" });
  // Brauzerning "Choose File" tugmasi o'rniga o'zbekcha tugma va tanlangan fayl nomi
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    // Forma qo'lda yuboriladi: React <form action> yuborilgach maydonlarni tozalaydi, unda "Tekshirish"dan keyin
    // tanlangan fayl yo'qolib, "Qo'llash" o'sha faylni yubora olmasdi
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => action(data));
      }}
      className="rounded-xl border border-line bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="btn btn-sm btn-secondary">
          Excel faylni tanlash
          <input
            type="file"
            name="file"
            accept=".xlsx"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>
        <span className="max-w-60 truncate text-sm text-hint">{fileName ?? "Fayl tanlanmagan"}</span>
        <button name="mode" value="preview" disabled={pending || !fileName} className="btn btn-sm btn-secondary">
          Tekshirish
        </button>
        <button
          name="mode"
          value="apply"
          disabled={pending || !fileName || state.kind !== "preview" || state.errors.length > 0}
          className="btn btn-sm btn-primary"
        >
          Qo'llash
        </button>
        <a href="/panel/products/template" className="text-sm text-accent-ink hover:underline">
          Shablonni yuklab olish
        </a>
      </div>
      <p className="mt-2 text-xs text-hint">Avval "Tekshirish": nima o'zgarishini ko'rasiz. Xato bo'lmasa, "Qo'llash" bilan bazaga yoziladi.</p>

      {pending && <p className="mt-3 text-sm text-hint">O'qilmoqda…</p>}
      {state.kind === "error" && <p className="mt-3 text-sm text-danger">{state.message}</p>}
      {(state.kind === "preview" || state.kind === "applied") && (
        <div className="mt-4 grid gap-3 text-sm">
          {state.kind === "applied" && (
            <p className="rounded-lg bg-ok-soft p-3 text-ok">
              Qo'llandi: {state.count} ta tovar yangilandi{state.deactivated ? `, ${state.deactivated} tasi faylda yo'qligi uchun nofaol qilindi` : ""}.
            </p>
          )}
          {state.errors.length > 0 && (
            <div className="rounded-lg bg-danger-soft p-3 text-danger">
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
              <thead className="text-left text-hint">
                <tr>
                  <th className="py-1 font-medium">Tovar</th>
                  <th className="py-1 text-right font-medium">Eski narx</th>
                  <th className="py-1 text-right font-medium">Yangi narx</th>
                </tr>
              </thead>
              <tbody>
                {state.priceChanged.slice(0, 100).map((p) => (
                  <tr key={p.name} className="border-t border-line">
                    <td className="py-1">{p.name}</td>
                    <td className="py-1 text-right">{formatSom(p.oldPrice)}</td>
                    <td className={`py-1 text-right ${p.newPrice > p.oldPrice ? "text-danger" : "text-ok"}`}>{formatSom(p.newPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {state.added.length > 0 && <p className="text-hint">Yangi: {state.added.slice(0, 30).join(", ")}{state.added.length > 30 ? "…" : ""}</p>}
          {state.removed.length > 0 && <p className="text-hint">Nofaol bo'ladi: {state.removed.slice(0, 30).join(", ")}{state.removed.length > 30 ? "…" : ""}</p>}
        </div>
      )}
    </form>
  );
}
