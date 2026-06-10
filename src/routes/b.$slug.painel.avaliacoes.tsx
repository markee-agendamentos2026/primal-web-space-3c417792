import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getCurrentTenantId, tenantHref } from "@/lib/tenant";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Star } from "lucide-react";

export const Route = createFileRoute("/b/$slug/painel/avaliacoes")({
  component: AvaliacoesPainel,
});

type Review = { id: string; stars: number; comment: string | null; created_at: string; professional_id: string | null };

function AvaliacoesPainel() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pros, setPros] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const tenantId = getCurrentTenantId();
    supabase.from("reviews").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).then(({ data }) => setReviews((data as any) ?? []));
    supabase.from("professionals").select("id,name").eq("tenant_id", tenantId).then(({ data }) => setPros((data as any) ?? []));
  }, []);

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.stars, 0) / reviews.length).toFixed(1) : "ÔÇö";
  const proAvg = (proId: string) => {
    const list = reviews.filter((r) => r.professional_id === proId);
    if (!list.length) return "ÔÇö";
    return (list.reduce((s, r) => s + r.stars, 0) / list.length).toFixed(1);
  };

  return (
    <div>
      <Link to={tenantHref("/painel") as any} className="btn-ghost-glass inline-flex h-10 items-center gap-2 px-4 text-sm">
        <ArrowLeft size={16} /> Voltar
      </Link>
      <h1 className="mt-4 font-display text-3xl">Avalia├º├Áes</h1>

      <div className="glass mt-5 p-6 text-center">
        <div className="text-5xl font-display">{avg}</div>
        <div className="mt-2 flex justify-center gap-1 text-primary">
          {[1,2,3,4,5].map((n) => <Star key={n} size={18} fill={Number(avg) >= n ? "currentColor" : "none"} />)}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{reviews.length} avalia├º├Áes</p>
      </div>

      {pros.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-2">
          {pros.map((p) => (
            <div key={p.id} className="glass p-4">
              <div className="text-xs text-muted-foreground">{p.name}</div>
              <div className="mt-1 text-2xl font-display">{proAvg(p.id)}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 space-y-3">
        {reviews.length === 0 && <div className="glass p-8 text-center text-sm text-muted-foreground">Nenhuma avalia├º├úo ainda.</div>}
        {reviews.map((r) => (
          <div key={r.id} className="glass p-4">
            <div className="flex items-center gap-1 text-primary">
              {[1,2,3,4,5].map((n) => <Star key={n} size={14} fill={r.stars >= n ? "currentColor" : "none"} />)}
            </div>
            {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
            <div className="mt-2 text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
