import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cacheTenantId } from "@/lib/tenant";

/** Sincroniza tenant_id do banco a partir do slug da URL. Retorna true quando pronto. */
export function useTenantBootstrap(slug: string): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    (async () => {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, slug, name")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (tenant) cacheTenantId(tenant.slug, tenant.id, tenant.name);
      setReady(!!tenant);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return ready;
}
