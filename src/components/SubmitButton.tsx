"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: string;
};

// Botão de submit que já reage no clique (fica desabilitado e mostra um
// spinner) em vez de ficar "sem resposta" durante o round-trip até o
// servidor terminar. Mesmo padrão de UI usado por qualquer app nativo.
export function SubmitButton({
  children,
  pendingLabel,
  className,
  disabled,
  ...props
}: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`${className ?? ""} inline-flex items-center justify-center gap-2 disabled:opacity-70`}
      {...props}
    >
      {pending && (
        <span
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {pending ? pendingLabel ?? "Salvando..." : children}
    </button>
  );
}
