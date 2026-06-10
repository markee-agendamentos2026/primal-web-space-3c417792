// Multi-tenant via URL (/b/:slug).
// Slug: pathname. tenant_id + nome: cache em memória (bootstrap do banco).
// Cores: src/lib/theme.ts (não usa backend).

import { getThemeForSlug, type TenantTheme } from "@/lib/theme";

export type TenantBrand = TenantTheme & {
  id: string;
  slug: string;
  name: string;
};

export type TenantRecord = {
  id: string;
  slug: string;
  name: string;
  primary_color: string | null;
  primary_glow_color: string | null;
  secondary_color: string | null;
};

/** UUIDs conhecidos do seed — fallback antes do bootstrap assíncrono. */
const SEED_TENANT_IDS: Record<string, string> = {
  "dom-amorim": "00000000-0000-0000-0000-000000000001",
  "studio-nails": "00000000-0000-0000-0000-000000000002",
};

export const DEFAULT_TENANT_SLUG = "dom-amorim";

const tenantIdBySlug = new Map<string, string>();
const tenantNameBySlug = new Map<string, string>();
const tenantBrandBySlug = new Map<string, TenantBrand>();

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}

export function subscribeTenantChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Extrai o slug de um pathname tipo "/b/<slug>/..." */
export function resolveTenantSlugFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/b\/([^/]+)/);
  if (!m) return null;
  return decodeURIComponent(m[1]);
}

/** Slug atual: URL primeiro; default só fora de rotas /b/ (redirects legados). */
export function getCurrentTenantSlug(): string {
  if (typeof window === "undefined") return DEFAULT_TENANT_SLUG;
  return resolveTenantSlugFromPath(window.location.pathname) ?? DEFAULT_TENANT_SLUG;
}

/** Compat: slug vem da URL; não persiste em localStorage. */
export function setCurrentTenantSlug(_slug: string) {
  /* no-op — fonte de verdade é a URL */
}

export function cacheTenantId(slug: string, tenantId: string, name?: string) {
  tenantIdBySlug.set(slug, tenantId);
  if (name) tenantNameBySlug.set(slug, name);
  notify();
}

export function registerTenantId(slug: string, id: string) {
  cacheTenantId(slug, id);
}

export function registerTenantBrand(brand: TenantBrand) {
  tenantIdBySlug.set(brand.slug, brand.id);
  tenantNameBySlug.set(brand.slug, brand.name);
  tenantBrandBySlug.set(brand.slug, brand);
  notify();
}

export function setCurrentTenantContext(slug: string, tenantId?: string | null, _record?: unknown) {
  if (tenantId) cacheTenantId(slug, tenantId);
}

export function getCurrentTenantId(): string {
  const slug = getCurrentTenantSlug();
  return tenantIdBySlug.get(slug) ?? SEED_TENANT_IDS[slug] ?? "";
}

export function getCachedTenantBySlug(slug: string): TenantBrand | undefined {
  return tenantBrandBySlug.get(slug);
}

export function mapTenantRecordToBrand(tenant: TenantRecord): TenantBrand {
  const theme = getThemeForSlug(tenant.slug);
  return {
    ...theme,
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
  };
}

export function getCurrentTenant(): TenantBrand {
  const slug = getCurrentTenantSlug();
  const cached = tenantBrandBySlug.get(slug);
  if (cached) return cached;
  const theme = getThemeForSlug(slug);
  return {
    ...theme,
    id: getCurrentTenantId(),
    slug,
    name: tenantNameBySlug.get(slug) ?? slug,
  };
}

/** Filtro Realtime Supabase por tenant. */
export function tenantRealtimeFilter(tenantId: string): string {
  return `tenant_id=eq.${tenantId}`;
}

/**
 * Constrói href sob `/b/<slug>/...`.
 * @param explicitSlug — preferir slug da rota (useParams).
 */
export function tenantHref(path: string, explicitSlug?: string): string {
  const slug = explicitSlug ?? getCurrentTenantSlug();
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (clean.match(/^\/b\/[^/]+/)) return clean;
  if (clean === "/") return `/b/${slug}`;
  return `/b/${slug}${clean}`;
}

export const CURRENT_TENANT_ID = SEED_TENANT_IDS[DEFAULT_TENANT_SLUG];
export const CURRENT_TENANT_SLUG = DEFAULT_TENANT_SLUG;

// Compat legado — preferir getThemeForSlug / TENANT_THEMES
export const TENANTS = SEED_TENANT_IDS;
