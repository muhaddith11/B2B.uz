"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShop } from "./shop-context";

const items = [
  { href: "/app", label: "Bosh sahifa" },
  { href: "/app/cart", label: "Savat" },
  { href: "/app/orders", label: "Buyurtmalar" },
  { href: "/app/debts", label: "Qarzlarim" },
];

export function BottomNav() {
  const path = usePathname();
  const { cartCount } = useShop();
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-black/10 bg-app-bg pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {items.map((it) => {
          const active = it.href === "/app" ? path === "/app" || path.startsWith("/app/d/") || path.startsWith("/app/find") : path.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`relative py-3 text-center text-xs font-medium ${active ? "text-app-accent" : "text-app-hint"}`}
            >
              {it.label}
              {it.href === "/app/cart" && cartCount > 0 && (
                <span className="absolute right-3 top-1.5 min-w-5 rounded-full bg-app-accent px-1.5 text-[11px] leading-5 text-app-accent-text">
                  {cartCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
