import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  registerTenantBrand,
  setCurrentTenantSlug,
  mapTenantRecordToBrand,
  getCachedTenantBySlug,
  type TenantRecord,
} from "@/lib/tenant";

// Layout pathless para /b/$slug/*: resolve a empresa pelo slug DIRETO no
// banco e registra id + branding (nome + cores) no cache em memória antes
// das subrotas renderizarem. Assim qualquer empresa criada via BackOffice
// já funciona sem precisar de entrada estática em src/lib/tenant.ts.
export const Route = createFileRoute("/b/$slug")({
  component: TenantLayout,
});

function TenantLayout() {
  const { slug } = Route.useParams();
  const [ready, setReady] = useState<boolean>(() => !!getCachedTenantBySlug(slug));
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCurrentTenantSlug(slug);
    (async () => {
      const { data } = await supabase
        .from("tenants")
        .select("id, slug, name, primary_color, primary_glow_color, secondary_color")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (!data) { setNotFound(true); setReady(true); return; }
      // Busca também o business_name em availability (nome editável pelo
      // dono) para que o nome exibido publicamente já apareça correto no
      // primeiro paint — evita flash do nome antigo (tenants.name).
      const { data: av } = await supabase
        .from("availability")
        .select("business_name")
        .eq("tenant_id", (data as TenantRecord).id)
        .maybeSingle();
      if (cancelled) return;
      const brand = mapTenantRecordToBrand(data as TenantRecord);
      const displayName = (av?.business_name && av.business_name.trim()) || brand.name;
      registerTenantBrand({ ...brand, name: displayName });
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground text-sm">
        Carregando…
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="grid min-h-screen place-items-center text-center px-6">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Empresa</div>
          <h1 className="mt-2 font-display text-3xl">Não encontrada</h1>
          <p className="mt-2 text-sm text-muted-foreground">O endereço <code>/b/{slug}</code> não corresponde a nenhuma empresa cadastrada.</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
