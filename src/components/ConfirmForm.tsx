"use client";

import type { FormEvent, ReactNode } from "react";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  confirmMessage: string;
  className?: string;
  children: ReactNode;
};

// Form que pede confirmação (dialog nativo) antes de disparar a action -
// usado em botões destrutivos (excluir) pra evitar clique sem querer.
export function ConfirmForm({ action, confirmMessage, className, children }: Props) {
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    if (!window.confirm(confirmMessage)) {
      e.preventDefault();
    }
  }

  return (
    <form action={action} onSubmit={handleSubmit} className={className}>
      {children}
    </form>
  );
}
