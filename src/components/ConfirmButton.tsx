"use client";

import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  confirmMessage: string;
};

// Botão de submit (inclusive com formAction) que pede confirmação antes
// de disparar - usado em ações destrutivas que não estão isoladas no
// próprio <form> (ex: dois botões compartilhando o mesmo form).
export function ConfirmButton({ confirmMessage, onClick, ...props }: Props) {
  return (
    <button
      {...props}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    />
  );
}
