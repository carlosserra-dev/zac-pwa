"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Lançar", icon: "➕" },
  { href: "/overview", label: "Resumo", icon: "📊" },
  { href: "/categories", label: "Categorias", icon: "🏷️" },
  { href: "/recurring", label: "Fixos", icon: "🔁" },
  { href: "/settings", label: "Config", icon: "⚙️" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-md items-stretch justify-between gap-1.5 px-2 py-1.5">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl border py-2 text-xs font-medium shadow-sm transition-all active:translate-y-0.5 active:shadow-none ${
                active
                  ? "border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-400"
                  : "border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
