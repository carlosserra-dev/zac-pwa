"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const RECURRING_GENERATED_KEY = "recurring_generated_month";

function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function resetRecurringGenerationGate(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  // Força o gerador a reavaliar no próximo carregamento do dashboard
  // (usado quando uma recorrência é criada ou reativada no meio do mês).
  await supabase
    .from("app_settings")
    .delete()
    .eq("key", RECURRING_GENERATED_KEY);
}

// ---------- Autenticação ----------

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=1");
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------- Perfil / conta ----------

export async function updateDisplayName(formData: FormData) {
  const displayName = String(formData.get("display_name") || "").trim();
  if (!displayName) redirect("/settings?error=name");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);

  if (error) redirect("/settings?error=name");

  revalidatePath("/settings");
  revalidatePath("/add");
  revalidatePath("/overview");
  revalidatePath("/recurring");
  redirect("/settings?saved=name");
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  if (!password || password.length < 6) {
    redirect("/settings?error=password-short");
  }
  if (password !== confirmPassword) {
    redirect("/settings?error=password-match");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) redirect("/settings?error=password");

  redirect("/settings?saved=password");
}

// ---------- Lançamentos ----------

export async function addTransaction(formData: FormData) {
  const categoryId = String(formData.get("category_id") || "");
  const spentBy = String(formData.get("spent_by") || "");
  const amountRaw = String(formData.get("amount") || "0").replace(",", ".");
  const amount = Number.parseFloat(amountRaw);
  const note = String(formData.get("note") || "").trim() || null;

  if (!categoryId || !spentBy || !Number.isFinite(amount) || amount <= 0) {
    redirect(`/add/${categoryId}?error=1`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("transactions").insert({
    category_id: categoryId,
    user_id: spentBy,
    amount,
    note,
  });

  if (error) {
    redirect(`/add/${categoryId}?error=1`);
  }

  revalidatePath("/");
  revalidatePath("/overview");
  redirect("/?saved=1");
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  await supabase.from("transactions").delete().eq("id", id);
  revalidatePath("/overview");
}

// ---------- Categorias ----------

export async function addCategory(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const icon = String(formData.get("icon") || "📦").trim() || "📦";
  const color = String(formData.get("color") || "#6366f1");
  if (!name) redirect("/categories?error=1");

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1;

  const { error } = await supabase
    .from("categories")
    .insert({ name, icon, color, sort_order: nextOrder });

  if (error) {
    console.error("addCategory insert error:", error);
    redirect(`/categories?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/categories");
  revalidatePath("/");
  redirect("/categories?saved=1");
}

export async function updateCategory(id: string, formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const icon = String(formData.get("icon") || "📦").trim() || "📦";
  const color = String(formData.get("color") || "#6366f1");
  if (!name) redirect("/categories?error=1");

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ name, icon, color })
    .eq("id", id);

  if (error) redirect("/categories?error=1");

  revalidatePath("/categories");
  revalidatePath("/");
  redirect("/categories?saved=1");
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    // Provavelmente existem lançamentos usando essa categoria (FK restrict)
    redirect("/categories?error=used");
  }

  revalidatePath("/categories");
  revalidatePath("/");
  redirect("/categories?saved=1");
}

// ---------- Gastos recorrentes ----------

export async function addRecurringExpense(formData: FormData) {
  const categoryId = String(formData.get("category_id") || "");
  const amountRaw = String(formData.get("amount") || "0").replace(",", ".");
  const amount = Number.parseFloat(amountRaw);
  const note = String(formData.get("note") || "").trim() || null;
  const dayOfMonth = Number.parseInt(String(formData.get("day_of_month") || "1"), 10);
  const spentBy = String(formData.get("spent_by") || "");
  const splitEqually = formData.get("split_equally") === "on";
  const installmentsType = String(formData.get("installments_type") || "none");
  const installmentsTotalRaw = Number.parseInt(
    String(formData.get("installments_total") || ""),
    10
  );
  const installmentsTotal =
    installmentsType === "count" &&
    Number.isFinite(installmentsTotalRaw) &&
    installmentsTotalRaw > 0
      ? installmentsTotalRaw
      : null;

  if (
    !categoryId ||
    !spentBy ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    (installmentsType === "count" && !installmentsTotal)
  ) {
    redirect("/recurring?error=1");
  }

  const supabase = await createClient();

  const { error } = await supabase.from("recurring_expenses").insert({
    category_id: categoryId,
    user_id: spentBy,
    amount,
    note,
    day_of_month: Number.isFinite(dayOfMonth) ? Math.min(28, Math.max(1, dayOfMonth)) : 1,
    split_equally: splitEqually,
    installments_total: installmentsTotal,
    installments_generated: 0,
  });

  if (error) {
    console.error("addRecurringExpense insert error:", error);
    redirect("/recurring?error=1");
  }

  await resetRecurringGenerationGate(supabase);

  revalidatePath("/recurring");
  redirect("/recurring?saved=1");
}

export async function updateRecurringExpense(id: string, formData: FormData) {
  const categoryId = String(formData.get("category_id") || "");
  const spentBy = String(formData.get("spent_by") || "");
  const amountRaw = String(formData.get("amount") || "0").replace(",", ".");
  const amount = Number.parseFloat(amountRaw);
  const note = String(formData.get("note") || "").trim() || null;
  const dayOfMonth = Number.parseInt(String(formData.get("day_of_month") || "1"), 10);
  const splitEqually = formData.get("split_equally") === "on";
  const installmentsType = String(formData.get("installments_type") || "none");
  const installmentsTotalRaw = Number.parseInt(
    String(formData.get("installments_total") || ""),
    10
  );
  const installmentsTotal =
    installmentsType === "count" &&
    Number.isFinite(installmentsTotalRaw) &&
    installmentsTotalRaw > 0
      ? installmentsTotalRaw
      : null;

  if (
    !categoryId ||
    !spentBy ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    (installmentsType === "count" && !installmentsTotal)
  ) {
    redirect("/recurring?error=1");
  }

  const supabase = await createClient();

  const { data: before } = await supabase
    .from("recurring_expenses")
    .select("category_id, user_id, amount, note, day_of_month, split_equally, installments_total")
    .eq("id", id)
    .maybeSingle();

  const newDayOfMonth = Number.isFinite(dayOfMonth) ? Math.min(28, Math.max(1, dayOfMonth)) : 1;

  const { error } = await supabase
    .from("recurring_expenses")
    .update({
      category_id: categoryId,
      user_id: spentBy,
      amount,
      note,
      day_of_month: newDayOfMonth,
      split_equally: splitEqually,
      installments_total: installmentsTotal,
    })
    .eq("id", id);

  if (error) {
    console.error("updateRecurringExpense error:", error);
    redirect("/recurring?error=1");
  }

  if (before) {
    await logRecurringChanges(supabase, id, before, {
      category_id: categoryId,
      user_id: spentBy,
      amount,
      note,
      day_of_month: newDayOfMonth,
      split_equally: splitEqually,
      installments_total: installmentsTotal,
    });
  }

  // O valor ou o dia podem ter mudado - reavalia se falta gerar algo
  // ainda neste mês (não afeta lançamentos já gerados anteriormente).
  await resetRecurringGenerationGate(supabase);

  revalidatePath("/recurring");
  revalidatePath("/overview");
  redirect("/recurring?saved=1");
}

type RecurringSnapshot = {
  category_id: string;
  user_id: string;
  amount: number;
  note: string | null;
  day_of_month: number;
  split_equally: boolean;
  installments_total: number | null;
};

// Compara o estado antes/depois de uma edição e grava um registro por
// campo alterado, com nomes legíveis (não só ids), pra dar pra revisar
// depois "o que mudou e quando" sem precisar abrir o banco.
async function logRecurringChanges(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recurringExpenseId: string,
  before: RecurringSnapshot,
  after: RecurringSnapshot
) {
  const changes: { field: string; old_value: string | null; new_value: string | null }[] = [];

  if (Number(before.amount) !== Number(after.amount)) {
    changes.push({
      field: "Valor",
      old_value: `R$ ${Number(before.amount).toFixed(2)}`,
      new_value: `R$ ${Number(after.amount).toFixed(2)}`,
    });
  }
  if (before.day_of_month !== after.day_of_month) {
    changes.push({
      field: "Dia",
      old_value: `dia ${before.day_of_month}`,
      new_value: `dia ${after.day_of_month}`,
    });
  }
  if ((before.note ?? "") !== (after.note ?? "")) {
    changes.push({
      field: "Observação",
      old_value: before.note,
      new_value: after.note,
    });
  }
  if (before.split_equally !== after.split_equally) {
    changes.push({
      field: "Divisão",
      old_value: before.split_equally ? "dividido 50/50" : "não dividido",
      new_value: after.split_equally ? "dividido 50/50" : "não dividido",
    });
  }
  if ((before.installments_total ?? null) !== (after.installments_total ?? null)) {
    changes.push({
      field: "Parcelas",
      old_value: before.installments_total ? `${before.installments_total}x` : "sem fim",
      new_value: after.installments_total ? `${after.installments_total}x` : "sem fim",
    });
  }

  if (before.category_id !== after.category_id || before.user_id !== after.user_id) {
    const [{ data: cats }, { data: profs }] = await Promise.all([
      supabase.from("categories").select("id, name"),
      supabase.from("profiles").select("id, display_name"),
    ]);
    const catName = (cid: string) => cats?.find((c) => c.id === cid)?.name ?? "categoria";
    const profName = (pid: string) => profs?.find((p) => p.id === pid)?.display_name ?? "alguém";

    if (before.category_id !== after.category_id) {
      changes.push({
        field: "Categoria",
        old_value: catName(before.category_id),
        new_value: catName(after.category_id),
      });
    }
    if (before.user_id !== after.user_id) {
      changes.push({
        field: "Quem paga",
        old_value: profName(before.user_id),
        new_value: profName(after.user_id),
      });
    }
  }

  if (changes.length > 0) {
    const { error } = await supabase.from("recurring_expense_changes").insert(
      changes.map((c) => ({
        recurring_expense_id: recurringExpenseId,
        field: c.field,
        old_value: c.old_value,
        new_value: c.new_value,
      }))
    );
    if (error) {
      console.error("logRecurringChanges insert error:", error);
    }
  }
}

export async function duplicateRecurringExpense(id: string) {
  const supabase = await createClient();
  const { data: original } = await supabase
    .from("recurring_expenses")
    .select("category_id, user_id, amount, note, day_of_month, split_equally")
    .eq("id", id)
    .maybeSingle();

  if (!original) {
    redirect("/recurring?error=1");
  }

  const { error } = await supabase.from("recurring_expenses").insert({
    category_id: original.category_id,
    user_id: original.user_id,
    amount: original.amount,
    note: original.note ? `${original.note} (cópia)` : "Cópia",
    day_of_month: original.day_of_month,
    split_equally: original.split_equally,
    installments_total: null,
    installments_generated: 0,
    active: true,
  });

  if (error) {
    console.error("duplicateRecurringExpense error:", error);
    redirect("/recurring?error=1");
  }

  await resetRecurringGenerationGate(supabase);

  revalidatePath("/recurring");
  redirect("/recurring?saved=1");
}

export async function toggleRecurringExpense(id: string, active: boolean) {
  const supabase = await createClient();
  await supabase.from("recurring_expenses").update({ active }).eq("id", id);
  if (active) {
    await resetRecurringGenerationGate(supabase);
  }
  revalidatePath("/recurring");
}

export async function deleteRecurringExpense(id: string) {
  const supabase = await createClient();
  await supabase.from("recurring_expenses").delete().eq("id", id);
  revalidatePath("/recurring");
}

// Gera os lançamentos do mês corrente para as despesas recorrentes ativas,
// caso ainda não tenham sido lançadas. Chamado ao abrir o dashboard.
// Só faz o trabalho pesado uma vez por mês (controlado por app_settings) -
// nas outras vezes é só uma leitura rápida por chave primária.
export async function ensureRecurringForCurrentMonth() {
  const supabase = await createClient();
  const yearMonth = currentYearMonth();

  const { data: gate } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", RECURRING_GENERATED_KEY)
    .maybeSingle();

  if (gate?.value === yearMonth) return;

  const { data: recurring } = await supabase
    .from("recurring_expenses")
    .select(
      "id, user_id, category_id, amount, note, day_of_month, active, split_equally, installments_total, installments_generated"
    )
    .eq("active", true);

  if (!recurring || recurring.length === 0) {
    await supabase
      .from("app_settings")
      .upsert({ key: RECURRING_GENERATED_KEY, value: yearMonth });
    return;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthStart = new Date(year, month, 1).toISOString().slice(0, 10);
  const monthEnd = new Date(year, month + 1, 1).toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("transactions")
    .select("recurring_expense_id")
    .gte("transaction_date", monthStart)
    .lt("transaction_date", monthEnd)
    .not("recurring_expense_id", "is", null);

  const already = new Set((existing || []).map((t) => t.recurring_expense_id));
  const pending = recurring.filter((r) => !already.has(r.id));

  if (pending.length > 0) {
    const needsProfiles = pending.some((r) => r.split_equally);
    let profileIds: string[] = [];
    if (needsProfiles) {
      const { data: profiles } = await supabase.from("profiles").select("id");
      profileIds = (profiles || []).map((p) => p.id);
    }

    for (const r of pending) {
      const day = Math.min(r.day_of_month, 28);
      const date = new Date(year, month, day).toISOString().slice(0, 10);
      const baseNote = r.note ? `${r.note} (recorrente)` : "Recorrente";
      const otherProfileId = profileIds.find((id) => id !== r.user_id);

      const { data: inserted, error: insertError } = await supabase
        .from("transactions")
        .insert({
          category_id: r.category_id,
          user_id: r.user_id,
          amount: r.amount,
          note: r.split_equally ? `${baseNote} - dividido` : baseNote,
          transaction_date: date,
          recurring_expense_id: r.id,
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        console.error("ensureRecurringForCurrentMonth insert error:", insertError);
        continue;
      }

      if (r.split_equally && otherProfileId) {
        const share = Math.round((r.amount / 2) * 100) / 100;
        const { error: debtError } = await supabase.from("debts").insert({
          transaction_id: inserted.id,
          creditor_id: r.user_id,
          debtor_id: otherProfileId,
          amount: share,
        });
        if (debtError) {
          console.error("ensureRecurringForCurrentMonth debt error:", debtError);
        }
      }

      if (r.installments_total) {
        const nextCount = r.installments_generated + 1;
        const updates: Record<string, unknown> = {
          installments_generated: nextCount,
        };
        if (nextCount >= r.installments_total) {
          updates.active = false;
        }
        await supabase
          .from("recurring_expenses")
          .update(updates)
          .eq("id", r.id);
      }
    }
  }

  await supabase
    .from("app_settings")
    .upsert({ key: RECURRING_GENERATED_KEY, value: yearMonth });
}

// ---------- Dívidas ----------

export async function settleDebt(id: string, settled: boolean) {
  const supabase = await createClient();
  await supabase
    .from("debts")
    .update({ settled, settled_at: settled ? new Date().toISOString() : null })
    .eq("id", id);
  revalidatePath("/debts");
}
