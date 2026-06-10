# SQL exportados da Lovable Cloud

> **Configuração Supabase (obrigatório):** [`SUPABASE-SETUP.md`](./SUPABASE-SETUP.md)  
> **Guia develop:** [`DEVELOP-SUPABASE.md`](./DEVELOP-SUPABASE.md)  
> **Matriz de divergências:** [`DIVERGENCIAS.md`](./DIVERGENCIAS.md)

# Sincronizar Supabase do develop com a cloud (Lovable)

Aplique os arquivos no seu Supabase do `develop` **nesta ordem**, via SQL Editor:

1. `schema_public.sql` — cria todos os tipos, tabelas, funções, triggers e policies RLS do schema `public`.
2. `storage_buckets.sql` — cria o bucket `service-photos` (público).
3. `data_public.sql` — popula as tabelas com os dados atuais (tenants, services, profissionais, etc.). **Pule este passo se quiser apenas o schema vazio.**

## Notas importantes

- O dump é apenas do schema `public` + buckets de `storage`. Os schemas `auth`, `storage` (interno) e `realtime` já existem no seu Supabase e não devem ser tocados.
- Usuários em `auth.users` **não** são exportados (não temos permissão). Você precisará recriar os usuários donos manualmente pelo BackOffice (`/admin`) ou pelo Dashboard do Supabase.
- Após aplicar, vá em **Database → Replication** e adicione as tabelas que precisarem de realtime à publication `supabase_realtime` (se usar).
- Confira os secrets no seu projeto Supabase do develop: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` devem ser os do projeto do develop, não os da main.

## Se algo já existir

Se o seu develop já tem tabelas, rode antes (CUIDADO — apaga tudo do public):
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
```
