export const DEFAULT_TENANT_SLUG = "barbearia";

export function getCurrentTenantId() {
  return "00000000-0000-0000-0000-000000000000"; // Fallback
}

export function getCurrentTenant() {
  return {
    slug: DEFAULT_TENANT_SLUG,
    name: "Barbearia Premium",
    primary: "#d4a64a",
    primaryGlow: "#f4d68a",
    secondary: "#1a1a1a",
  };
}

export function tenantHref(path: string) {
  return path;
}

export function subscribeTenantChange(cb: () => void) {
  return () => {};
}
