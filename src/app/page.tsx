import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureRecurringForCurrentMonth } from "@/lib/actions";
import { BottomNav } from "@/components/BottomNav";
import type { Category } from "@/types/database";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;

  await ensureRecurringForCurrentMonth();

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, icon, color, sort_order, created_at")
    .order("sort_order", { ascending: true });

  return (
    <>
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-6 pt-8">
        <h1 className="text-lg font-semibold text-slate-900">
          O que você quer lançar?
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Escolha a categoria do gasto
        </p>

        {saved && (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Gasto salvo com sucesso ✓
          </p>
        )}

        <div className="mt-6 grid grid-cols-3 gap-3">
          {(categories as Category[] | null)?.map((cat) => (
            <Link
              key={cat.id}
              href={`/add/${cat.id}`}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-5 text-center shadow-sm transition active:scale-95"
              style={{ boxShadow: `inset 0 -3px 0 0 ${cat.color}` }}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-xs font-medium text-slate-700">
                {cat.name}
              </span>
            </Link>
          ))}

          <Link
            href="/categories"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 px-2 py-5 text-center text-slate-400"
          >
            <span className="text-2xl">+</span>
            <span className="text-xs font-medium">Nova categoria</span>
          </Link>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
