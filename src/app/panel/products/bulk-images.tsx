"use client";

import { useState } from "react";
import { refreshProducts, setProductImageBySku } from "./image-actions";
import { shrinkImage } from "./shrink-image";

// Ko'plab rasm: fayl nomi artikul bilan bir xil (masalan, D-001.jpg) bo'lsa, o'sha tovarga qo'yiladi
export function BulkImages() {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [saved, setSaved] = useState(0);
  const running = progress !== null && progress.done < progress.total;

  async function run(files: File[]) {
    setFailed([]);
    setSaved(0);
    setProgress({ done: 0, total: files.length });
    let ok = 0;
    const errors: string[] = [];
    // Bittadan: bitta so'rov 4,5 MB dan oshmasin
    for (const [i, file] of files.entries()) {
      const data = new FormData();
      data.set("image", await shrinkImage(file));
      const r = await setProductImageBySku(data).catch(() => ({ ok: false as const, message: "Tarmoq xatosi" }));
      if (r.ok) ok++;
      else errors.push(`${file.name}: ${r.message}`);
      setProgress({ done: i + 1, total: files.length });
    }
    setSaved(ok);
    setFailed(errors);
    await refreshProducts();
  }

  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className={`btn btn-sm btn-secondary ${running ? "pointer-events-none opacity-50" : ""}`}>
          Rasmlarni ko&apos;plab yuklash
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            disabled={running}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (files.length > 0) void run(files);
            }}
          />
        </label>
        <span className="text-sm text-hint">Fayl nomi tovar artikuli bilan bir xil bo&apos;lsin: masalan, D-001.jpg</span>
      </div>
      {progress && (
        <p className="mt-3 text-sm" aria-live="polite">
          {running
            ? `Yuklanmoqda: ${progress.done} / ${progress.total}`
            : `Tayyor: ${saved} ta rasm qo'yildi${failed.length ? `, ${failed.length} tasi qo'yilmadi` : ""}`}
        </p>
      )}
      {!running && failed.length > 0 && (
        <ul className="mt-2 grid gap-1 text-sm text-danger">
          {failed.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
