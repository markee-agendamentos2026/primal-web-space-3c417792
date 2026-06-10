# Divergências: main × develop × cloud Lovable

Matriz de referência para o alinhamento da branch **`develop`** (maio/2026).

## Git / deploy

| Item | `main` | `develop` |
|------|--------|-----------|
| Deploy Lovable | Sim (cloud própria) | Não — apenas local / preview futuro |
| Supabase no código | Secrets no painel Lovable | `.env.development.local` (projeto separado) |
| Rotas `/b/:slug` | Pode estar desatualizado | Implementado + redirects legados |
| BackOffice `/admin` | Depende do que está na main | Presente na develop |

## Banco de dados

| Fonte | Conteúdo | Uso |
|-------|----------|-----|
| `docs/schema_public.sql` | Schema **atual da cloud** | Aplicar no Supabase **develop** |
| `supabase/migrations/*.sql` | Histórico incremental do repo | Referência; **não** apagar sem aviso |
| `docs/data_public.sql` | Dados reais exportados | Opcional no develop; cuidado com `auth` |
| `docs/data_public_seed.sql` | Seed mínimo sem auth | Recomendado para banco novo |

### Projeto Supabase

| Projeto | Ref (exemplo) | Uso |
|---------|---------------|-----|
| Lovable cloud / produção | `oaygouigevynbsexxdzw` | **main** — não usar no develop |
| Develop dedicado | *criar novo* | Apenas branch `develop` |

## Multi-tenant

| Aspecto | Estado na cloud | Develop |
|---------|-----------------|---------|
| `tenant_id` nas tabelas | Sim | Igual após `schema_public.sql` |
| Slugs `dom-amorim`, `studio-nails` | No dump | Seed + dump |
| Mapa `TENANTS` em código | Fallback | Banco é fonte de verdade via `TenantSlugGate` |
| `DEFAULT_TENANT_SLUG` | `dom-amorim` | Redirects legados `/`, `/agendar` |

## Auth e BackOffice

| Problema | Causa | Solução develop |
|----------|-------|-----------------|
| `/admin` sem empresas | Banco vazio ou `is_admin()` false | Seed + `bootstrap_admin.sql` |
| Login painel falha | Sem `user_roles` para o tenant | Criar user + role `owner` no tenant |
| `user_roles` duplicado | `UNIQUE(user_id, role)` | Um owner por usuário no schema atual |

## Realtime

Tabelas usadas no código (habilitar no develop):

- `bookings`
- `services`
- `professionals`
- `profiles`

Script: `docs/sql/enable_realtime.sql`.

## RLS (atenção SaaS)

O dump cloud inclui policies; várias tabelas ainda permitem leitura ampla em alguns cenários. Evolução tenant-aware na develop deve **endurecer** RLS antes de produção — ver `docs/SUPABASE-BANCO.md`.

## Checklist de validação local

- [ ] `.env.development.local` aponta para projeto develop (ref diferente de produção)
- [ ] `schema_public.sql` aplicado sem erro
- [ ] `storage_buckets.sql` aplicado
- [ ] `data_public_seed.sql` ou dados importados
- [ ] `enable_realtime.sql` aplicado
- [ ] Admin criado (`bootstrap_admin.sql`)
- [ ] `/b/dom-amorim` carrega
- [ ] `/b/studio-nails/agendar` lista serviços do tenant 2
- [ ] `/admin/empresas` lista 2 empresas
- [ ] Login dono em `/b/dom-amorim/login` mantém URL com slug
