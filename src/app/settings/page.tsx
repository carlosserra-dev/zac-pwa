import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut, updateDisplayName, updatePassword } from "@/lib/actions";
import { BottomNav } from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SubmitButton } from "@/components/SubmitButton";

const ERROR_MESSAGES: Record<string, string> = {
  name: "Preencha um nome válido.",
  "password-short": "A senha precisa ter pelo menos 6 caracteres.",
  "password-match": "As senhas não coincidem.",
  password: "Não foi possível alterar a senha. Tente novamente.",
};

const SAVED_MESSAGES: Record<string, string> = {
  name: "Nome atualizado ✓",
  password: "Senha alterada ✓",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("id, display_name, color, created_at")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <>
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-6 pt-8">
        <Link
          href="/"
          className="mb-4 inline-block text-sm text-slate-500 dark:text-slate-400"
        >
          ← Voltar
        </Link>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Configurações
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {user?.email}
        </p>

        {saved && SAVED_MESSAGES[saved] && (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            {SAVED_MESSAGES[saved]}
          </p>
        )}
        {error && ERROR_MESSAGES[error] && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
            {ERROR_MESSAGES[error]}
          </p>
        )}

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Aparência
          </h2>
          <ThemeToggle />
        </section>

        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Nome de exibição
          </h2>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            É esse nome que aparece em &ldquo;quem gastou&rdquo; nos
            lançamentos, em vez do seu e-mail.
          </p>
          <form action={updateDisplayName} className="flex gap-2">
            <input
              type="text"
              name="display_name"
              defaultValue={profile?.display_name ?? ""}
              required
              className="flex-1 min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <SubmitButton
              pendingLabel="Salvando..."
              className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition active:scale-95 dark:bg-slate-100 dark:text-slate-900"
            >
              Salvar
            </SubmitButton>
          </form>
        </section>

        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Alterar senha
          </h2>
          <form action={updatePassword} className="space-y-3">
            <input
              type="password"
              name="password"
              placeholder="Nova senha"
              minLength={6}
              required
              autoComplete="new-password"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <input
              type="password"
              name="confirm_password"
              placeholder="Confirmar nova senha"
              minLength={6}
              required
              autoComplete="new-password"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <SubmitButton
              pendingLabel="Alterando..."
              className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white transition active:scale-95 dark:bg-slate-100 dark:text-slate-900"
            >
              Alterar senha
            </SubmitButton>
          </form>
        </section>

        <section className="mt-10">
          <form action={signOut}>
            <SubmitButton
              pendingLabel="Saindo..."
              className="w-full rounded-lg bg-red-50 py-3 text-sm font-medium text-red-600 transition active:scale-95 dark:bg-red-500/10 dark:text-red-400"
            >
              Sair da conta
            </SubmitButton>
          </form>
        </section>

        <p className="mt-10 text-center text-xs text-slate-400 dark:text-slate-600">
          Contas Domésticas
        </p>
      </main>
      <BottomNav />
    </>
  );
}
