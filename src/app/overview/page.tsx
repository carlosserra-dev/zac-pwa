import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/BottomNav";
import {
  MonthsBarChart,
  type MonthTotal,
  type MonthSeriesRow,
} from "@/components/MonthsBarChart";
import { ConfirmButton } from "@/components/ConfirmButton";
import { deleteTransaction } from "@/lib/actions";
import type { Profile, TransactionWithRelations } from "@/types/database";

const MONTH_LABELS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function monthRange(monthsBack: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  return start;
}

type DebtLite = { transaction_id: string; creditor_id: string; debtor_id: string; amount: number };

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ person?: string; category?: string }>;
}) {
  const { person: selectedPersonId, category: selectedCategoryParam } = await searchParams;
  const selectedCategoryIds = new Set(
    (selectedCategoryParam ?? "").split(",").filter(Boolean)
  );

  const supabase = await createClient();

  const rangeStart = monthRange(5); // 6 meses no total (mês atual + 5 anteriores)
  const rangeStartStr = rangeStart.toISOString().slice(0, 10);

  const [
    { data: transactions, error: transactionsError },
    { data: profiles },
    { data: debts },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, user_id, category_id, amount, note, transaction_date, recurring_expense_id, created_at, categories ( id, name, icon, color ), profiles ( id, display_name, color )"
      )
      .gte("transaction_date", rangeStartStr)
      .order("transaction_date", { ascending: false }),
    supabase.from("profiles").select("id, display_name, color, created_at"),
    supabase.from("debts").select("transaction_id, creditor_id, debtor_id, amount"),
  ]);

  if (transactionsError) {
    console.error("overview: erro ao buscar transactions:", transactionsError);
  }

  const all = (transactions as unknown as TransactionWithRelations[]) ?? [];
  const typedProfiles = (profiles as Profile[] | null) ?? [];
  const debtsByTxId = new Map<string, DebtLite>(
    ((debts as DebtLite[] | null) ?? []).map((d) => [d.transaction_id, d])
  );

  // Quanto de um lançamento é "responsabilidade" de determinada pessoa.
  // Se o lançamento tiver uma dívida associada (conta dividida 50/50), a
  // metade conta pra cada um, independente de quem pagou ou se já foi
  // quitado entre eles - senão, conta 100% pra quem lançou.
  function shareFor(t: TransactionWithRelations, personId: string) {
    const debt = debtsByTxId.get(t.id);
    if (debt) {
      if (personId === debt.creditor_id) return Number(t.amount) - Number(debt.amount);
      if (personId === debt.debtor_id) return Number(debt.amount);
      return 0;
    }
    return t.user_id === personId ? Number(t.amount) : 0;
  }

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;

  const currentMonthTx = all.filter((t) => {
    const d = new Date(t.transaction_date);
    return `${d.getFullYear()}-${d.getMonth()}` === currentMonthKey;
  });

  // Por pessoa - já considerando a parte de cada um em contas divididas.
  // Sempre calculado sobre todos os lançamentos do mês (não respeita o
  // filtro de categoria), pra servir como navegação de nível superior.
  const byPerson = typedProfiles.map((p) => ({
    id: p.id,
    name: p.display_name,
    color: p.color,
    total:
      Math.round(
        currentMonthTx.reduce((sum, t) => sum + shareFor(t, p.id), 0) * 100
      ) / 100,
  }));
  const activePerson = selectedPersonId
    ? byPerson.find((p) => p.id === selectedPersonId)
    : undefined;

  // Por categoria - respeita o filtro de pessoa (mas não o de categoria,
  // já que essa lista é justamente a navegação entre categorias).
  const byCategoryMap = new Map<
    string,
    { id: string; name: string; icon: string; color: string; total: number }
  >();
  for (const t of currentMonthTx) {
    const amount = activePerson ? shareFor(t, activePerson.id) : Number(t.amount);
    if (amount <= 0) continue;
    const key = t.category_id;
    const cat = t.categories;
    const existing = byCategoryMap.get(key);
    if (existing) {
      existing.total += amount;
    } else {
      byCategoryMap.set(key, {
        id: key,
        name: cat?.name ?? "Outros",
        icon: cat?.icon ?? "📦",
        color: cat?.color ?? "#64748b",
        total: amount,
      });
    }
  }
  const byCategory = Array.from(byCategoryMap.values()).sort(
    (a, b) => b.total - a.total
  );
  const activeCategories = byCategory.filter((c) => selectedCategoryIds.has(c.id));
  // Denominador estável pras barras de progresso de "Por categoria" - não
  // usa o total filtrado, senão as barras estouram quando a categoria
  // filtrada tem valor baixo comparado às outras.
  const categoryScopeTotal = byCategory.reduce((sum, c) => sum + c.total, 0);

  // Combina os dois filtros: quanto desse lançamento entra na visão atual.
  function amountFor(t: TransactionWithRelations) {
    if (selectedCategoryIds.size > 0 && !selectedCategoryIds.has(t.category_id)) return 0;
    return activePerson ? shareFor(t, activePerson.id) : Number(t.amount);
  }

  const displayTotal =
    Math.round(currentMonthTx.reduce((sum, t) => sum + amountFor(t), 0) * 100) / 100;

  // Itens exibidos na lista "Lançamentos do mês", já filtrados pelos
  // filtros ativos (pessoa e/ou categoria).
  type DisplayItem = {
    key: string;
    icon: string;
    categoryName: string;
    note: string | null;
    date: string;
    amount: number;
    personLabel: string | null;
    txId: string;
    deletable: boolean;
  };

  const displayItems: DisplayItem[] = currentMonthTx
    .filter((t) => amountFor(t) > 0)
    .map((t) => {
      const debt = debtsByTxId.get(t.id);
      const partial = Boolean(debt) && Boolean(activePerson);
      return {
        key: t.id,
        icon: t.categories?.icon ?? "📦",
        categoryName: t.categories?.name ?? "Categoria",
        note: t.note,
        date: t.transaction_date,
        amount: amountFor(t),
        personLabel: activePerson
          ? partial && t.user_id !== activePerson.id
            ? `metade · pago por ${t.profiles?.display_name ?? "seu par"}`
            : partial
              ? "metade"
              : null
          : (t.profiles?.display_name ?? null),
        txId: t.id,
        deletable: activePerson ? t.user_id === activePerson.id : true,
      };
    });

  // Comparativo dos últimos 6 meses - respeita os dois filtros também.
  // Com 1+ categorias selecionadas, vira um gráfico com uma barra por
  // categoria (série), pra comparar a evolução delas lado a lado.
  const months: MonthTotal[] = [];
  const monthSeriesRows: MonthSeriesRow[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const txThisMonth = all.filter((t) => {
      const td = new Date(t.transaction_date);
      return `${td.getFullYear()}-${td.getMonth()}` === key;
    });

    const total = txThisMonth.reduce((sum, t) => sum + amountFor(t), 0);
    months.push({
      label: MONTH_LABELS[d.getMonth()],
      total: Math.round(total * 100) / 100,
      isCurrent: i === 0,
    });

    if (activeCategories.length > 0) {
      const row: MonthSeriesRow = { label: MONTH_LABELS[d.getMonth()], isCurrent: i === 0 };
      for (const cat of activeCategories) {
        const catTotal = txThisMonth
          .filter((t) => t.category_id === cat.id)
          .reduce((sum, t) => sum + (activePerson ? shareFor(t, activePerson.id) : Number(t.amount)), 0);
        row[cat.id] = Math.round(catTotal * 100) / 100;
      }
      monthSeriesRows.push(row);
    }
  }

  function buildHref(personId: string | null, categoryIds: Set<string>) {
    const params = new URLSearchParams();
    if (personId) params.set("person", personId);
    if (categoryIds.size > 0) params.set("category", Array.from(categoryIds).join(","));
    const qs = params.toString();
    return qs ? `/overview?${qs}` : "/overview";
  }

  function personHref(personId: string) {
    const next = activePerson?.id === personId ? null : personId;
    return buildHref(next, selectedCategoryIds);
  }

  function categoryHref(categoryId: string) {
    const next = new Set(selectedCategoryIds);
    if (next.has(categoryId)) {
      next.delete(categoryId);
    } else {
      next.add(categoryId);
    }
    return buildHref(selectedPersonId ?? null, next);
  }

  const clearCategoriesHref = buildHref(selectedPersonId ?? null, new Set());

  const hasActiveFilter = Boolean(activePerson) || activeCategories.length > 0;

  const categoryLabel =
    activeCategories.length === 0
      ? null
      : activeCategories.length <= 2
        ? activeCategories.map((c) => c.name).join(" + ")
        : `${activeCategories.length} categorias`;

  const totalLabel =
    activePerson && categoryLabel
      ? `Total de ${activePerson.name} em ${categoryLabel} este mês`
      : activePerson
        ? `Total de ${activePerson.name} este mês`
        : categoryLabel
          ? `Total em ${categoryLabel} este mês`
          : "Total gasto este mês";

  const listLabel =
    activePerson && categoryLabel
      ? `Lançamentos de ${activePerson.name} em ${categoryLabel}`
      : activePerson
        ? `Lançamentos de ${activePerson.name}`
        : categoryLabel
          ? `Lançamentos em ${categoryLabel}`
          : "Lançamentos do mês";

  const deleteWithId = async (id: string) => {
    "use server";
    await deleteTransaction(id);
  };

  return (
    <>
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-6 pt-8">
        <Link
          href="/"
          className="mb-4 inline-block text-sm text-slate-500 dark:text-slate-400"
        >
          ← Voltar
        </Link>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Resumo do mês
        </h1>

        <div className="mt-4 rounded-2xl bg-slate-900 px-5 py-6 text-white dark:bg-slate-800">
          <p className="text-xs text-slate-300">{totalLabel}</p>
          <p className="mt-1 text-3xl font-semibold">
            R$ {displayTotal.toFixed(2)}
          </p>
          {activePerson && (
            <p className="mt-1 text-xs text-slate-400">
              Já inclui a parte dele(a) em contas divididas
            </p>
          )}
        </div>

        {byPerson.length > 0 && (
          <div className="mt-4">
            <div className="flex gap-2">
              {byPerson.map((p) => {
                const isActive = activePerson?.id === p.id;
                return (
                  <Link
                    key={p.id}
                    href={personHref(p.id)}
                    scroll={false}
                    className={`flex-1 rounded-xl border px-3 py-3 text-left transition active:scale-[0.98] ${
                      isActive
                        ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10"
                        : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                    }`}
                  >
                    <p
                      className={`text-xs ${
                        isActive
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {p.name}
                    </p>
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                      R$ {p.total.toFixed(2)}
                    </p>
                  </Link>
                );
              })}
            </div>
            {hasActiveFilter && (
              <Link
                href="/overview"
                scroll={false}
                className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-600 transition active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                ↺ Ver todos
              </Link>
            )}
          </div>
        )}

        <h2 className="mt-8 mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Comparativo dos últimos 6 meses
        </h2>
        {hasActiveFilter && (
          <p className="mb-2 text-xs text-slate-400 dark:text-slate-500">
            Considerando o filtro ativo acima
          </p>
        )}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          {activeCategories.length > 0 ? (
            <MonthsBarChart
              data={monthSeriesRows}
              series={activeCategories.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
            />
          ) : (
            <MonthsBarChart data={months} />
          )}
        </div>

        {activeCategories.length > 0 && (
          <Link
            href={clearCategoriesHref}
            scroll={false}
            className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-medium text-slate-600 transition active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            ↺ Limpar filtro de categorias
          </Link>
        )}

        <h2 className="mt-8 mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Por categoria
        </h2>
        <div className="space-y-2">
          {byCategory.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Nenhum gasto lançado neste mês ainda.
            </p>
          )}
          {byCategory.map((c) => {
            const isActive = selectedCategoryIds.has(c.id);
            const pct = categoryScopeTotal > 0 ? (c.total / categoryScopeTotal) * 100 : 0;
            return (
              <Link
                key={c.id}
                href={categoryHref(c.id)}
                scroll={false}
                className={`block rounded-xl border px-4 py-3 transition active:scale-[0.99] ${
                  isActive
                    ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span
                    className={`flex min-w-0 items-center gap-1.5 break-words font-medium ${
                      isActive
                        ? "text-indigo-700 dark:text-indigo-300"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {isActive && <span className="shrink-0">✓</span>}
                    {c.icon} {c.name}
                  </span>
                  <span className="shrink-0 text-slate-500 dark:text-slate-400">
                    R$ {c.total.toFixed(2)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: c.color }}
                  />
                </div>
              </Link>
            );
          })}
        </div>

        <h2 className="mt-8 mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          {listLabel}
        </h2>
        <div className="space-y-2 pb-4">
          {displayItems.map((item) => (
            <div
              key={item.key}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="shrink-0 text-lg">{item.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium text-slate-800 dark:text-slate-200">
                  {item.categoryName}
                  {item.note ? ` · ${item.note}` : ""}
                </p>
                <p className="break-words text-xs text-slate-500 dark:text-slate-400">
                  {new Date(item.date).toLocaleDateString("pt-BR")}
                  {item.personLabel ? ` · ${item.personLabel}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-slate-800 dark:text-slate-200">
                R$ {item.amount.toFixed(2)}
              </span>
              {item.deletable && (
                <form action={deleteWithId.bind(null, item.txId)}>
                  <ConfirmButton
                    type="submit"
                    confirmMessage={`Excluir "${item.categoryName}${
                      item.note ? " - " + item.note : ""
                    }" (R$ ${item.amount.toFixed(2)})?`}
                    className="ml-1 shrink-0 rounded-full bg-red-50 px-2 py-1 text-xs text-red-600 transition active:scale-90 dark:bg-red-500/10 dark:text-red-400"
                  >
                    ✕
                  </ConfirmButton>
                </form>
              )}
            </div>
          ))}
          {displayItems.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Nenhum lançamento aqui ainda.
            </p>
          )}
        </div>
      </main>
      <BottomNav />
    </>
  );
}
