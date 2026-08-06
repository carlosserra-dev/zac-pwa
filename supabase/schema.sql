-- ============================================================
-- Contas Domésticas - schema do banco (Supabase / Postgres)
-- Rode este script inteiro no SQL Editor do seu projeto Supabase
-- ============================================================

-- Perfis (nome de exibição de cada usuário do casal)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  color text not null default '#6366f1',
  created_at timestamptz not null default now()
);

-- Categorias (editáveis pelo app)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default '🏷️',
  color text not null default '#6366f1',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Despesas recorrentes (ex: aluguel, assinaturas)
create table if not exists public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  note text,
  day_of_month integer not null default 1 check (day_of_month between 1 and 28),
  active boolean not null default true,
  split_equally boolean not null default false,
  installments_total integer,
  installments_generated integer not null default 0,
  created_at timestamptz not null default now()
);

-- Lançamentos (gastos)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  note text,
  transaction_date date not null default current_date,
  recurring_expense_id uuid references public.recurring_expenses (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists transactions_date_idx on public.transactions (transaction_date);
create index if not exists transactions_category_idx on public.transactions (category_id);
create index if not exists transactions_recurring_idx on public.transactions (recurring_expense_id);

-- Dívidas: quando um gasto recorrente é dividido, quem pagou (creditor)
-- fica com um crédito sobre o outro (debtor) até ele marcar como pago.
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

-- Histórico de alterações em gastos recorrentes (valor, dia, categoria,
-- quem paga, divisão, parcelas) - pra dar pra ver depois o que mudou e
-- quando, sem precisar abrir o banco.
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

-- Configurações internas do app (ex: controle de quando os gastos
-- recorrentes já foram gerados no mês, pra não repetir o trabalho toda
-- vez que o dashboard é aberto).
create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

-- Liga user_id diretamente a public.profiles (além de auth.users), pra que
-- o Supabase consiga fazer o "join" automático usado pelo app ao buscar
-- quem gastou cada lançamento.
alter table public.recurring_expenses
  drop constraint if exists recurring_expenses_user_id_fkey_profiles;
alter table public.recurring_expenses
  add constraint recurring_expenses_user_id_fkey_profiles
  foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.transactions
  drop constraint if exists transactions_user_id_fkey_profiles;
alter table public.transactions
  add constraint transactions_user_id_fkey_profiles
  foreign key (user_id) references public.profiles (id) on delete cascade;

-- ============================================================
-- Row Level Security
-- App é só para vocês dois: qualquer usuário autenticado no
-- projeto pode ver e editar todos os dados (é um app compartilhado
-- do casal, não multi-tenant). O cadastro público de novos
-- usuários fica desativado no painel do Supabase (Authentication
-- > Settings > "Allow new users to sign up" desmarcado), então só
-- vocês dois terão login.
-- ============================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.recurring_expenses enable row level security;
alter table public.transactions enable row level security;
alter table public.debts enable row level security;
alter table public.app_settings enable row level security;
alter table public.recurring_expense_changes enable row level security;

create policy "profiles: authenticated read" on public.profiles
  for select to authenticated using (true);
create policy "profiles: user manages own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "profiles: user updates own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);

create policy "categories: authenticated full access" on public.categories
  for all to authenticated using (true) with check (true);

create policy "recurring_expenses: authenticated full access" on public.recurring_expenses
  for all to authenticated using (true) with check (true);

create policy "transactions: authenticated full access" on public.transactions
  for all to authenticated using (true) with check (true);

create policy "debts: authenticated full access" on public.debts
  for all to authenticated using (true) with check (true);

create policy "app_settings: authenticated full access" on public.app_settings
  for all to authenticated using (true) with check (true);

create policy "recurring_expense_changes: authenticated full access" on public.recurring_expense_changes
  for all to authenticated using (true) with check (true);

-- Permissão de acesso às tabelas em si (separado do RLS acima). Sem isso,
-- mesmo com as políticas certas, o Postgres bloqueia tudo com "permission
-- denied" - necessário porque "Automatically expose new tables" fica
-- desligado no painel do Supabase.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.recurring_expenses to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.debts to authenticated;
grant select, insert, update, delete on public.app_settings to authenticated;
grant select, insert, update, delete on public.recurring_expense_changes to authenticated;

-- ============================================================
-- Cria o perfil automaticamente quando um usuário se cadastra
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Categorias iniciais (edite/apague como quiser depois pelo app)
-- ============================================================
insert into public.categories (name, icon, color, sort_order) values
  ('Mercado', '🛒', '#22c55e', 1),
  ('Pet', '🐾', '#f59e0b', 2),
  ('Casa', '🏠', '#0ea5e9', 3),
  ('Transporte', '🚗', '#a855f7', 4),
  ('Saúde', '💊', '#ef4444', 5),
  ('Lazer', '🎉', '#ec4899', 6),
  ('Outros', '📦', '#64748b', 7)
on conflict do nothing;
