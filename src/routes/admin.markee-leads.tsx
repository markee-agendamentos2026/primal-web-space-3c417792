import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, Card } from "@/components/AdminShell";
import { markeeAdminListLeads, markeeAdminUpdateStatus, markeeConvertLeadToTenant } from "@/lib/markee.functions";
import { CheckCircle2, RefreshCcw, MessageSquare, Sparkles, Rocket, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/admin/markee-leads")({
  component: MarkeeLeadsPage,
  head: () => ({ meta: [{ title: "Chamados Markee — BackOffice" }] }),
});

type Lead = {
  id: string;
  ticket_number: string;
  business_name: string;
  owner_name: string;
  whatsapp: string;
  email: string;
  segment: string;
  segment_other: string | null;
  about: string | null;
  primary_color: string | null;
  primary_glow_color: string | null;
  secondary_color: string | null;
  status: string;
  notes: string | null;
  created_tenant_id: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_OPTIONS = [
  { value: "em_analise", label: "Em análise" },
  { value: "personalizando", label: "Personalizando" },
  { value: "pronto", label: "Pronto" },
  { value: "ativo", label: "Ativo" },
  { value: "rejeitado", label: "Rejeitado" },
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    em_analise: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    personalizando: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    pronto: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    ativo: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    rejeitado: "bg-red-500/15 text-red-300 border-red-500/30",
  };
  const cls = map[status] || "bg-white/10 text-foreground border-white/20";
  const label = STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
}

