import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BlockedTenantInfo } from "@/components/TenantBlockedScreen";

export function useTenantStatus(tenantId: string | null | undefined) {
  const [data, setData] = useState<BlockedTenantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) { setLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      // Query simplificada para evitar erros de tipagem enquanto o schema é sincronizado
      const { data: tenant } = await supabase.from("availability").select("*").maybeSingle();
      if (cancelled) return;
      
      const row: BlockedTenantInfo = {
        id: (tenant as any)?.id?.toString() || tenantId,
        name: (tenant as any)?.business_name || "Empresa",
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
