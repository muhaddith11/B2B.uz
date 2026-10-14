"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Panel menyusi: hozirgi bo'lim ko'k va tagida chiziq bilan ajralib turadi
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  const active = href === "/panel" ? path === "/panel" : path.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center border-b-2 text-sm font-medium ${active ? "border-accent text-accent-ink" : "border-transparent text-hint hover:text-ink"}`}>
      {children}
    </Link>
  );
}
