import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addTransaction } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";
import type { Category, Profile } from "@/types/database";

export default async function AddExpensePage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { categoryId } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();

  const [{ data: category }, { data: profiles }, { data: auth }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, name, icon, color, sort_order, created_at")
        .eq("id", categoryId)
        .maybeSingle(),
      supabase.from("profiles").select("id, display_name, color, created_at"),
      supabase.auth.getUser(),
    ]);

  if (!category) notFound();

  const currentUserId = auth.user?.id;
  const typedCategory = category as Category;
  const typedProfiles = (profiles as Profile[] | null) ?? [];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8 pt-6">
      <Link
        href="/"
        className="mb-4 text-sm text-slate-500 dark:text-slate-400"
      >
        ← Voltar
      </Link>

      <div className="mb-3 flex items-center gap-3">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
          style={{ backgroundColor: `${typedCategory.color}22` }}
        >
          {typedCategory.icon}
        </span>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Categoria
          </p>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {typedCategory.name}
          </h1>
        </div>
      </div>

      <Link
        href={`/recurring?category=${typedCategory.id}#new-recurring`}
        className="mb-6 inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition active:scale-95 dark:border-slate-700 dark:text-slate-300"
      >
        🔁 Cadastrar como recorrente
      </Link>

      <form action={addTransaction} className="flex flex-1 flex-col gap-5">
        <input type="hidden" name="category_id" value={typedCategory.id} />

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Valor (R$)
          </label>
          <input
            type="number"
            name="amount"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            required
            autoFocus
            placeholder="0,00"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-2xl font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-900"
          />
        </div>

        {typedProfiles.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Quem gastou?
            </label>
            <div className="flex gap-2">
              {typedProfiles.map((p) => (
                <label
                  key={p.id}
                  className="flex flex-1 cursor-pointer items-center justify-center rounded-xl border border-slate-300 px-3 py-3 text-sm font-medium text-slate-600 transition active:scale-95 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-700 dark:border-slate-700 dark:text-slate-400 dark:has-[:checked]:border-indigo-400 dark:has-[:checked]:bg-indigo-500/10 dark:has-[:checked]:text-indigo-300"
                >
                  <input
                    type="radio"
                    name="spent_by"
                    value={p.id}
                    defaultChecked={p.id === currentUserId}
                    className="sr-only"
                  />
                  {p.display_name}
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Observação (opcional)
          </label>
          <textarea
            name="note"
            rows={3}
            placeholder="Ex: compras da semana"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-900"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
            Preencha um valor válido antes de salvar.
          </p>
        )}

        <SubmitButton
          pendingLabel="Salvando..."
          className="mt-auto w-full rounded-xl bg-indigo-600 py-4 font-medium text-white transition active:scale-[0.98] hover:bg-indigo-700 active:bg-indigo-800"
        >
          Salvar gasto
        </SubmitButton>
      </form>
    </main>
  );
}
