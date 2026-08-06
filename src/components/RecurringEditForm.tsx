"use client";

import type { FormEvent, ReactNode } from "react";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  originalAmount: number;
  className?: string;
  children: ReactNode;
};

// Form de edição de recorrente que avisa antes de salvar se o valor
// mudou muito (dobrou, ou caiu pra menos da metade) - pega erros de
// digitação como o do aluguel em dobro.
export function RecurringEditForm({ action, originalAmount, className, children }: Props) {
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    const formData = new FormData(e.currentTarget);
    const raw = String(formData.get("amount") || "0").replace(",", ".");
    const newAmount = Number.parseFloat(raw);

    if (Number.isFinite(newAmount) && originalAmount > 0) {
      const ratio = newAmount / originalAmount;
      const changedALot = ratio >= 1.8 || ratio <= 0.55;
      if (changedALot) {
        const ok = window.confirm(
          `O valor vai mudar de R$ ${originalAmount.toFixed(2)} para R$ ${newAmount.toFixed(
            2
          )} - uma diferença grande. Confirma que é isso mesmo?`
        );
        if (!ok) {
          e.preventDefault();
        }
      }
    }
  }

  return (
    <form action={action} onSubmit={handleSubmit} className={className}>
      {children}
    </form>
  );
}
