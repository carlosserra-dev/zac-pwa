-- ============================================================
-- Migração incremental — ZAC (06/08/2026)
-- Rode este script inteiro no SQL Editor do Supabase.
-- Seguro rodar mais de uma vez (idempotente).
-- ============================================================

-- Parcelas em gastos recorrentes
alter table public.recurring_expenses
  add column if not exists installments_total integer,
  add column if not exists installments_generated integer not null default 0;

-- Dívidas (Splitwise-style): quando um gasto recorrente é dividido, quem
-- pagou (creditor) fica com um crédito sobre o outro (debtor) até ele
-- marcar como pago.
create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  creditor_id uuid not null references public.profiles (id) on delete cascade,
  debtor_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  settled boolean not null default false,
  settled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists debts_creditor_idx on public.debts (creditor_id);
create index if not exists debts_debtor_idx on public.debts (debtor_id);

-- Configurações internas (controla se os recorrentes do mês já foram
-- gerados, pra não repetir o trabalho toda vez que o dashboard é aberto)
create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.debts enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "debts: authenticated full access" on public.debts;
create policy "debts: authenticated full access" on public.debts
  for all to authenticated using (true) with check (true);

drop policy if exists "app_settings: authenticated full access" on public.app_settings;
create policy "app_settings: authenticated full access" on public.app_settings
  for all to authenticated using (true) with check (true);

-- Permissões de tabela (necessário além do RLS, mesmo padrão das outras
-- tabelas do app)
grant select, insert, update, delete on public.debts to authenticated;
grant select, insert, update, delete on public.app_settings to authenticated;
