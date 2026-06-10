import { redirect } from "@tanstack/react-router";
import { DEFAULT_TENANT_SLUG, getCurrentTenantSlug, resolveTenantSlugFromPath } from "@/lib/tenant";

/** Slug para redirects legados (/painel → /b/:slug/painel). URL primeiro; sem localStorage. */
export function getSlugForRedirect(): string {
  if (typeof window !== "undefined") {
    const fromUrl = resolveTenantSlugFromPath(window.location.pathname);
    if (fromUrl) return fromUrl;
  }
  return DEFAULT_TENANT_SLUG;
}

/**
 * Caminho canônico do painel sob o tenant.
 * @example painelPath("/clientes", "studio-nails") → "/b/studio-nails/painel/clientes"
 */
export function painelPath(subpath = "", slug?: string): string {
  const s = slug ?? getCurrentTenantSlug();
  const base = `/b/${s}/painel`;
  if (!subpath || subpath === "/") return base;
  const clean = subpath.startsWith("/") ? subpath : `/${subpath}`;
  return `${base}${clean}`;
}

type PainelRedirectTarget =
  | "/b/$slug/painel/"
  | "/b/$slug/painel/clientes"
  | "/b/$slug/painel/servicos"
  | "/b/$slug/painel/servicos/novo"
  | "/b/$slug/painel/disponibilidade"
  | "/b/$slug/painel/disponibilidade/mais-ajustes"
  | "/b/$slug/painel/mais-ajustes"
  | "/b/$slug/painel/fluxo"
  | "/b/$slug/painel/avaliacoes"
  | "/b/$slug/painel/recorrencia"
  | "/b/$slug/painel/pagamentos";

const LEGACY_PAINEL_TARGETS: Record<string, PainelRedirectTarget> = {
  "": "/b/$slug/painel/",
  "/": "/b/$slug/painel/",
  "/clientes": "/b/$slug/painel/clientes",
  "/servicos": "/b/$slug/painel/servicos",
  "/servicos/": "/b/$slug/painel/servicos",
  "/servicos/novo": "/b/$slug/painel/servicos/novo",
  "/disponibilidade": "/b/$slug/painel/disponibilidade",
  "/disponibilidade/": "/b/$slug/painel/disponibilidade",
  "/disponibilidade/mais-ajustes": "/b/$slug/painel/mais-ajustes",
  "/mais-ajustes": "/b/$slug/painel/mais-ajustes",
  "/fluxo": "/b/$slug/painel/fluxo",
  "/avaliacoes": "/b/$slug/painel/avaliacoes",
  "/recorrencia": "/b/$slug/painel/recorrencia",
  "/pagamentos": "/b/$slug/painel/pagamentos",
};

/** Redireciona rotas legadas `/painel/...` para `/b/:slug/painel/...`. */
export function redirectLegacyPainel(suffix = "") {
  const slug = getSlugForRedirect();
  const key = suffix.replace(/\/$/, "") || "";
  const to = LEGACY_PAINEL_TARGETS[key] ?? "/b/$slug/painel/";
  throw redirect({ to, params: { slug } });
}
