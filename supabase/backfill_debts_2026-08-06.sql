-- ============================================================
-- Backfill de dívidas — ZAC (06/08/2026)
-- Roda uma vez só. Cria a dívida retroativa para lançamentos antigos
-- que vieram de recorrências marcadas como "dividir 50/50" mas que
-- foram gerados antes da funcionalidade de dívidas existir.
-- Idempotente: não duplica se já existir uma dívida pro lançamento.
-- ============================================================

insert into public.debts (transaction_id, creditor_id, debtor_id, amount)
select
  t.id as transaction_id,
  t.user_id as creditor_id,
  p.id as debtor_id,
  round((t.amount / 2)::numeric, 2) as amount
from public.transactions t
join public.recurring_expenses r on r.id = t.recurring_expense_id
cross join lateral (
  select id from public.profiles where id <> t.user_id limit 1
) p
where r.split_equally = true
  and not exists (
    select 1 from public.debts d where d.transaction_id = t.id
  );
