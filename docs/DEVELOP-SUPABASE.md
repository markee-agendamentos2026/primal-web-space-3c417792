# Ambiente develop — Supabase separado da main

Este guia alinha a branch **`develop`** com a estrutura real da **Lovable Cloud** (dumps em `docs/`), usando um **projeto Supabase exclusivo** — sem compartilhar banco com `main`/produção.

## Princípios

| Ambiente | Branch Git | Banco / Backend |
|----------|------------|-----------------|
| Produção (Lovable cloud) | `main` | Supabase da Lovable — **não alterar daqui** |
| Develop local | `develop` | **Novo** projeto Supabase só para develop |

---

## 1. Criar projeto Supabase develop

1. [supabase.com](https://supabase.com) → **New project** (ex.: `markee-barbearia-develop`).
2. Anote: **Project URL**, **anon key**, **service_role key**, **project ref**.
3. **Não** reutilize o projeto `oaygouigevynbsexxdzw` (cloud Lovable / produção) no develop.

---

## 2. Aplicar SQL no Supabase develop (ordem obrigatória)

No **SQL Editor** do projeto develop:

### 2.1 Banco vazio (só na primeira vez)

Se já existir schema antigo e quiser recomeçar (**apaga todo `public`**):

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
```

### 2.2 Schema (estrutura cloud)

1. Cole e execute **`docs/schema_public.sql`** inteiro.
   - Remove linhas `\restrict` / `\unrestrict` se o editor reclamar (artefato do pg_dump).

### 2.3 Storage

2. Execute **`docs/storage_buckets.sql`**.

### 2.4 Dados

Escolha **uma** opção:

| Opção | Arquivo | Quando usar |
|-------|---------|-------------|
| **A — Seed mínimo** | `docs/data_public_seed.sql` | Dev limpo, sem usuários auth |
| **B — Dump completo** | `docs/data_public.sql` | Espelhar cloud; ver ressalvas abaixo |

**Ressalvas do dump completo (`data_public.sql`):**

- **`user_roles`** referencia `auth.users` — falha se os UUIDs não existirem. **Não** rode essa seção até criar usuários, ou use `docs/sql/bootstrap_admin.sql` depois.
- **`professionals.user_id`** — linhas com UUID de auth falham no banco novo; use seed ou `UPDATE professionals SET user_id = NULL WHERE ...`.
- **URLs de storage** apontam para `oaygouigevynbsexxdzw` — após importar, rode `docs/sql/replace_storage_urls.sql` (ajuste OLD/NEW ref) ou reenvie fotos pelo painel.

### 2.5 Realtime

Execute **`docs/sql/enable_realtime.sql`**.

Execute **`docs/sql/patch_tenant_isolation.sql`** (RPC tenant-aware + RLS parcial).

### 2.6 Usuários e papéis

1. **Authentication → Users → Add user** (e-mail + senha do admin develop).
2. Copie o **User UID**.
3. Execute **`docs/sql/bootstrap_admin.sql`** substituindo `YOUR_AUTH_USER_UUID`.
4. Para dono de barbearia: descomente o `INSERT` com role `owner` no mesmo arquivo.
5. BackOffice: `/admin/login` — só funciona com role `admin` em `user_roles`.

---

## 3. Variáveis de ambiente (develop)

Na raiz do repo, na branch **`develop`**:

```powershell
copy .env.example .env.development.local
```

Preencha com as chaves do **projeto develop** (não da main):

```env
VITE_SUPABASE_URL=https://SEU-DEVELOP-REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=SEU-DEVELOP-REF
VITE_APP_ENV=develop

SUPABASE_URL=https://SEU-DEVELOP-REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Para SSR local com Cloudflare:

```powershell
copy .dev.vars.example .dev.vars
```

O script `npm run dev` usa **`--mode development`** e carrega `.env.development` + `.env.development.local`.

**Confirme** que `VITE_SUPABASE_URL` **não** contém `oaygouigevynbsexxdzw` se esse for o projeto de produção.

---

## 4. Rodar o app

```powershell
git checkout develop
npm install
npm run dev
```

Testes rápidos:

- `/b/dom-amorim` — home do tenant
- `/b/dom-amorim/agendar` — fluxo cliente
- `/b/dom-amorim/login` → `/b/dom-amorim/painel` — dono
- `/admin` — BackOffice (após bootstrap admin)

---

## 5. Divergências conhecidas (código × cloud)

| Tópico | Cloud / schema | Código develop |
|--------|----------------|----------------|
| Rotas | — | Canônicas: `/b/:slug/*`; legado `/painel` redireciona |
| Tenants | Tabela `tenants` | `TenantSlugGate` lê slug + cores do banco |
| `user_roles` | `UNIQUE (user_id, role)` | Um usuário só pode ter **um** `owner` global — limitação do schema cloud |
| Migrations em `supabase/migrations/` | Histórico incremental | **Não** substituem `schema_public.sql`; develop usa dump como fonte de verdade |
| Auth | Não exportada no dump | Recriar manualmente + `bootstrap_admin.sql` |

Detalhes: **`docs/DIVERGENCIAS.md`**.

---

## 6. O que NÃO fazer

- Não fazer merge/push destas mudanças na **`main`** sem revisão.
- Não apontar develop para o Supabase de produção.
- Não rodar `DROP SCHEMA` no projeto de produção.
- Não commitar `.env`, `.env.development.local` ou `.dev.vars`.

---

## 7. Documentação Lovable (referência)

- `docs/00_README.md` — ordem dos SQLs
- `docs/TECNICO-PLATAFORMA.md` — arquitetura app
- `docs/SUPABASE-BANCO.md` — tabelas e RLS
- `docs/ARQUITETURA-AGENDA.md` — agenda e slots
- `docs/ESTRUTURA-PROJETO.md` — rotas e pastas
