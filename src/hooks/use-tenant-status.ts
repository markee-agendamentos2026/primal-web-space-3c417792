import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BlockedTenantInfo } from "@/components/TenantBlockedScreen";

/**
 * Lê o status público do tenant. Revalida a cada 60s para que a liberação
 * (admin confirmando pagamento) chegue sem reload manual.
 */
export function useTenantStatus(tenantId: string | null | undefined) {
  const [data, setData] = useState<BlockedTenantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) { setLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      const { data: rows } = await supabase.rpc("tenant_public_status", { _tenant_id: tenantId });
      if (cancelled) return;
      const row = (rows as any[] | null)?.[0] ?? null;
      setData(row);
      setLoading(false);
    };
    load();
    const t = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, [tenantId]);

  return { tenant: data, loading, blocked: data?.effective_status === "blocked" };
}
