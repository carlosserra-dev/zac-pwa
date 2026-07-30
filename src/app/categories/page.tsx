import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  addCategory,
  deleteCategory,
  updateCategory,
} from "@/lib/actions";
import { BottomNav } from "@/components/BottomNav";
import type { Category } from "@/types/database";

const COLOR_OPTIONS = [
  "#22c55e",
  "#f59e0b",
  "#0ea5e9",
  "#a855f7",
  "#ef4444",
  "#ec4899",
  "#64748b",
  "#6366f1",
];

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved, error } = await searchParams;

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, icon, color, sort_order, created_at")
    .order("sort_order", { ascending: true });

  const updateCategoryWithId = async (id: string, formData: FormData) => {
    "use server";
    await updateCategory(id, formData);
  };

  const deleteCategoryWithId = async (id: string) => {
    "use server";
    await deleteCategory(id);
  };

  return (
    <>
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-6 pt-8">
        <Link href="/" className="mb-4 inline-block text-sm text-slate-500">
          ← Voltar
        </Link>
        <h1 className="text-lg font-semibold text-slate-900">Categorias</h1>
        <p className="mt-1 text-sm text-slate-500">
          Crie, renomeie ou remova categorias de gasto
        </p>

        {saved && (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Salvo com sucesso ✓
          </p>
        )}
        {error === "used" && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            Essa categoria tem gastos lançados e não pode ser excluída.
          </p>
        )}
        {error === "1" && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            Preencha um nome válido.
          </p>
        )}
        {error && error !== "1" && error !== "used" && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            Erro do banco: {error}
          </p>
        )}

        <div className="mt-6 space-y-2">
          {(categories as Category[] | null)?.map((cat) => (
            <details
              key={cat.id}
              className="group rounded-xl border border-slate-200 bg-white"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                <span className="text-xl">{cat.icon}</span>
                <span className="flex-1 text-sm font-medium text-slate-800">
                  {cat.name}
                </span>
                <span className="text-slate-400 group-open:rotate-180 transition">
                  ⌄
                </span>
              </summary>

              <div className="border-t border-slate-100 px-4 py-4">
                <form
                  action={updateCategoryWithId.bind(null, cat.id)}
                  className="space-y-3"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="icon"
                      defaultValue={cat.icon}
                      className="w-16 rounded-lg border border-slate-300 px-2 py-2 text-center text-lg"
                    />
                    <input
                      type="text"
                      name="name"
                      defaultValue={cat.name}
                      required
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((color) => (
                      <label key={color}>
                        <input
                          type="radio"
                          name="color"
                          value={color}
                          defaultChecked={cat.color === color}
                          className="sr-only peer"
                        />
                        <span
                          className="block h-7 w-7 cursor-pointer rounded-full border-2 border-transparent peer-checked:border-slate-900"
                          style={{ backgroundColor: color }}
                        />
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white"
                    >
                      Salvar
                    </button>
                    <button
                      formAction={deleteCategoryWithId.bind(null, cat.id)}
                      className="flex-1 rounded-lg bg-red-50 py-2 text-sm font-medium text-red-600"
                    >
                      Excluir
                    </button>
                  </div>
                </form>
              </div>
            </details>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-4">
          <p className="mb-3 text-sm font-medium text-slate-700">
            Nova categoria
          </p>
          <form action={addCategory} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                name="icon"
                placeholder="📦"
                defaultValue="📦"
                className="w-16 rounded-lg border border-slate-300 px-2 py-2 text-center text-lg"
              />
              <input
                type="text"
                name="name"
                placeholder="Nome da categoria"
                required
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color, i) => (
                <label key={color}>
                  <input
                    type="radio"
                    name="color"
                    value={color}
                    defaultChecked={i === 0}
                    className="sr-only peer"
                  />
                  <span
                    className="block h-7 w-7 cursor-pointer rounded-full border-2 border-transparent peer-checked:border-slate-900"
                    style={{ backgroundColor: color }}
                  />
                </label>
              ))}
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white"
            >
              Adicionar categoria
            </button>
          </form>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
