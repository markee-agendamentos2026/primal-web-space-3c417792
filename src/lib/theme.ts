/**
 * Branding por empresa — fonte de verdade para cores (não usa backend).
 *
 * COMO ADICIONAR NOVA EMPRESA:
 * 1) Criar no BackOffice (/admin/empresas/nova) — gera tenant + owner.
 * 2) Copiar um bloco abaixo, trocar slug e cores.
 */
export type TenantTheme = {
  primary: string;
  primaryGlow: string;
  secondary: string;
};

export const DEFAULT_THEME: TenantTheme = {
  primary: "#d4a64a",
  primaryGlow: "#f0c674",
  secondary: "#0a0a0a",
};

/** Cores por slug — única configuração manual após criar empresa. */
export const TENANT_THEMES: Record<string, TenantTheme> = {
  "dom-amorim": {
    primary: "#d4a64a",
    primaryGlow: "#f0c674",
    secondary: "#0a0a0a",
  },
  "studio-nails": {
    primary: "#ec4899",
    primaryGlow: "#f9a8d4",
    secondary: "#ffffff",
  },
};

export function getThemeForSlug(slug: string): TenantTheme {
  return TENANT_THEMES[slug] ?? DEFAULT_THEME;
}
