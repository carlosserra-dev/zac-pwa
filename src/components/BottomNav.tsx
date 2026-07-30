"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/actions";

const items = [
  { href: "/", label: "Lançar", icon: "➕" },
  { href: "/overview", label: "Resumo", icon: "📊" },
  { href: "/categories", label: "Categorias", icon: "🏷️" },
  { href: "/recurring", label: "Fixos", icon: "🔁" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                active ? "text-indigo-600" : "text-slate-400"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
        <form action={signOut} className="flex flex-1">
          <button
            type="submit"
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium text-slate-400"
          >
            <span className="text-lg">🚪</span>
            Sair
          </button>
        </form>
      </div>
    </nav>
  );
}
