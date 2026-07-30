import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  addRecurringExpense,
  deleteRecurringExpense,
  toggleRecurringExpense,
} from "@/lib/actions";
import { BottomNav } from "@/components/BottomNav";
import type { Category, Profile, RecurringExpense } from "@/types/database";

type RecurringWithCategory = RecurringExpense & {
  categories: Pick<Category, "id" | "name" | "icon"> | null;
  profiles: Pick<Profile, "id" | "display_name"> | null;
};

export default async function RecurringPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved, error } = await searchParams;

  const supabase = await createClient();

  const [{ data: recurring }, { data: categories }, { data: profiles }] =
    await Promise.all([
      supabase
        .from("recurring_expenses")
        .select(
          "id, user_id, category_id, amount, note, day_of_month, active, created_at, categories ( id, name, icon ), profiles ( id, display_name )"
        )
        .order("day_of_month", { ascending: true }),
      supabase
        .from("categories")
        .select("id, name, icon, color, sort_order, created_at")
        .order("sort_order", { ascending: true }),
      supabase.from("profiles").select("id, display_name, color, created_at"),
    ]);

  const toggleWithId = async (id: string, next: boolean) => {
    "use server";
    await toggleRecurringExpense(id, next);
  };

  const deleteWithId = async (id: string) => {
    "use server";
    await deleteRecurringExpense(id);
  };

  const typedRecurring = (recurring as unknown as RecurringWithCategory[]) ?? [];
  const typedCategories = (categories as Category[] | null) ?? [];
  const typedProfiles = (profiles as Profile[] | null) ?? [];

  return (
    <>
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-6 pt-8">
        <Link href="/" className="mb-4 inline-block text-sm text-slate-500">
          ← Voltar
        </Link>
        <h1 className="text-lg font-semibold text-slate-900">
          Gastos recorrentes
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Aluguel, assinaturas e outras contas fixas. Lançadas
          automaticamente todo mês.
        </p>

        {saved && (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Salvo com sucesso ✓
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            Preencha os campos obrigatórios.
          </p>
        )}

        <div className="mt-6 space-y-2">
          {typedRecurring.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <span className="text-xl">{r.categories?.icon ?? "📦"}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">
                  {r.categories?.name ?? "Categoria"} · dia {r.day_of_month}
                </p>
                <p className="text-xs text-slate-500">
                  R$ {Number(r.amount).toFixed(2)}
                  {r.profiles?.display_name ? ` · ${r.profiles.display_name}` : ""}
                  {r.note ? ` · ${r.note}` : ""}
                </p>
              </div>
              <form action={toggleWithId.bind(null, r.id, !r.active)}>
                <button
                  type="submit"
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    r.active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {r.active ? "Ativo" : "Pausado"}
                </button>
              </form>
              <form action={deleteWithId.bind(null, r.id)}>
                <button
                  type="submit"
                  className="rounded-full bg-red-50 px-2 py-1 text-xs text-red-600"
                >
                  ✕
                </button>
              </form>
            </div>
          ))}
          {typedRecurring.length === 0 && (
            <p className="text-sm text-slate-400">
              Nenhum gasto recorrente cadastrado ainda.
            </p>
          )}
        </div>

        <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-4">
          <p className="mb-3 text-sm font-medium text-slate-700">
            Novo gasto recorrente
          </p>
          <form action={addRecurringExpense} className="space-y-3">
            <select
              name="category_id"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">Categoria</option>
              {typedCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>

            {typedProfiles.length > 0 && (
              <select
                name="spent_by"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">Quem paga?</option>
                {typedProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name}
                  </option>
                ))}
              </select>
            )}

            <div className="flex gap-2">
              <input
                type="number"
                name="amount"
                step="0.01"
                min="0.01"
                required
                placeholder="Valor (R$)"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
              />
              <input
                type="number"
                name="day_of_month"
                min="1"
                max="28"
                defaultValue={5}
                required
                title="Dia do mês em que lança"
                className="w-24 rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <input
              type="text"
              name="note"
              placeholder="Observação (ex: aluguel apto)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white"
            >
              Adicionar recorrente
            </button>
          </form>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
