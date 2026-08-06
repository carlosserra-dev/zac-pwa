"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();

  const resumoActive = pathname === "/overview";
  const lancarActive = pathname === "/" || pathname.startsWith("/add");
  const menuActive =
    pathname === "/menu" ||
    pathname === "/categories" ||
    pathname === "/recurring" ||
    pathname === "/debts" ||
    pathname === "/settings";

  return (
    <nav className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-md items-center justify-between gap-1.5 px-4 py-2">
        <Link
          href="/overview"
          className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl border py-2 text-xs font-medium shadow-sm transition-all active:translate-y-0.5 active:shadow-none ${
            resumoActive
              ? "border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-400"
              : "border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
          }`}
        >
          <span className="text-lg">📊</span>
          Resumo
        </Link>

        <div className="flex-1" />

        <Link
          href="/"
          aria-label="Lançar gasto"
          className={`-mt-6 flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full border shadow-lg transition-all active:translate-y-0.5 active:shadow-md ${
            lancarActive
              ? "border-indigo-700 bg-indigo-600 text-white"
              : "border-indigo-600 bg-indigo-600 text-white"
          }`}
        >
          <span className="text-2xl leading-none">➕</span>
        </Link>

        <div className="flex-1" />

        <Link
          href="/menu"
          className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl border py-2 text-xs font-medium shadow-sm transition-all active:translate-y-0.5 active:shadow-none ${
            menuActive
              ? "border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-400"
              : "border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
          }`}
        >
          <span className="text-lg">☰</span>
          Menu
        </Link>
      </div>
    </nav>
  );
}
