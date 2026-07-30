# Contas Domésticas

App simples de controle de gastos para o casal: login, escolha de categoria,
valor + observação opcional, gastos recorrentes automáticos e um resumo
mensal com gráfico comparativo. PWA — dá para instalar na tela inicial do
celular.

Stack: **Next.js (App Router) + Supabase (Postgres + Auth) + Tailwind +
Recharts**, hospedado no **Vercel**.

## 1. Criar o projeto no Supabase (grátis)

1. Acesse [supabase.com](https://supabase.com) e crie uma conta (dá para
   entrar com GitHub).
2. Clique em **New Project**. Escolha um nome, uma senha forte para o banco
   e a região mais próxima (ex: São Paulo).
3. Aguarde uns 2 minutos até o projeto ficar pronto.
4. No menu lateral, vá em **SQL Editor** → **New query**, cole todo o
   conteúdo do arquivo [`supabase/schema.sql`](./supabase/schema.sql) deste
   projeto e clique em **Run**. Isso cria as tabelas, categorias iniciais e
   as permissões (RLS).
5. Vá em **Authentication → Settings** e desmarque **"Allow new users to
   sign up"** (ou equivalente "Enable email signups"). Assim só quem você
   cadastrar manualmente consegue entrar.
6. Vá em **Authentication → Users** → **Add user** → **Create new user** e
   cadastre dois usuários: o seu e o da sua namorada (e-mail + senha). Isso
   já cria automaticamente o perfil de cada um (nome de exibição = parte do
   e-mail antes do @ — pode editar depois direto na tabela `profiles` pelo
   **Table Editor** se quiser um nome diferente).
7. Vá em **Project Settings → API**. Copie a **Project URL** e a chave
   **anon public** — vai precisar delas no próximo passo.

## 2. Configurar as variáveis de ambiente

Copie o arquivo `.env.local.example` para `.env.local` e preencha com os
valores do passo anterior:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

## 3. Rodar localmente (opcional, pra testar antes de publicar)

```bash
npm install
npm run dev
```

Abra http://localhost:3000 e faça login com um dos usuários criados no
passo 1.

## 4. Publicar no Vercel

Você já tem conta no Vercel, então:

1. Suba este projeto para um repositório no GitHub (ou GitLab/Bitbucket).
2. No [painel do Vercel](https://vercel.com/new), clique em **Add New →
   Project** e importe o repositório.
3. Na tela de configuração, abra **Environment Variables** e adicione as
   mesmas duas variáveis do `.env.local` (`NEXT_PUBLIC_SUPABASE_URL` e
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Clique em **Deploy**. Em ~1 minuto o app estará no ar em uma URL tipo
   `contas-domesticas.vercel.app`.

## 5. Instalar no celular (PWA)

Abra a URL do app no navegador do celular (Chrome/Safari) e use a opção
**"Adicionar à tela de início"** (Android) ou **"Adicionar à Tela de
Início"** no menu de compartilhar (iPhone). Vira um ícone como se fosse um
app nativo, sem barra de navegador.

## Estrutura do projeto

```
src/
  app/
    login/            tela de login
    page.tsx           dashboard (grade de categorias)
    add/[categoryId]/  valor + observação + quem gastou
    categories/        criar/editar/excluir categorias
    recurring/          gastos fixos (aluguel, assinaturas etc.)
    overview/           resumo do mês + gráfico comparativo
  lib/
    actions.ts          todas as ações de escrita no banco (server actions)
    supabase/            clientes Supabase (browser, server, middleware)
  types/database.ts     tipos das tabelas
supabase/schema.sql      schema completo do banco + policies
```

## Ideias para evoluir depois

- Definir um orçamento mensal por categoria e mostrar alerta ao estourar.
- Exportar os lançamentos do mês em CSV.
- Editar o valor/observação de um lançamento já salvo (hoje só dá pra
  excluir e lançar de novo).
- Notificação push lembrando de lançar o gasto do dia.
