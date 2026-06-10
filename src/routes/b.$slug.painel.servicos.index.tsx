import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Service } from "@/lib/store";
import { getCurrentTenantId, tenantHref, tenantRealtimeFilter } from "@/lib/tenant";
import { Plus, Pencil, Search } from "lucide-react";

export const Route = createFileRoute("/b/$slug/painel/servicos/")({
  component: ServicosPainel,
});

function ServicosPainel() {
  const [services, setServices] = useState<Service[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    const { data } = await supabase.from("services").select("*").eq("tenant_id", getCurrentTenantId()).order("sort_order");
    setServices((data as any) ?? []);
  };

  useEffect(() => {
    load();
    const tenantId = getCurrentTenantId();
    const channel = supabase
      .channel(`services-admin-${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "services", filter: tenantRealtimeFilter(tenantId) }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = services.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));
  

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Servi├ºos</h1>
        <Link to={tenantHref("/painel/servicos/novo") as any} className="btn-primary inline-flex h-12 items-center gap-2 px-5 text-sm">
          <Plus size={18} /> Novo
        </Link>
      </div>

      <div className="relative mt-5">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input className="input-glass" placeholder="Buscar servi├ºo" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="mt-5 space-y-3">
        {filtered.map((s) => {
          return (
            <div key={s.id} className={`glass flex items-center gap-4 p-4 ${!s.active ? "opacity-50" : ""}`}>
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-2xl">
                {s.photo_url
                  ? <img src={s.photo_url} alt={s.name} loading="lazy" decoding="async" className="absolute inset-0 block h-full w-full object-cover" />
                  : <span>{s.emoji}</span>}
              </div>
              <div className="flex-1">
                <div className="text-base font-semibold">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.duration_min} min</div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold text-primary">R${Number(s.price).toFixed(2).replace(".", ",")}</div>
                <Link
                  to={tenantHref(`/painel/servicos/${s.id}`) as any}
                  className="btn-ghost-glass mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                >
                  <Pencil size={12} /> Editar
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
