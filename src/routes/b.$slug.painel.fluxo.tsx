import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ownerListTenantFeatures, ownerSetTenantFeature, ownerUpdateBranding } from "@/lib/features.functions";
import { FEATURES } from "@/lib/features";
import { ArrowLeft, Palette, SlidersHorizontal, Save } from "lucide-react";
import { toast } from "sonner";
import { registerTenantBrand, mapTenantRecordToBrand, type TenantRecord } from "@/lib/tenant";

export const Route = createFileRoute("/b/$slug/painel/fluxo")({
  component: FluxoPage,
  head: () => ({ meta: [{ title: "Fluxo e Layout" }] }),
});

function FluxoPage() {
  const { slug } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const listFn = useServerFn(ownerListTenantFeatures);
  const setFn = useServerFn(ownerSetTenantFeature);
  const brandFn = useServerFn(ownerUpdateBranding);

  const [tenant, setTenant] = useState<TenantRecord | null>(null);
  const [brand, setBrand] = useState<{ primary_color: string; primary_glow_color: string; secondary_color: string }>({
    primary_color: "#d4a64a", primary_glow_color: "#f0c674", secondary_color: "#0a0a0a",
  });
  const [savingBrand, setSavingBrand] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("tenants")
        .select("id, slug, name, primary_color, primary_glow_color, secondary_color")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled || !data) return;
      const t = data as TenantRecord;
      setTenant(t);
      setBrand({
        primary_color: t.primary_color ?? "#d4a64a",
        primary_glow_color: t.primary_glow_color ?? "#f0c674",
        secondary_color: t.secondary_color ?? "#0a0a0a",
      });
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const { data: featData } = useQuery({
    queryKey: ["owner-features", tenant?.id],
    queryFn: () => listFn({ data: { tenant_id: tenant!.id } }),
    enabled: !!tenant?.id,
  });

  const toggle = async (key: string, enabled: boolean) => {
    if (!tenant) return;
    try {
      await setFn({ data: { tenant_id: tenant.id, feature_key: key, enabled } });
      toast.success(enabled ? "Tela ativada." : "Tela desativada.");
      qc.invalidateQueries({ queryKey: ["owner-features", tenant.id] });
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);
  const saveBrand = async () => {
    if (!tenant) return;
    if (!isHex(brand.primary_color) || !isHex(brand.primary_glow_color) || !isHex(brand.secondary_color)) {
      toast.error("Use cores no formato #RRGGBB"); return;
    }
    setSavingBrand(true);
    try {
      await brandFn({ data: { tenant_id: tenant.id, ...brand } });
      // Atualiza o tema imediatamente
      registerTenantBrand(mapTenantRecordToBrand({ ...(tenant as any), ...brand }));
      toast.success("Cores salvas.");
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
    finally { setSavingBrand(false); }
  };

  const available = featData?.features ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24">
      <button onClick={() => nav({ to: `/b/${slug}/painel` as any })} className="mb-4 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Voltar
      </button>
      <h1 className="font-display text-2xl md:text-3xl">Fluxo e Layout</h1>
      <p className="mt-1 text-sm text-muted-foreground">Personalize as cores da sua marca e escolha quais telas seus clientes verão ao agendar.</p>

      {/* Identidade visual */}
      <section className="mt-6 glass p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Palette size={14} /> Identidade visual</h2>
          <button onClick={saveBrand} disabled={savingBrand || !tenant}
            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-primary to-primary-glow px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60">
            <Save size={12} /> {savingBrand ? "Salvando…" : "Salvar cores"}
          </button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">As cores são aplicadas no seu site público e no painel.</p>
        <div className="grid gap-3 md:grid-cols-3">
          <ColorField label="Primária" value={brand.primary_color} onChange={(v) => setBrand({ ...brand, primary_color: v })} />
          <ColorField label="Brilho da primária" value={brand.primary_glow_color} onChange={(v) => setBrand({ ...brand, primary_glow_color: v })} />
          <ColorField label="Secundária" value={brand.secondary_color} onChange={(v) => setBrand({ ...brand, secondary_color: v })} />
        </div>
        <div className="mt-4 rounded-xl border border-white/10 p-4" style={{ background: `linear-gradient(135deg, ${brand.primary_color}, ${brand.primary_glow_color})` }}>
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: brand.secondary_color }}>Pré-visualização</div>
          <div className="mt-1 font-display text-2xl" style={{ color: brand.secondary_color }}>{tenant?.name ?? "Sua empresa"}</div>
        </div>
      </section>

      {/* Telas do fluxo */}
      <section className="mt-6 glass p-5">
        <div className="mb-3 flex items-center gap-2">
          <SlidersHorizontal size={14} />
          <h2 className="text-sm font-semibold">Telas do fluxo de agendamento</h2>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Estas são as telas extras liberadas para sua empresa. Ative ou desative conforme precisar.
        </p>
        {available.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-muted-foreground">
            Nenhuma tela extra liberada para sua empresa no momento. Fale com a Markee para liberar funcionalidades adicionais.
          </div>
        ) : (
          <div className="space-y-2">
            {available.map((f: any) => {
              const def = FEATURES.find((x) => x.key === f.feature_key);
              if (!def) return null;
              return (
                <label key={f.feature_key} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{def.label}</div>
                    <div className="text-[11px] text-muted-foreground">{def.description}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!f.owner_enabled}
                    onChange={(e) => toggle(f.feature_key, e.target.checked)}
                    className="mt-1 h-5 w-5 cursor-pointer accent-primary"
                  />
                </label>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function ColorField({ label, value, onChange }:
  { label: string; value: string; onChange: (v: string) => void }) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";
  return (
    <div>
      <label className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</label>
      <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1.5 focus-within:border-primary">
        <input type="color" value={safe} onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} (seletor visual)`}
          className="h-8 w-10 cursor-pointer rounded-md border border-white/10 bg-transparent p-0" />
        <input type="text" value={value}
          onChange={(e) => onChange(e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`)}
          placeholder="#RRGGBB" maxLength={7}
          className="flex-1 bg-transparent px-1 py-1 text-sm font-mono uppercase focus:outline-none" />
      </div>
    </div>
  );
}
