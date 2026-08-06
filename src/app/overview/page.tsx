import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/BottomNav";
import { MonthsBarChart, type MonthTotal } from "@/components/MonthsBarChart";
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
  searchParams: Promise<{ person?: string }>;
}) {
  const { person: selectedPersonId } = await searchParams;

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

  const totalMonth = currentMonthTx.reduce((sum, t) => sum + Number(t.amount), 0);

  // Por pessoa - já considerando a parte de cada um em contas divididas
  const byPerson = typedProfiles.map((p) => ({
    id: p.id,
    name: p.display_name,
    color: p.color,
    total:
      Math.round(
        currentMonthTx.reduce((sum, t) => sum + shareFor(t, p.id), 0) * 100
      ) / 100,
  }));

  // Filtro por pessoa (opcional, via ?person=<id>)
  const activePerson = selectedPersonId
    ? byPerson.find((p) => p.id === selectedPersonId)
    : undefined;
  const displayTotal = activePerson ? activePerson.total : totalMonth;

  // Itens exibidos na lista "Lançamentos do mês". Sem filtro, mostra os
  // lançamentos crus (quem pagou de fato). Filtrando por pessoa, mostra a
  // parte de responsabilidade dela em cada lançamento (inclusive a metade
  // de contas que a outra pessoa pagou, mas que ela também deve).
  type DisplayItem = {
    key: string;
    icon: string;
    categoryName: string;
    note: string | null;
    date: string;
    amount: number;
    personLabel: string | null;
    partial: boolean;
    txId: string;
    deletable: boolean;
  };

  const displayItems: DisplayItem[] = activePerson
    ? currentMonthTx
        .filter((t) => shareFor(t, activePerson.id) > 0)
        .map((t) => {
          const debt = debtsByTxId.get(t.id);
          const partial = Boolean(debt);
          return {
            key: t.id,
            icon: t.categories?.icon ?? "📦",
            categoryName: t.categories?.name ?? "Categoria",
            note: t.note,
            date: t.transaction_date,
            amount: shareFor(t, activePerson.id),
            personLabel:
              partial && t.user_id !== activePerson.id
                ? `metade · pago por ${t.profiles?.display_name ?? "seu par"}`
                : partial
                  ? "metade"
                  : null,
            partial,
            txId: t.id,
            deletable: t.user_id === activePerson.id,
          };
        })
    : currentMonthTx.map((t) => ({
        key: t.id,
        icon: t.categories?.icon ?? "📦",
        categoryName: t.categories?.name ?? "Categoria",
        note: t.note,
        date: t.transaction_date,
        amount: Number(t.amount),
        personLabel: t.profiles?.display_name ?? null,
        partial: false,
        txId: t.id,
        deletable: true,
      }));

  // Por categoria (respeita o filtro de pessoa, se houver)
  const byCategoryMap = new Map<
    string,
    { name: string; icon: string; color: string; total: number }
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

  // Comparativo dos últimos 6 meses
  const months: MonthTotal[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const total = all
      .filter((t) => {
        const td = new Date(t.transaction_date);
        return `${td.getFullYear()}-${td.getMonth()}` === key;
      })
      .reduce((sum, t) => sum + Number(t.amount), 0);
    months.push({
      label: MONTH_LABELS[d.getMonth()],
      total: Math.round(total * 100) / 100,
      isCurrent: i === 0,
    });
  }

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
          <p className="text-xs text-slate-300">
            {activePerson ? `Total de ${activePerson.name} este mês` : "Total gasto este mês"}
          </p>
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
                    href={isActive ? "/overview" : `/overview?person=${p.id}`}
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
            {activePerson && (
              <Link
                href="/overview"
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
        <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <MonthsBarChart data={months} />
        </div>

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
            const pct = displayTotal > 0 ? (c.total / displayTotal) * 100 : 0;
            return (
              <div
                key={c.name}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 break-words font-medium text-slate-700 dark:text-slate-300">
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
              </div>
            );
          })}
        </div>

        <h2 className="mt-8 mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          {activePerson ? `Lançamentos de ${activePerson.name}` : "Lançamentos do mês"}
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
                  <button
                    type="submit"
                    className="ml-1 shrink-0 rounded-full bg-red-50 px-2 py-1 text-xs text-red-600 transition active:scale-90 dark:bg-red-500/10 dark:text-red-400"
                  >
                    ✕
                  </button>
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
