export type Profile = {
  id: string;
  display_name: string;
  color: string;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  note: string | null;
  transaction_date: string; // yyyy-mm-dd
  recurring_expense_id: string | null;
  created_at: string;
};

export type RecurringExpense = {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  note: string | null;
  day_of_month: number;
  active: boolean;
  split_equally: boolean;
  installments_total: number | null;
  installments_generated: number;
  created_at: string;
};

export type Debt = {
  id: string;
  transaction_id: string;
  creditor_id: string;
  debtor_id: string;
  amount: number;
  settled: boolean;
  settled_at: string | null;
  created_at: string;
};

export type RecurringExpenseChange = {
  id: string;
  recurring_expense_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
};

export type TransactionWithRelations = Transaction & {
  categories: Pick<Category, "id" | "name" | "icon" | "color"> | null;
  profiles: Pick<Profile, "id" | "display_name" | "color"> | null;
};
