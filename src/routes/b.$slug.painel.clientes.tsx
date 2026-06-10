import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Phone, Mail, MoreVertical, Trophy } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import type { Booking } from "@/lib/store";
import { getCurrentTenantId, tenantRealtimeFilter } from "@/lib/tenant";

export const Route = createFileRoute("/b/$slug/painel/clientes")({
  component: ClientesPainel,
});

type Client = { name: string; whatsapp: string; email: string | null; last: number; count: number; active: boolean; profileId: string | null };

function ClientesPainel() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; name: string | null; email: string | null; whatsapp: string | null; active: boolean }[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"todos" | "ativos" | "inativos" | "top">("todos");

  const load = async () => {
    const tenantId = getCurrentTenantId();
    const { data: bs } = await supabase
      .from("bookings")
      .select("*")
      .eq("tenant_id", tenantId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: true });
    setBookings((bs as any) ?? []);
    const { data: ps } = await supabase
      .from("profiles")
      .select("id,name,email,whatsapp,active")
      .eq("tenant_id", tenantId);
    setProfiles((ps as any) ?? []);
  };
  useEffect(() => {
    load();
    const tenantId = getCurrentTenantId();
    const tf = tenantRealtimeFilter(tenantId);
    const ch = supabase
      .channel(`profiles-realtime-${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: tf }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: tf }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const normalize = (v: string | null | undefined) => (v || "").replace(/\D/g, "");

  const clients = useMemo(() => {
    const map = new Map<string, Client>();

    // Seed with all profiles (canonical source: name/email/active never overwritten)
    profiles.forEach((p) => {
      const key = normalize(p.whatsapp);
      if (!key) return;
      map.set(key, {
        name: p.name || "Cliente",
        whatsapp: key,
        email: p.email,
        last: 0,
        count: 0,
        active: p.active,
        profileId: p.id,
      });
    });

    // Aggregate booking stats; never overwrite name/email
    bookings.forEach((b) => {
      const key = normalize(b.whatsapp) || b.email || b.client_name;
      const ts = new Date(b.created_at).getTime();
      const cur = map.get(key);
      if (!cur) {
        map.set(key, {
          name: b.client_name,
          whatsapp: key,
          email: b.email,
          last: ts,
          count: 1,
          active: true,
          profileId: null,
        });
      } else {
        cur.count++;
        if (ts > cur.last) cur.last = ts;
      }
    });

    let arr = Array.from(map.values()).filter((c) => c.count > 0 || c.profileId);
    if (q) arr = arr.filter((c) => (c.name + c.whatsapp + (c.email||"")).toLowerCase().includes(q.toLowerCase()));
    if (filter === "ativos") arr = arr.filter((c) => c.active);
    if (filter === "inativos") arr = arr.filter((c) => !c.active);
    if (filter === "top") arr = arr.sort((a,b) => b.count - a.count).slice(0, 10);
    else arr = arr.sort((a,b) => b.last - a.last);
    return arr;
  }, [bookings, profiles, q, filter]);

  const toggleActive = async (c: Client) => {
    if (!c.profileId) {
      toast.error("Cliente sem cadastro. Aguarde o pr├│ximo agendamento dele para criar o perfil.");
      return;
    }
    const newActive = !c.active;
    // Optimistic UI
    setProfiles((prev) => prev.map((p) => (p.id === c.profileId ? { ...p, active: newActive } : p)));
    const { data, error } = await supabase
      .from("profiles")
      .update({ active: newActive })
      .eq("id", c.profileId)
      .select("id,active");
    if (error) {
      toast.error(error.message);
      load();
      return;
    }
    if (!data || data.length === 0) {
      toast.error("Sem permiss├úo para alterar este cliente.");
      load();
      return;
    }
    toast.success(newActive ? "Cliente ativado" : "Cliente inativado");
  };

  return (
    <div>
      <h1 className="font-display text-3xl">Clientes</h1>

      <div className="relative mt-5">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input className="input-glass" placeholder="Buscar cliente" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="glass mt-3 grid grid-cols-4 gap-1 p-1">
        {(["todos","ativos","inativos","top"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`h-10 rounded-xl text-xs capitalize transition ${filter === f ? "btn-primary" : ""}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {clients.length === 0 && (
          <div className="glass p-8 text-center text-sm text-muted-foreground">Nenhum cliente ainda.</div>
        )}
        {clients.map((c, i) => {
          const isTop = filter === "top" && i < 10;
          return (
            <div key={i} className={`glass p-4 ${!c.active ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isTop && <Trophy size={14} className="text-primary" />}
                  <div className="text-base font-semibold">{c.name}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">{c.count}x</span>
                  <Popover>
                    <PopoverTrigger className="text-muted-foreground hover:text-foreground"><MoreVertical size={16} /></PopoverTrigger>
                    <PopoverContent className="w-44 bg-card border-glass-border">
                      <button onClick={() => toggleActive(c)} className="block w-full px-3 py-2 text-left text-sm hover:bg-white/5 rounded">
                        {c.active ? "Inativar" : "Ativar"}
                      </button>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                {c.whatsapp && <span className="inline-flex items-center gap-2"><Phone size={12} />{c.whatsapp}</span>}
                {c.email && <span className="inline-flex items-center gap-2"><Mail size={12} />{c.email}</span>}
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                ├Ültimo: {new Date(c.last).toLocaleDateString("pt-BR")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
