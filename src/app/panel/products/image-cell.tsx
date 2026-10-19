"use client";

import { useRef, useState, useTransition } from "react";
import type { Lang } from "@/lib/i18n";
import { panelText } from "../texts";
import { removeProductImage, setProductImage } from "./image-actions";
import { shrinkImage } from "./shrink-image";

// Jadval qatoridagi tovar rasmi: bosilsa fayl tanlanadi, darhol yuklanadi; bor rasmni almashtirish yoki olib tashlash
export function ImageCell({ productId, imageUrl, name, lang }: { productId: string; imageUrl: string | null; name: string; lang: Lang }) {
  const t = panelText(lang);
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function upload(file: File) {
    setError(null);
    start(async () => {
      const data = new FormData();
      data.set("productId", productId);
      data.set("image", await shrinkImage(file));
      const r = await setProductImage(data);
      if (!r.ok) setError(r.message);
    });
  }

  function remove() {
    setError(null);
    start(async () => {
      const data = new FormData();
      data.set("productId", productId);
      const r = await removeProductImage(data);
      if (!r.ok) setError(r.message);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={pending}
        aria-label={imageUrl ? t("{name}: rasmni almashtirish", { name }) : t("{name}: rasm qo'shish", { name })}
        title={imageUrl ? t("Rasmni almashtirish") : t("Rasm qo'shish")}
        className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-field text-lg text-hint hover:border-accent">
        {/* eslint-disable-next-line @next/next/no-img-element -- rasm /api/files dan, o'lchami kichik */}
        {imageUrl ? <img src={imageUrl} alt="" className="size-full object-cover" /> : "+"}
        {pending && <span className="absolute inset-0 grid place-items-center bg-card/80 text-xs text-ink">…</span>}
      </button>
      {imageUrl && !pending && (
        <button type="button" onClick={remove} className="text-xs text-hint hover:text-danger">
          {t("Olib tashlash")}
        </button>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) upload(file);
        }}
      />
    </div>
  );
}
