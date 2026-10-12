"use client";

// Miqdor yashik bilan tanlanadi, savatda esa dona saqlanadi
export function QtyStepper({
  packs,
  onChange,
  disabled,
}: {
  packs: number;
  onChange: (packs: number) => void;
  disabled?: boolean;
}) {
  if (packs === 0)
    return (
      <button
        disabled={disabled}
        onClick={() => onChange(1)}
        className="rounded-xl bg-app-accent px-4 py-2 text-sm font-medium text-app-accent-text disabled:opacity-40"
      >
        Qo'shish
      </button>
    );
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(packs - 1)} className="h-9 w-9 rounded-xl bg-app-bg text-lg" aria-label="Kamaytirish">
        −
      </button>
      <span className="min-w-14 text-center text-sm font-medium">{packs} yashik</span>
      <button onClick={() => onChange(packs + 1)} className="h-9 w-9 rounded-xl bg-app-bg text-lg" aria-label="Ko'paytirish">
        +
      </button>
    </div>
  );
}
