import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addTransaction } from "@/lib/actions";
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
      <Link href="/" className="mb-4 text-sm text-slate-500">
        ← Voltar
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
          style={{ backgroundColor: `${typedCategory.color}22` }}
        >
          {typedCategory.icon}
        </span>
        <div>
          <p className="text-xs text-slate-500">Categoria</p>
          <h1 className="text-lg font-semibold text-slate-900">
            {typedCategory.name}
          </h1>
        </div>
      </div>

      <form action={addTransaction} className="flex flex-1 flex-col gap-5">
        <input type="hidden" name="category_id" value={typedCategory.id} />

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
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
            className="w-full rounded-xl border border-slate-300 px-4 py-4 text-2xl font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        {typedProfiles.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Quem gastou?
            </label>
            <div className="flex gap-2">
              {typedProfiles.map((p) => (
                <label
                  key={p.id}
                  className="flex flex-1 cursor-pointer items-center justify-center rounded-xl border border-slate-300 px-3 py-3 text-sm font-medium text-slate-600 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-700"
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
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Observação (opcional)
          </label>
          <textarea
            name="note"
            rows={3}
            placeholder="Ex: compras da semana"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            Preencha um valor válido antes de salvar.
          </p>
        )}

        <button
          type="submit"
          className="mt-auto w-full rounded-xl bg-indigo-600 py-4 font-medium text-white transition hover:bg-indigo-700 active:bg-indigo-800"
        >
          Salvar gasto
        </button>
      </form>
    </main>
  );
}
