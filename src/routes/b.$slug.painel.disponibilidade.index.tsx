import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Availability } from "@/lib/store";
import { fetchAvailability } from "@/lib/store";
import { getCurrentTenantId } from "@/lib/tenant";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/b/$slug/painel/disponibilidade/")({
  component: DisponibilidadePainel,
});

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "S├íb"];

function DisponibilidadePainel() {
  const [av, setAv] = useState<Availability | null>(null);
  const [leadStr, setLeadStr] = useState("");
  const [cancelStr, setCancelStr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAvailability().then((a) => {
      setAv(a);
      setLeadStr(String(a.min_lead_min ?? 0));
      setCancelStr(String(a.cancel_min_lead_min ?? 0));
    });
  }, []);

  if (!av) return <div className="glass p-8 text-center text-sm text-muted-foreground">CarregandoÔÇª</div>;

  const save = async () => {
    if (av.open_time >= av.close_time) {
      toast.error("Hor├írio de fechamento deve ser depois da abertura.");
      return;
    }
    if (!av.days_enabled.some(Boolean)) {
      toast.error("Habilite pelo menos um dia da semana.");
      return;
    }
    if (av.lunch_enabled) {
      if (!av.lunch_start || !av.lunch_end) {
        toast.error("Preencha in├¡cio e fim do almo├ºo.");
        return;
      }
      if (av.lunch_start >= av.lunch_end) {
        toast.error("Fim do almo├ºo deve ser depois do in├¡cio.");
        return;
      }
    }
    const lead = Math.max(0, parseInt(leadStr || "0", 10) || 0);
    const cancelLead = Math.max(0, parseInt(cancelStr || "0", 10) || 0);

    setSaving(true);
    const { error } = await supabase.from("availability").update({
      open_time: av.open_time,
      close_time: av.close_time,
      days_enabled: av.days_enabled,
      lunch_enabled: av.lunch_enabled,
      lunch_start: av.lunch_start,
      lunch_end: av.lunch_end,
      min_lead_min: lead,
      cancel_min_lead_min: cancelLead,
      cancel_min_lead_enabled: cancelLead > 0,
    }).eq("tenant_id", getCurrentTenantId());
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      setAv({ ...av, min_lead_min: lead, cancel_min_lead_min: cancelLead, cancel_min_lead_enabled: cancelLead > 0 });
      toast.success("Configura├º├Áes salvas com sucesso ­ƒæî");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Disponibilidade</h1>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Dias da semana</h2>
        <div className="space-y-2">
          {DAYS.map((d, i) => (
            <div key={d} className="glass flex items-center justify-between p-4">
              <span>{d}</span>
              <button
                onClick={() => setAv({ ...av, days_enabled: av.days_enabled.map((v, idx) => idx === i ? !v : v) })}
                className={`relative h-7 w-12 rounded-full transition ${av.days_enabled[i] ? "bg-primary" : "bg-white/10"}`}
                aria-label={`Alternar ${d}`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${av.days_enabled[i] ? "left-6" : "left-1"}`} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Funcionamento</h2>
        <div className="grid grid-cols-2 gap-3">
          <TimeField label="Abre" value={av.open_time} onChange={(v) => setAv({ ...av, open_time: v })} />
          <TimeField label="Fecha" value={av.close_time} onChange={(v) => setAv({ ...av, close_time: v })} />
        </div>
      </section>

      <section className="space-y-3">
        <div className="glass flex items-center justify-between p-4">
          <div>
            <div className="text-sm font-semibold">Pausa para almo├ºo</div>
            <div className="text-xs text-muted-foreground">Bloqueia hor├írios nesse intervalo.</div>
          </div>
          <button
            onClick={() => setAv({ ...av, lunch_enabled: !av.lunch_enabled })}
            className={`relative h-7 w-12 rounded-full transition ${av.lunch_enabled ? "bg-primary" : "bg-white/10"}`}
            aria-label="Alternar almo├ºo"
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${av.lunch_enabled ? "left-6" : "left-1"}`} />
          </button>
        </div>
        <div className={`grid grid-cols-2 gap-3 transition ${!av.lunch_enabled ? "opacity-50 pointer-events-none" : ""}`}>
          <TimeField label="In├¡cio" value={av.lunch_start || ""} onChange={(v) => setAv({ ...av, lunch_start: v })} />
          <TimeField label="Fim" value={av.lunch_end || ""} onChange={(v) => setAv({ ...av, lunch_end: v })} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Tempos m├¡nimos</h2>
        <MinutesField
          label="M├¡nimo para agendar"
          hint="Anteced├¬ncia m├¡nima para o cliente reservar."
          value={leadStr}
          onChange={setLeadStr}
        />
        <MinutesField
          label="M├¡nimo para cancelar"
          hint="Tempo limite antes do hor├írio para cancelar."
          value={cancelStr}
          onChange={setCancelStr}
        />
      </section>

      <PrimaryButton onClick={save} icon={<Save size={18} />} disabled={saving}>
        {saving ? "SalvandoÔÇª" : "Salvar"}
      </PrimaryButton>
    </div>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="glass block p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <input type="time" value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full bg-transparent text-xl font-bold focus:outline-none" />
    </label>
  );
}

function MinutesField({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="glass block p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
            onChange(digits);
          }}
          placeholder="0"
          className="w-24 bg-transparent text-xl font-bold focus:outline-none"
        />
        <span className="text-xs text-muted-foreground">minutos</span>
      </div>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </label>
  );
}
