-- ============================================================
-- Migração incremental — ZAC (06/08/2026, parte 2)
-- Rode este script inteiro no SQL Editor do Supabase.
-- Seguro rodar mais de uma vez (idempotente).
-- ============================================================

-- Histórico de alterações em gastos recorrentes (valor, dia, categoria,
-- quem paga, divisão, parcelas).
create table if not exists public.recurring_expense_changes (
  id uuid primary key default gen_random_uuid(),
  recurring_expense_id uuid not null references public.recurring_expenses (id) on delete cascade,
  field text not null,
  old_value text,
  new_value text,
  changed_at timestamptz not null default now()
);

create index if not exists recurring_expense_changes_rec_idx
  on public.recurring_expense_changes (recurring_expense_id);

alter table public.recurring_expense_changes enable row level security;

drop policy if exists "recurring_expense_changes: authenticated full access" on public.recurring_expense_changes;
create policy "recurring_expense_changes: authenticated full access" on public.recurring_expense_changes
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.recurring_expense_changes to authenticated;
