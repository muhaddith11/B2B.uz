"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { Lang } from "@/lib/i18n";

// Til tugmasi: tanlangani ajralib turadi, bosilganda shu sahifaning o'ziga qaytadi
export function LangSwitch({ lang }: { lang: Lang }) {
  const path = usePathname();
  const query = useSearchParams().toString();
  const back = encodeURIComponent(`${path}${query ? `?${query}` : ""}`);
  return (
    <div className="flex gap-1 text-sm" role="group" aria-label="Til / Язык">
      {(["uz", "ru"] as const).map((l) => (
        <a
          key={l}
          href={`/panel/lang?to=${l}&back=${back}`}
          aria-current={lang === l ? "true" : undefined}
          className={`rounded-md px-2 py-1 ${lang === l ? "bg-accent-soft font-medium text-accent-ink" : "text-hint hover:text-ink"}`}>
          {l === "uz" ? "O'zbekcha" : "Русский"}
        </a>
      ))}
    </div>
  );
}
