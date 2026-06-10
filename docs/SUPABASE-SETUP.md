# Supabase — configuração e isolamento multi-tenant

O app usa **apenas Supabase** como banco, auth e storage. O Lovable é só hospedagem do frontend (build/deploy); **dados e login ficam no seu projeto Supabase**.

## Projeto recomendado

| Ambiente | Projeto | Onde configurar |
|----------|---------|-----------------|
| Produção | `oaygouigevynbsexxdzw` (MAIN) | Painel Lovable **ou** variáveis no host + Supabase Dashboard |
| Develop local (MAIN) | `oaygouigevynbsexxdzw` | `npm run env:main` |
| Develop local (SELF) | `gpirjdeebpnakndlogpr` | `npm run env:self` (lê `.env.self`) |

## 1. Variáveis de ambiente

Copie `.env.example` → `.env.development.local` e preencha **do mesmo projeto**:

```env
VITE_SUPABASE_URL=https://SEU-REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...anon...
VITE_SUPABASE_PROJECT_ID=SEU-REF

SUPABASE_URL=https://SEU-REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJ...anon...
SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role...   # só servidor — BackOffice
```

`.dev.vars` (SSR local) — mesmos valores de `SUPABASE_*`.

```bash
npm run env:main   # aponta para MAIN (oaygouigevynbsexxdzw)
npm run env:self   # aponta para SELF (gpirjdeebpnakndlogpr) via .env.self
```

### Projeto SELF (`gpirjdeebpnakndlogpr`)

1. Preencha `.env.self` com URL + anon + service_role do dashboard  
2. `npm run env:self` → gera `.env.development.local` e `.dev.vars`  
3. Aplique o schema: `supabase link --project-ref gpirjdeebpnakndlogpr` e `supabase db push`  
   (ou cole `docs/schema_public.sql` + migration `20260528180000_tenant_isolation_complete.sql` no SQL Editor)  
4. Crie seu admin: login em `/admin` (migration seed ou `docs/sql/grant_owner_by_email.sql`)

**BackOffice** (`/admin/*`) exige `SUPABASE_SERVICE_ROLE_KEY` correta no `.dev.vars`.

### Erro "Invalid API key" ao criar empresa

A URL e a `service_role` **precisam ser do mesmo projeto**. Se a URL é `oaygouigevynbsexxdzw` mas a chave é de outro projeto (ex. `.env.self`), o BackOffice retorna 200 no browser e falha no servidor.

1. Abra https://supabase.com/dashboard/project/oaygouigevynbsexxdzw/settings/api  
2. Copie **service_role** (secret)  
3. Cole em `.dev.vars` e `.env.development.local` em `SUPABASE_SERVICE_ROLE_KEY=`  
4. Reinicie `npm run dev`

Ou: adicione `SUPABASE_SERVICE_ROLE_KEY=eyJ...` no `.env` e rode `npm run env:main`.

## 2. Aplicar schema e isolamento

No [SQL Editor](https://supabase.com/dashboard) do projeto:

1. Se o banco for novo: rode `docs/schema_public.sql` + `docs/storage_buckets.sql`
2. Rode **todas** as migrations: `supabase db push` (CLI linkada) **ou** cole o conteúdo de cada arquivo em `supabase/migrations/` em ordem
3. Migration crítica de isolamento: `supabase/migrations/20260528180000_tenant_isolation_complete.sql`

Ou só o patch manual legado: `docs/sql/patch_tenant_isolation.sql` (parcial; prefira a migration acima).

## 3. Modelo de isolamento

| Camada | Comportamento |
|--------|----------------|
| **URL** | `/b/:slug/*` — slug identifica a empresa |
| **App** | Todas as queries com `.eq('tenant_id', getCurrentTenantId())` |
| **RLS** | Dono/profissional: `user_has_tenant_role(uid, tenant_id, role)` |
| **RLS público** | SELECT exige `tenant_id IS NOT NULL`; INSERT valida tenant ativo |
| **BackOffice** | `admin` + service role — vê todas as empresas; alterações em `app_settings` / features afetam todos |
| **Realtime** | Filtro `tenant_id=eq.<uuid>` nos canais |

## 4. Usuários

| Tipo | Login | Onde |
|------|-------|------|
| Dono / profissional | email + senha | `/b/:slug/login` → painel |
| Cliente | WhatsApp (sem auth) | agendar / meus-agendamentos |
| Admin plataforma | email + senha | `/admin/login` → `is_admin` |

Criar empresa: BackOffice `/admin/empresas/nova` (service role).

## 5. Cores por empresa

Edite `src/lib/theme.ts` (bloco por `slug`) — não vem do banco.

## 6. Checklist pós-deploy

- [ ] Migrations aplicadas (incl. `20260528180000`)
- [ ] Realtime habilitado (migration ou `docs/sql/enable_realtime.sql`)
- [ ] Service role no host de produção (Lovable/Cloudflare)
- [ ] Testar duas empresas: dados de `dom-amorim` não aparecem em `studio-nails`
