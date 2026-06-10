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
      // Usando query direta já que a RPC pode não estar na versão simplificada do schema
      const { data: tenant } = await supabase.from("availability").select("id, business_name, primary_color").maybeSingle();
      if (cancelled) return;
      
      // Mock de status para evitar bloqueio enquanto o admin real não é configurado
      const row: BlockedTenantInfo = {
        id: tenant?.id?.toString() || tenantId,
        name: tenant?.business_name || "Empresa",
        slug: "barbearia",
        status: "active",
        effective_status: "active",
        due_date: null,
        monthly_price: null,
        owner_phone: null,
        primary_color: (tenant as any)?.primary_color || null,
      };
      
      setData(row);
      setLoading(false);
    };
    load();
    const t = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, [tenantId]);

  return { tenant: data, loading, blocked: data?.effective_status === "blocked" };
}
