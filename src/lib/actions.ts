"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  if (!categoryId || !spentBy || !Number.isFinite(amount) || amount <= 0) {
    redirect("/recurring?error=1");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("recurring_expenses").insert({
    category_id: categoryId,
    user_id: spentBy || user?.id,
    amount,
    note,
    day_of_month: Number.isFinite(dayOfMonth) ? Math.min(28, Math.max(1, dayOfMonth)) : 1,
  });

  if (error) redirect("/recurring?error=1");

  revalidatePath("/recurring");
  redirect("/recurring?saved=1");
}

export async function toggleRecurringExpense(id: string, active: boolean) {
  const supabase = await createClient();
  await supabase.from("recurring_expenses").update({ active }).eq("id", id);
  revalidatePath("/recurring");
}

export async function deleteRecurringExpense(id: string) {
  const supabase = await createClient();
  await supabase.from("recurring_expenses").delete().eq("id", id);
  revalidatePath("/recurring");
}

// Gera os lançamentos do mês corrente para as despesas recorrentes ativas,
// caso ainda não tenham sido lançadas. Chamado ao abrir o dashboard.
export async function ensureRecurringForCurrentMonth() {
  const supabase = await createClient();

  const { data: recurring } = await supabase
    .from("recurring_expenses")
    .select("id, user_id, category_id, amount, note, day_of_month, active")
    .eq("active", true);

  if (!recurring || recurring.length === 0) return;

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

  const toInsert = recurring
    .filter((r) => !already.has(r.id))
    .map((r) => {
      const day = Math.min(r.day_of_month, 28);
      const date = new Date(year, month, day).toISOString().slice(0, 10);
      return {
        category_id: r.category_id,
        user_id: r.user_id,
        amount: r.amount,
        note: r.note ? `${r.note} (recorrente)` : "Recorrente",
        transaction_date: date,
        recurring_expense_id: r.id,
      };
    });

  if (toInsert.length > 0) {
    await supabase.from("transactions").insert(toInsert);
  }
}
