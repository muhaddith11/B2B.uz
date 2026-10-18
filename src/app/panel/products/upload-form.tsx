"use client";

import { startTransition, useActionState, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { formatSom } from "@/lib/money";
import { panelText } from "../texts";
import { priceListAction, type PriceListState } from "./actions";

export function UploadForm({ lang }: { lang: Lang }) {
  const t = panelText(lang);
  const [state, action, pending] = useActionState<PriceListState, FormData>(priceListAction, { kind: "idle" });
  // Brauzerning "Choose File" tugmasi o'rniga panel tilidagi tugma va tanlangan fayl nomi
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
          {t("Excel faylni tanlash")}
          <input
            type="file"
            name="file"
            accept=".xlsx"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>
        <span className="max-w-60 truncate text-sm text-hint">{fileName ?? t("Fayl tanlanmagan")}</span>
        <button name="mode" value="preview" disabled={pending || !fileName} className="btn btn-sm btn-secondary">
          {t("Tekshirish")}
        </button>
        <button
          name="mode"
          value="apply"
          disabled={pending || !fileName || state.kind !== "preview" || state.errors.length > 0}
          className="btn btn-sm btn-primary"
        >
          {t("Qo'llash")}
        </button>
        <a href="/panel/products/template" className="text-sm text-accent-ink hover:underline">
          {t("Shablonni yuklab olish")}
        </a>
      </div>
      <p className="mt-2 text-xs text-hint">{t('Avval "Tekshirish": nima o\'zgarishini ko\'rasiz. Xato bo\'lmasa, "Qo\'llash" bilan bazaga yoziladi.')}</p>

      {pending && <p className="mt-3 text-sm text-hint">{t("O'qilmoqda…")}</p>}
      {state.kind === "error" && <p className="mt-3 text-sm text-danger">{state.message}</p>}
      {(state.kind === "preview" || state.kind === "applied") && (
        <div className="mt-4 grid gap-3 text-sm">
          {state.kind === "applied" && (
            <p className="rounded-lg bg-ok-soft p-3 text-ok">
              {state.deactivated
                ? t("Qo'llandi: {count} ta tovar yangilandi, {off} tasi faylda yo'qligi uchun nofaol qilindi.", { count: state.count, off: state.deactivated })
                : t("Qo'llandi: {count} ta tovar yangilandi.", { count: state.count })}
            </p>
          )}
          {state.kind === "applied" && state.imageWarnings && state.imageWarnings.length > 0 && (
            <div className="rounded-lg bg-warn-soft p-3 text-warn">
              <div className="font-medium">{t("Rasmi olinmagan tovarlar ({n}): tovar yozildi, rasmi o'zgarmadi", { n: state.imageWarnings.length })}</div>
              <ul className="mt-1 list-disc pl-5">
                {state.imageWarnings.slice(0, 30).map((w) => (
                  <li key={w.sku}>
                    {w.sku}: {w.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {state.errors.length > 0 && (
            <div className="rounded-lg bg-danger-soft p-3 text-danger">
              <div className="font-medium">{t("Xatolar ({n}): tuzatib, qayta yuklang", { n: state.errors.length })}</div>
              <ul className="mt-1 list-disc pl-5">
                {state.errors.slice(0, 50).map((e) => (
                  <li key={`${e.row}-${e.message}`}>
                    {t("{row}-qator: {message}", { row: e.row, message: e.message })}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            {t("Fayldagi tovarlar")}: <b>{state.count}</b> · {t("yangi")}: <b>{state.added.length}</b> · {t("narxi o'zgargan")}: <b>{state.priceChanged.length}</b> · {t("faylda yo'q (nofaol bo'ladi)")}: <b>{state.removed.length}</b>
          </div>
          {state.priceChanged.length > 0 && (
            <table className="w-full">
              <thead className="text-left text-hint">
                <tr>
                  <th className="py-1 font-medium">{t("Tovar")}</th>
                  <th className="py-1 text-right font-medium">{t("Eski narx")}</th>
                  <th className="py-1 text-right font-medium">{t("Yangi narx")}</th>
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
          {state.added.length > 0 && <p className="text-hint">{t("Yangi: {list}", { list: `${state.added.slice(0, 30).join(", ")}${state.added.length > 30 ? "…" : ""}` })}</p>}
          {state.removed.length > 0 && <p className="text-hint">{t("Nofaol bo'ladi: {list}", { list: `${state.removed.slice(0, 30).join(", ")}${state.removed.length > 30 ? "…" : ""}` })}</p>}
        </div>
      )}
    </form>
  );
}
