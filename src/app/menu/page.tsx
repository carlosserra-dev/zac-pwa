import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/BottomNav";

const ITEMS = [
  {
    href: "/categories",
    icon: "🏷️",
    label: "Categorias",
    description: "Criar, renomear ou remover categorias de gasto",
  },
  {
    href: "/recurring",
    icon: "🔁",
    label: "Gastos fixos",
    description: "Aluguel, assinaturas e outras contas recorrentes",
  },
  {
    href: "/debts",
    icon: "🤝",
    label: "Dívidas",
    description: "Contas divididas entre você e seu par",
  },
  {
    href: "/settings",
    icon: "⚙️",
    label: "Configurações",
    description: "Perfil, aparência e conta",
  },
];

export default async function MenuPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  let pendingDebtsCount = 0;
  if (profile) {
    const { count } = await supabase
      .from("debts")
      .select("id", { count: "exact", head: true })
      .eq("debtor_id", profile.id)
      .eq("settled", false);
    pendingDebtsCount = count ?? 0;
  }

  return (
    <>
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-6 pt-8">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Menu
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Mais opções do ZAC
        </p>

        <div className="mt-6 space-y-2">
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl dark:bg-slate-800">
                {item.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 break-words text-sm font-medium text-slate-800 dark:text-slate-200">
                  {item.label}
                  {item.href === "/debts" && pendingDebtsCount > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-500/20 dark:text-red-400">
                      {pendingDebtsCount}
                    </span>
                  )}
                </p>
                <p className="break-words text-xs text-slate-500 dark:text-slate-400">
                  {item.description}
                </p>
              </div>
              <span className="shrink-0 text-slate-400 dark:text-slate-600">
                ›
              </span>
            </Link>
          ))}
        </div>
      </main>
      <BottomNav />
    </>
  );
}
