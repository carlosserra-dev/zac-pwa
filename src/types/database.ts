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
  created_at: string;
};

export type TransactionWithRelations = Transaction & {
  categories: Pick<Category, "id" | "name" | "icon" | "color"> | null;
  profiles: Pick<Profile, "id" | "display_name" | "color"> | null;
};
