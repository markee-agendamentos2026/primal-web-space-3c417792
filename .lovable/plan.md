# Onboarding Markee — Site exclusivo `/b/markee/*`

Vou separar em **4 passos** pra evitar erro. Cada passo é uma entrega independente, validável visualmente, antes de seguir.

Slug reservado: `markee`. As rotas abaixo NÃO usam os componentes de tenant comum (`Index`, `TenantSlugGate`, painel de dono etc.) — é um site próprio da Markee, isolado, futurista, clean.

---

## Passo 1 — Front: Landing + Acompanhamento (sem backend)

Entrega visual pra você já validar estilo, tipografia, animações.

**Rotas novas:**
- `/b/markee` → landing (hero motivacional + "7 dias grátis, sem cartão" + botão **Começar** + botão **Acompanhamento**)
- `/b/markee/acompanhamento` → busca por telefone OU nº do chamado, mostra status (mock por enquanto)
- `/b/markee/comecar` → wrapper do wizard (passo 2)

**Guard:** rota `/b/$slug` precisa detectar `slug === "markee"` e renderizar o site Markee em vez do `TenantSlugGate` normal. Mesma coisa em `/b/$slug/...` que conflitar.

**Estilo:**
- Tema próprio: tokens em `src/styles.css` sob escopo (ex.: `.markee-theme { --background: ...; --primary: ...; }`) — cores leves, fundo escuro com toques de violeta/ciano (universo/IA), gradientes sutis.
- Tipografia: fonte display (Space Grotesk) + body (Inter) em tamanhos confortáveis (body ~16-17px, headings generosos).
- Animação hero: "universo em movimento" — canvas leve com partículas/orbes em loop suave (CSS + framer-motion, sem libs pesadas).
- Mobile-first, mas com breakpoints até `2xl` (desktop largo).

## Passo 2 — Front: Wizard de cadastro (IA "digitando")

Wizard em etapas, cada pergunta aparece com efeito de **typing** (três pontinhos animados → texto sai char a char, velocidade média).

**Etapas:**
1. Dados da empresa: nome do estabelecimento, nome do dono, WhatsApp, e-mail.
2. Sobre o negócio: **segmento** (cards com foto + descrição: Barbearia, Salão, Estética, Nail, Outros — "Outros" abre input livre).
3. Conte-me mais (textarea até 500 caracteres) + cores preferidas (3 swatches: primary, glow, secondary com presets + custom).
4. Revisão + envio → tela "Sua proposta está em análise" com **número do chamado** mockado.

**Componentes:** `MarkeeTypingText`, `MarkeeUniverse` (animação), `MarkeeStepShell`, `SegmentCard`, `ColorPicker`.
Persistência local em `localStorage` enquanto não há backend.

## Passo 3 — Backend: chamados + integração BackOffice

**Migration (Supabase):**
- Tabela `markee_leads`: `ticket_number` (serial human, ex: `MKE-000123`), `business_name`, `owner_name`, `whatsapp`, `email`, `segment`, `segment_other`, `about` (até 500), `primary_color`, `primary_glow_color`, `secondary_color`, `status` (`em_analise` → `personalizando` → `pronto` → `ativo`), timestamps, `created_tenant_id` (preenchido qd vira tenant), `notes`.
- Tabela `markee_lead_events`: log de mudança de status (actor, from, to, message, created_at).
- RLS: insert público (lead novo), select público SOMENTE com filtro por `ticket_number + whatsapp` (server fn), admin gerencia tudo.
- Grants corretos (anon insert + select via RPC; service_role tudo).

**Server functions:**
- `markeeCreateLead` (público) — cria lead, retorna `ticket_number`. Dispara e-mail + WhatsApp (uazapi — integração paga que JÁ existe) para Markee e para o cliente.
- `markeeGetLeadStatus` (público, validado) — busca por `ticket_number` OU `whatsapp`.
- `markeeAdminListLeads` / `markeeAdminUpdateStatus` (admin) — usado no BackOffice.

**BackOffice:**
- Nova rota `/admin/markee-leads` (lista) e `/admin/markee-leads/$id` (detalhe + botão avançar status). Cada avanço dispara e-mail + WhatsApp pro cliente.

**Acompanhamento real:** `/b/markee/acompanhamento` passa a usar `markeeGetLeadStatus`. Após criar lead, cliente é redirecionado pra `/b/markee/acompanhamento?ticket=MKE-000123` com status ao vivo (refresh + polling leve).

## Passo 4 — Conversão lead → tenant + período de 7 dias grátis

**No BackOffice**, botão **"Criar tenant a partir do lead"**: gera tenant (slug sugerido a partir do nome), aplica cores escolhidas, cria owner em `auth.users` + `user_roles`, marca `tenants.status='active'` com `trial_ends_at = now() + 7 days` (coluna nova) e `last_payment_at = null`.

**Regra de trial (já parecida com a existente de cobrança):**
- Enquanto `trial_ends_at > now()` e sem pagamento → tenant ativo, banner no painel do dono mostrando "Faltam X dias do seu período grátis". Reusa o `FinancialCountdownDialog` existente, adaptado.
- Pagou dentro do trial → vira ciclo mensal normal (regra atual de `last_payment_at` + `monthly_price` + grace de 5 dias antes/depois já implementada).
- Trial expirou sem pagamento → cai na tela bloqueada já existente (`TenantBlockedScreen`).

**Disparo final:** ao avançar status pra `pronto`/`ativo`, manda e-mail + WhatsApp com link `/b/<slug>/login` e credenciais (ou link mágico via Supabase).

---

## Detalhes técnicos

- **Roteamento:** alteramos `src/routes/b.$slug.tsx` (e `b.$slug.index.tsx`) para curto-circuitar quando `slug === "markee"`, montando `<MarkeeShell><Outlet/></MarkeeShell>` em vez do shell padrão. Rotas filhas: `b.markee.tsx` (layout), `b.markee.index.tsx`, `b.markee.comecar.tsx`, `b.markee.acompanhamento.tsx`.
- **Tema isolado:** classe `.markee-theme` no shell + variáveis CSS próprias. Não toca tokens globais.
- **Animação universo:** canvas 2D leve (~50 partículas, requestAnimationFrame), respeitando `prefers-reduced-motion`.
- **Typing:** hook `useTypewriter(text, speed)` + dots SVG animados (framer-motion).
- **WhatsApp dos disparos da Markee:** usa a integração `uazapi` já existente no projeto (config `app_settings.uazapi_token` + `uazapi_base_url`). Você confirmou que essa parte é paga e operada pela Markee.

---

## Esta resposta entrega: **Passo 1 + Passo 2** (front completo, sem backend)

Você vê a landing, abre o wizard, passa pelas 4 etapas com efeitos de IA, chega na tela "em análise" com ticket mockado, e testa o acompanhamento (mock). Quando aprovar o visual, eu sigo pro Passo 3 (backend + BackOffice) e Passo 4 (tenant + trial).

Quer que eu inclua agora também a tela de busca de acompanhamento com mock funcional (digite qualquer telefone → mostra status fake "Em análise" com timeline), pra você sentir o fluxo completo? **Sim por padrão.**