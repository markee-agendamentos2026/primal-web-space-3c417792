import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { getCurrentTenant, subscribeTenantChange } from "@/lib/tenant";

export function TenantThemeProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [version, setVersion] = useState(0);
  useEffect(() => subscribeTenantChange(() => setVersion((v) => v + 1)), []);
  const brand = useMemo(() => getCurrentTenant(), [location.pathname, version]);

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
