import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { getCurrentTenant, resolveTenantSlugFromPath, subscribeTenantChange } from "@/lib/tenant";
import { getThemeForSlug } from "@/lib/theme";

/**
 * Aplica as cores da empresa ativa sobrescrevendo as CSS vars do tema.
 * Reage à mudança de URL (/b/:slug) e ao carregamento do brand do banco.
 */
export function TenantThemeProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const slug = resolveTenantSlugFromPath(location.pathname);
  const [version, setVersion] = useState(0);
  useEffect(() => subscribeTenantChange(() => setVersion((v) => v + 1)), []);

  const brand = useMemo(() => {
    if (slug) {
      const theme = getThemeForSlug(slug);
      const t = getCurrentTenant();
      return { ...theme, slug, id: t.id, name: t.name };
    }
    return getCurrentTenant();
  }, [location.pathname, slug, version]);

  const css = `:root{
    --primary:${brand.primary};
    --primary-glow:${brand.primaryGlow};
    --accent:${brand.primary};
    --ring:${brand.primary};
    --gradient-primary:linear-gradient(135deg, ${brand.primary}, ${brand.primaryGlow});
    --shadow-glow:0 12px 40px -8px ${brand.primary}73;
    --brand-secondary:${brand.secondary};
  }`;

  return (
    <>
      <style data-tenant-theme={brand.slug}>{css}</style>
      {children}
    </>
  );
}
