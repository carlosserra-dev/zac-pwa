import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { settleDebt } from "@/lib/actions";
import { BottomNav } from "@/components/BottomNav";
import type { Category, Profile } from "@/types/database";

type DebtWithRelations = {
  id: string;
  transaction_id: string;
  creditor_id: string;
  debtor_id: string;
  amount: number;
  settled: boolean;
  settled_at: string | null;
  created_at: string;
  creditor: Pick<Profile, "id" | "display_name" | "color"> | null;
  debtor: Pick<Profile, "id" | "display_name" | "color"> | null;
  transactions: {
    note: string | null;
    transaction_date: string;
    category_id: string;
    categories: Pick<Category, "icon" | "name"> | null;
  } | null;
};

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default async function DebtsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("id, display_name, color, created_at")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const settleWithId = async (id: string, next: boolean) => {
    "use server";
    await settleDebt(id, next);
  };

  if (!profile) {
    return (
      <>
        <main className="mx-auto w-full max-w-md flex-1 px-5 pb-6 pt-8">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Não foi possível carregar seu perfil.
          </p>
        </main>
        <BottomNav />
      </>
    );
  }

  const { data: debts, error } = await supabase
    .from("debts")
    .select(
      "id, transaction_id, creditor_id, debtor_id, amount, settled, settled_at, created_at, creditor:profiles!debts_creditor_id_fkey ( id, display_name, color ), debtor:profiles!debts_debtor_id_fkey ( id, display_name, color ), transactions ( note, transaction_date, category_id, categories ( icon, name ) )"
    )
    .or(`creditor_id.eq.${profile.id},debtor_id.eq.${profile.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("debts: erro ao buscar dívidas:", error);
  }

  const typedDebts = (debts as unknown as DebtWithRelations[]) ?? [];

  const youOwe = typedDebts.filter(
    (d) => d.debtor_id === profile.id && !d.settled
  );
  const owedToYou = typedDebts.filter(
    (d) => d.creditor_id === profile.id && !d.settled
  );
  const settled = typedDebts.filter((d) => d.settled).slice(0, 20);

  const totalYouOwe = youOwe.reduce((sum, d) => sum + Number(d.amount), 0);
  const totalOwedToYou = owedToYou.reduce(
    (sum, d) => sum + Number(d.amount),
    0
  );

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
          Dívidas
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Contas fixas divididas 50/50 entre vocês
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/20 dark:bg-red-500/10">
            <p className="text-xs text-red-600 dark:text-red-400">
              Você deve
            </p>
            <p className="mt-0.5 text-lg font-semibold text-red-700 dark:text-red-400">
              R$ {totalYouOwe.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              Devem a você
            </p>
            <p className="mt-0.5 text-lg font-semibold text-emerald-700 dark:text-emerald-400">
              R$ {totalOwedToYou.toFixed(2)}
            </p>
          </div>
        </div>

        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Você deve
          </h2>
          <div className="space-y-2">
            {youOwe.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="shrink-0 text-xl">
                  {d.transactions?.categories?.icon ?? "🤝"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-slate-800 dark:text-slate-200">
                    {d.transactions?.categories?.name ?? "Conta dividida"} · R${" "}
                    {Number(d.amount).toFixed(2)}
                  </p>
                  <p className="break-words text-xs text-slate-500 dark:text-slate-400">
                    Para {d.creditor?.display_name ?? "seu par"}
                    {d.transactions?.transaction_date
                      ? ` · ${formatDate(d.transactions.transaction_date)}`
                      : ""}
                    {d.transactions?.note ? ` · ${d.transactions.note}` : ""}
                  </p>
                </div>
                <form action={settleWithId.bind(null, d.id, true)}>
                  <button
                    type="submit"
                    className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition active:scale-90 dark:bg-emerald-500/10 dark:text-emerald-400"
                  >
                    Marcar pago
                  </button>
                </form>
              </div>
            ))}
            {youOwe.length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Você não deve nada no momento 🎉
              </p>
            )}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Devem a você
          </h2>
          <div className="space-y-2">
            {owedToYou.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="shrink-0 text-xl">
                  {d.transactions?.categories?.icon ?? "🤝"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-slate-800 dark:text-slate-200">
                    {d.transactions?.categories?.name ?? "Conta dividida"} · R${" "}
                    {Number(d.amount).toFixed(2)}
                  </p>
                  <p className="break-words text-xs text-slate-500 dark:text-slate-400">
                    De {d.debtor?.display_name ?? "seu par"}
                    {d.transactions?.transaction_date
                      ? ` · ${formatDate(d.transactions.transaction_date)}`
                      : ""}
                    {d.transactions?.note ? ` · ${d.transactions.note}` : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  Pendente
                </span>
              </div>
            ))}
            {owedToYou.length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Ninguém deve nada a você no momento.
              </p>
            )}
          </div>
        </section>

        {settled.length > 0 && (
          <details className="mt-8">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300">
              Histórico quitado
            </summary>
            <div className="mt-2 space-y-2">
              {settled.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 opacity-60 dark:border-slate-800 dark:bg-slate-900"
                >
                  <span className="shrink-0 text-xl">
                    {d.transactions?.categories?.icon ?? "🤝"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium text-slate-800 dark:text-slate-200">
                      {d.transactions?.categories?.name ?? "Conta dividida"} ·
                      R$ {Number(d.amount).toFixed(2)}
                    </p>
                    <p className="break-words text-xs text-slate-500 dark:text-slate-400">
                      {d.debtor?.display_name} → {d.creditor?.display_name} ·
                      quitado
                    </p>
                  </div>
                  {d.debtor_id === profile.id && (
                    <form action={settleWithId.bind(null, d.id, false)}>
                      <button
                        type="submit"
                        className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500 transition active:scale-90 dark:bg-slate-800 dark:text-slate-400"
                      >
                        Desfazer
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </main>
      <BottomNav />
    </>
  );
}