function MarkeeLeadsPage() {
  const listFn = useServerFn(markeeAdminListLeads);
  const updateFn = useServerFn(markeeAdminUpdateStatus);
  const convertFn = useServerFn(markeeConvertLeadToTenant);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await listFn();
      setLeads((r.leads || []) as Lead[]);
    } catch (e: any) {
      setError(e?.message || "Falha ao listar chamados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return leads;
    return leads.filter((l) => l.status === filter);
  }, [leads, filter]);

  return (
    <>
      <PageHeader
        title="Chamados Markee"
        subtitle="Onboarding de novos clientes vindos do site público."
        right={
          <button onClick={refresh} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5">
            <RefreshCcw size={14} /> Atualizar
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {[{ value: "all", label: "Todos" }, ...STATUS_OPTIONS].map((opt) => {
          const active = filter === opt.value;
          const count = opt.value === "all" ? leads.length : leads.filter((l) => l.status === opt.value).length;
          return (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`rounded-full border px-3 py-1.5 text-xs ${active ? "border-primary bg-primary/15 text-primary" : "border-white/10 text-muted-foreground hover:bg-white/5"}`}
            >
              {opt.label} <span className="ml-1 opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Chamado</th>
                <th className="px-4 py-3">Negócio</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Segmento</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Aberto</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Carregando…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Nenhum chamado.</td></tr>
              )}
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium">{l.ticket_number}</td>
                  <td className="px-4 py-3">{l.business_name}</td>
                  <td className="px-4 py-3">{l.owner_name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    <div>{l.whatsapp}</div>
                    <div>{l.email}</div>
                  </td>
                  <td className="px-4 py-3 capitalize">{l.segment === "outros" ? (l.segment_other ?? "Outros") : l.segment}</td>
                  <td className="px-4 py-3">{statusBadge(l.status)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelected(l)}
                      className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1 text-xs hover:bg-white/5"
                    >
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && (
        <LeadDialog
          lead={selected}
          onClose={() => setSelected(null)}
          onUpdate={async (new_status, message) => {
            await updateFn({ data: { lead_id: selected.id, new_status: new_status as any, message } });
            setSelected(null);
            await refresh();
          }}
          onConvert={async (slug) => {
            const res = await convertFn({ data: { lead_id: selected.id, slug, trial_days: 7 } });
            setSelected(null);
            await refresh();
            return res;
          }}
        />
      )}
    </>
  );
}

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

function LeadDialog({
  lead, onClose, onUpdate, onConvert,
}: {
  lead: Lead;
  onClose: () => void;
  onUpdate: (status: string, message?: string) => Promise<void>;
  onConvert: (slug: string) => Promise<{ tenant_id: string; slug: string; owner_user_id: string | null }>;
}) {
  const [status, setStatus] = useState(lead.status);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [slugInput, setSlugInput] = useState(() => slugify(lead.business_name));
  const [converting, setConverting] = useState(false);
  const [convertResult, setConvertResult] = useState<{ slug: string } | null>(null);
  const alreadyConverted = !!lead.created_tenant_id;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-white/10 bg-neutral-950 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Chamado</div>
            <div className="text-xl font-semibold">{lead.ticket_number}</div>
          </div>
          {statusBadge(lead.status)}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Info label="Negócio" value={lead.business_name} />
          <Info label="Responsável" value={lead.owner_name} />
          <Info label="WhatsApp" value={lead.whatsapp} />
          <Info label="E-mail" value={lead.email} />
          <Info label="Segmento" value={lead.segment === "outros" ? (lead.segment_other ?? "Outros") : lead.segment} />
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Cores</div>
            <div className="mt-1 flex gap-1.5">
              {[lead.primary_color, lead.primary_glow_color, lead.secondary_color].filter(Boolean).map((c, i) => (
                <span key={i} className="h-6 w-6 rounded-full border border-white/20" style={{ background: c as string }} />
              ))}
            </div>
          </div>
        </div>

        {lead.about && (
          <div className="mt-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Sobre o negócio</div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{lead.about}</p>
          </div>
        )}

        <div className="mt-6 rounded-xl border border-violet-500/30 bg-violet-500/[0.06] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-violet-200">
            <Rocket size={14} /> Criar empresa com 7 dias grátis
          </div>
          {alreadyConverted ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Esta lead já foi convertida em empresa. O dono já recebeu o link de acesso.
            </p>
          ) : convertResult ? (
            <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} /> Empresa <strong>{convertResult.slug}</strong> criada e dono notificado.
              </div>
              <a href={`/b/${convertResult.slug}`} target="_blank" rel="noreferrer"
                 className="mt-2 inline-flex items-center gap-1 underline">
                Abrir página pública <ExternalLink size={12} />
              </a>
            </div>
          ) : (
            <>
              <p className="mt-1 text-xs text-muted-foreground">
                Gera o tenant com as cores da lead, cria o login do dono e envia o link por WhatsApp + e-mail.
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <div className="min-w-[200px] flex-1">
                  <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Endereço (slug)</label>
                  <div className="mt-1 flex items-center rounded-lg border border-white/10 bg-neutral-900 px-2">
                    <span className="text-xs text-muted-foreground">/b/</span>
                    <input value={slugInput} onChange={(e) => setSlugInput(slugify(e.target.value))}
                      className="w-full bg-transparent px-1 py-2 text-sm outline-none" placeholder="minha-empresa" />
                  </div>
                </div>
                <button
                  disabled={converting || slugInput.length < 2 || slugInput === "markee"}
                  onClick={async () => {
                    setConverting(true); setErr(null);
                    try {
                      const r = await onConvert(slugInput);
                      setConvertResult({ slug: r.slug });
                    } catch (e: any) {
                      setErr(e?.message || "Falha ao converter.");
                    } finally { setConverting(false); }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  <Rocket size={14} /> {converting ? "Criando…" : "Criar empresa + trial 7d"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* status block follows */}


        <div className="mt-6 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-[1fr,auto]">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Novo status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:self-end text-xs text-muted-foreground sm:text-right">
            Cliente recebe notificação por WhatsApp e e-mail ao avançar.
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              <MessageSquare size={12} className="mr-1 inline" /> Mensagem opcional para o cliente
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
              rows={3}
              className="mt-1 w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm"
              placeholder="Ex.: Estamos finalizando a personalização das suas cores."
            />
          </div>
        </div>

        {err && <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{err}</div>}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5">
            Cancelar
          </button>
          <button
            disabled={saving || status === lead.status}
            onClick={async () => {
              setSaving(true); setErr(null);
              try {
                await onUpdate(status, message || undefined);
              } catch (e: any) {
                setErr(e?.message || "Falha ao atualizar.");
                setSaving(false);
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary-glow px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            <CheckCircle2 size={14} /> {saving ? "Salvando…" : "Salvar e notificar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}
