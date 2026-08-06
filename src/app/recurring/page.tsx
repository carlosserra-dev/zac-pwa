import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  addRecurringExpense,
  deleteRecurringExpense,
  toggleRecurringExpense,
  updateRecurringExpense,
} from "@/lib/actions";
import { BottomNav } from "@/components/BottomNav";
import { SubmitButton } from "@/components/SubmitButton";
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

  const [
    { data: recurring, error: recurringError },
    { data: categories },
    { data: profiles },
  ] = await Promise.all([
    supabase
      .from("recurring_expenses")
      .select(
        "id, user_id, category_id, amount, note, day_of_month, active, split_equally, installments_total, installments_generated, created_at, categories ( id, name, icon ), profiles ( id, display_name )"
      )
      .order("day_of_month", { ascending: true }),
    supabase
      .from("categories")
      .select("id, name, icon, color, sort_order, created_at")
      .order("sort_order", { ascending: true }),
    supabase.from("profiles").select("id, display_name, color, created_at"),
  ]);

  if (recurringError) {
    console.error("recurring: erro ao buscar recurring_expenses:", recurringError);
  }

  const toggleWithId = async (id: string, next: boolean) => {
    "use server";
    await toggleRecurringExpense(id, next);
  };

  const deleteWithId = async (id: string) => {
    "use server";
    await deleteRecurringExpense(id);
  };

  const updateWithId = async (id: string, formData: FormData) => {
    "use server";
    await updateRecurringExpense(id, formData);
  };

  const typedRecurring = (recurring as unknown as RecurringWithCategory[]) ?? [];
  const typedCategories = (categories as Category[] | null) ?? [];
  const typedProfiles = (profiles as Profile[] | null) ?? [];

  return (
    <>
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-6 pt-8">
        <Link
          href="/menu"
          className="mb-4 inline-block text-sm text-slate-500 dark:text-slate-400"
        >
          ← Voltar
        </Link>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Gastos recorrentes
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Aluguel, assinaturas e outras contas fixas. Lançadas
          automaticamente todo mês.
        </p>

        {saved && (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            Salvo com sucesso ✓
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
            Preencha os campos obrigatórios.
          </p>
        )}

        <div className="mt-6 space-y-2">
          {typedRecurring.map((r) => {
            const otherProfile = typedProfiles.find((p) => p.id !== r.user_id);
            return (
              <details
                key={r.id}
                className="group rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition active:scale-[0.99]">
                  <span className="shrink-0 text-xl">{r.categories?.icon ?? "📦"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium text-slate-800 dark:text-slate-200">
                      {r.categories?.name ?? "Categoria"} · dia {r.day_of_month}
                    </p>
                    <p className="break-words text-xs text-slate-500 dark:text-slate-400">
                      R$ {Number(r.amount).toFixed(2)}
                      {r.profiles?.display_name ? ` · ${r.profiles.display_name} paga` : ""}
                      {r.split_equally && otherProfile
                        ? ` · 🤝 ${otherProfile.display_name} deve a metade`
                        : ""}
                      {r.installments_total
                        ? ` · ${r.installments_generated}/${r.installments_total} parcelas`
                        : ""}
                      {r.note ? ` · ${r.note}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                      r.active
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {r.active ? "Ativo" : "Pausado"}
                  </span>
                  <span className="shrink-0 text-slate-400 transition group-open:rotate-180 dark:text-slate-500">
                    ⌄
                  </span>
                </summary>

                <div className="border-t border-slate-100 px-4 py-4 dark:border-slate-800">
                  <div className="mb-3 flex gap-2">
                    <form action={toggleWithId.bind(null, r.id, !r.active)} className="flex-1">
                      <button
                        type="submit"
                        className={`w-full rounded-lg py-2 text-sm font-medium transition active:scale-95 ${
                          r.active
                            ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                        }`}
                      >
                        {r.active ? "Pausar" : "Reativar"}
                      </button>
                    </form>
                    <form action={deleteWithId.bind(null, r.id)} className="flex-1">
                      <button
                        type="submit"
                        className="w-full rounded-lg bg-red-50 py-2 text-sm font-medium text-red-600 transition active:scale-95 dark:bg-red-500/10 dark:text-red-400"
                      >
                        Excluir
                      </button>
                    </form>
                  </div>

                  <form action={updateWithId.bind(null, r.id)} className="space-y-3">
                    <select
                      name="category_id"
                      required
                      defaultValue={r.category_id}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
                        defaultValue={r.user_id}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <option value="">Quem paga?</option>
                        {typedProfiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.display_name}
                          </option>
                        ))}
                      </select>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div className="min-w-0">
                        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                          Valor (R$)
                        </label>
                        <input
                          type="number"
                          name="amount"
                          step="0.01"
                          min="0.01"
                          required
                          defaultValue={r.amount}
                          className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                          Dia do lançamento
                        </label>
                        <input
                          type="number"
                          name="day_of_month"
                          min="1"
                          max="28"
                          required
                          defaultValue={r.day_of_month}
                          className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {typedProfiles.length > 1 && (
                      <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition active:scale-[0.99] dark:border-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          name="split_equally"
                          defaultChecked={r.split_equally}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600"
                        />
                        🤝 Dividir 50/50 — a outra pessoa fica devendo a metade
                      </label>
                    )}

                    <fieldset className="[&:has(input[value=count]:checked)_.installments-count-input]:block">
                      <legend className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                        Duração
                      </legend>
                      <div className="flex gap-2">
                        <label className="flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-center text-sm text-slate-600 transition active:scale-95 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-700 dark:border-slate-700 dark:text-slate-400 dark:has-[:checked]:border-indigo-400 dark:has-[:checked]:bg-indigo-500/10 dark:has-[:checked]:text-indigo-300">
                          <input
                            type="radio"
                            name="installments_type"
                            value="none"
                            defaultChecked={!r.installments_total}
                            className="sr-only"
                          />
                          Sem fim
                        </label>
                        <label className="flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-center text-sm text-slate-600 transition active:scale-95 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-700 dark:border-slate-700 dark:text-slate-400 dark:has-[:checked]:border-indigo-400 dark:has-[:checked]:bg-indigo-500/10 dark:has-[:checked]:text-indigo-300">
                          <input
                            type="radio"
                            name="installments_type"
                            value="count"
                            defaultChecked={Boolean(r.installments_total)}
                            className="sr-only"
                          />
                          Com parcelas
                        </label>
                      </div>
                      <div className="installments-count-input mt-2 hidden">
                        <input
                          type="number"
                          name="installments_total"
                          min={Math.max(1, r.installments_generated)}
                          defaultValue={r.installments_total ?? ""}
                          placeholder="Número de parcelas (ex: 12)"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      {r.installments_total ? (
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                          Já geradas: {r.installments_generated} de {r.installments_total}
                        </p>
                      ) : null}
                    </fieldset>

                    <input
                      type="text"
                      name="note"
                      defaultValue={r.note ?? ""}
                      placeholder="Observação (ex: aluguel apto)"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />

                    <SubmitButton
                      pendingLabel="Salvando..."
                      className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white transition active:scale-95"
                    >
                      Salvar alterações
                    </SubmitButton>
                  </form>
                </div>
              </details>
            );
          })}
          {typedRecurring.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Nenhum gasto recorrente cadastrado ainda.
            </p>
          )}
        </div>

        <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
          <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            Novo gasto recorrente
          </p>
          <form action={addRecurringExpense} className="space-y-3">
            <select
              name="category_id"
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="">Quem paga?</option>
                {typedProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name}
                  </option>
                ))}
              </select>
            )}

            {typedProfiles.length > 1 && (
              <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition active:scale-[0.99] dark:border-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  name="split_equally"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600"
                />
                🤝 Dividir 50/50 — a outra pessoa fica devendo a metade
              </label>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="min-w-0">
                <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0,00"
                  className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="min-w-0">
                <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                  Dia do lançamento
                </label>
                <input
                  type="number"
                  name="day_of_month"
                  min="1"
                  max="28"
                  defaultValue={5}
                  required
                  className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <fieldset className="[&:has(input[value=count]:checked)_.installments-count-input]:block">
              <legend className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                Duração
              </legend>
              <div className="flex gap-2">
                <label className="flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-center text-sm text-slate-600 transition active:scale-95 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-700 dark:border-slate-700 dark:text-slate-400 dark:has-[:checked]:border-indigo-400 dark:has-[:checked]:bg-indigo-500/10 dark:has-[:checked]:text-indigo-300">
                  <input
                    type="radio"
                    name="installments_type"
                    value="none"
                    defaultChecked
                    className="sr-only"
                  />
                  Sem fim
                </label>
                <label className="flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-center text-sm text-slate-600 transition active:scale-95 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-700 dark:border-slate-700 dark:text-slate-400 dark:has-[:checked]:border-indigo-400 dark:has-[:checked]:bg-indigo-500/10 dark:has-[:checked]:text-indigo-300">
                  <input
                    type="radio"
                    name="installments_type"
                    value="count"
                    className="sr-only"
                  />
                  Com parcelas
                </label>
              </div>
              <div className="installments-count-input mt-2 hidden">
                <input
                  type="number"
                  name="installments_total"
                  min="1"
                  placeholder="Número de parcelas (ex: 12)"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </fieldset>

            <input
              type="text"
              name="note"
              placeholder="Observação (ex: aluguel apto)"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <SubmitButton
              pendingLabel="Adicionando..."
              className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white transition active:scale-95 dark:bg-slate-100 dark:text-slate-900"
            >
              Adicionar recorrente
            </SubmitButton>
          </form>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
