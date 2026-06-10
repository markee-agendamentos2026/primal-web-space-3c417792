# Credenciais para teste local (branch `develop` → Supabase **MAIN**)

Projeto Supabase: **oaygouigevynbsexxdzw** (Lovable cloud / produção de dados).

## 1. Configurar ambiente

```powershell
# Na raiz do repo (branch develop)
node scripts/sync-main-env.mjs
```

Abra `.env.development.local` e `.dev.vars` e cole a **service_role** de:

https://supabase.com/dashboard/project/oaygouigevynbsexxdzw/settings/api

(Sem essa chave o **BackOffice** não carrega empresas.)

**Não use** a chave `sb_secret_...` do arquivo `.env.self` — ela é de **outro** projeto Supabase e retorna `Invalid API key` no MAIN.

Reinicie o dev server:

```powershell
npm run dev
```

## 2. Contas que já existem no banco MAIN

Testadas via API em maio/2026:

| Uso | URL | E-mail | Senha | Observação |
|-----|-----|--------|-------|------------|
| **BackOffice admin** | `/admin/login` | `elias@gmail.com` | `teste@123` | `is_admin()` = true |
| **Painel Dom Amorim** | `/b/dom-amorim/login` | `elias@gmail.com` | `teste@123` | Roles `owner` + `admin` no tenant Dom Amorim |
| **Painel Studio Nails** | `/b/studio-nails/login` | Criar dono no BackOffice ou ver abaixo | — | Elias está só no tenant 001 no dump |

Outros usuários no dump (senhas **desconhecidas** — só reset pelo BackOffice ou SQL):

- Owners antigos em `user_roles` (UUIDs no `data_public.sql`)
- Profissionais com e-mail `testeelias@gmail.com`, `profissionalteste@gmail.com`, etc.

## 3. Criar dono de teste (opcional)

No **SQL Editor** do Supabase MAIN, rode `docs/sql/seed_owner_dom_amorim.sql` para garantir:

- `dono@dom-amorim.com` / `DomAmorim@123` — owner só da Dom Amorim

Ou use **BackOffice** → Empresas → Nova empresa (cria tenant + owner automaticamente).

## 4. Fluxo ponta a ponta sugerido

1. `/admin/login` → `elias@gmail.com` / `teste@123`
2. `/admin/empresas` — lista deve carregar (precisa service_role)
3. Clicar em uma empresa — detalhe deve abrir
4. `/b/dom-amorim/login` → mesmo login → `/b/dom-amorim/painel`
5. `/b/dom-amorim/agendar` — fluxo cliente

## 5. Problemas comuns

| Sintoma | Causa | Solução |
|---------|-------|---------|
| BackOffice lista vazia / erro ao abrir empresa | Falta `SUPABASE_SERVICE_ROLE_KEY` no SSR | Passo 1 acima |
| Login painel “E-mail ou senha incorretos” após auth OK | Sem role no tenant do slug | Usar conta com `owner`/`admin` naquele tenant |
| Login auth falha | Senha errada ou outro projeto Supabase | Conferir URL em `.env.development.local` = `oaygouigevynbsexxdzw` |
