import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { tenantHref, getCurrentTenantId } from "@/lib/tenant";
import { ArrowLeft, Plus, Send, Trash2, Pencil, RefreshCw, Mail, MessageCircle, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  listCampaigns, upsertCampaign, deleteCampaign, runCampaignNow,
  listLog, listQueue, getTenantComm, updateTenantComm, listProfilesForPicker,
} from "@/lib/recurrence.functions";
import { ownerGetWaFreeConfig, ownerUpdateWaFreeConfig, ownerListWaFreeReminders } from "@/lib/wa-free.functions";
import { WA_FREE_PLACEHOLDERS } from "@/lib/wa-free";

export const Route = createFileRoute("/b/$slug/painel/recorrencia")({
  component: RecorrenciaPainel,
});

type Campaign = {
  id: string; tenant_id: string; name: string; kind: "manual" | "inactive_trigger";
  channels: string[]; audience_mode: "all" | "active" | "inactive" | "manual";
  inactive_days: number; message_body: string; email_subject: string | null;
  active: boolean; last_run_at: string | null;
};

type Profile = { id: string; name: string | null; email: string | null; whatsapp: string | null; active: boolean };

function RecorrenciaPainel() {
  const tenantId = getCurrentTenantId();
  const fnList = useServerFn(listCampaigns);
  const fnUpsert = useServerFn(upsertCampaign);
  const fnDelete = useServerFn(deleteCampaign);
  const fnRun = useServerFn(runCampaignNow);
  const fnLog = useServerFn(listLog);
  const fnQueue = useServerFn(listQueue);
  const fnGetComm = useServerFn(getTenantComm);
  const fnSetComm = useServerFn(updateTenantComm);
  const fnProfiles = useServerFn(listProfilesForPicker);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [editing, setEditing] = useState<Campaign | "new" | null>(null);
  const [log, setLog] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [comm, setComm] = useState<{ whatsapp_sender_number: string; email_reply_to: string; whatsapp_instance: string }>({ whatsapp_sender_number: "", email_reply_to: "", whatsapp_instance: "" });
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const [c, l, q, t] = await Promise.all([
        fnList({ data: { tenant_id: tenantId } }),
        fnLog({ data: { tenant_id: tenantId, limit: 30 } }),
        fnQueue({ data: { tenant_id: tenantId, limit: 30 } }),
        fnGetComm({ data: { tenant_id: tenantId } }),
      ]);
      setCampaigns(c.campaigns as any);
      setLog(l.log);
      setQueue(q.queue);
      const tt = t.tenant as any;
      setComm({
        whatsapp_sender_number: tt?.whatsapp_sender_number ?? "",
        email_reply_to: tt?.email_reply_to ?? "",
        whatsapp_instance: tt?.whatsapp_instance ?? "",
      });
    } catch (e: any) {
      toast.error(e?.message || "Falha ao carregar.");
    } finally { setLoading(false); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, []);

  const saveComm = async () => {
    try {
      await fnSetComm({ data: { tenant_id: tenantId, ...comm } });
      toast.success("Configurações salvas.");
    } catch (e: any) { toast.error(e?.message); }
  };

  const onSave = async (data: any) => {
    try {
      await fnUpsert({ data: { ...data, tenant_id: tenantId } });
      toast.success("Campanha salva.");
      setEditing(null);
      reload();
    } catch (e: any) { toast.error(e?.message); }
  };
  const onDelete = async (id: string) => {
    if (!confirm("Excluir esta campanha?")) return;
    try {
      await fnDelete({ data: { id, tenant_id: tenantId } });
      reload();
    } catch (e: any) { toast.error(e?.message); }
  };
  const onRun = async (id: string) => {
    try {
      const r = await fnRun({ data: { id, tenant_id: tenantId } });
      toast.success(`Adicionado à fila: ${r.enqueued} (já enfileirados antes: ${r.skipped_duplicates}).`);
      reload();
    } catch (e: any) { toast.error(e?.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link to={tenantHref("/painel") as any} className="btn-ghost-glass inline-flex h-10 items-center gap-2 px-4 text-sm">
          <ArrowLeft size={16} /> Voltar
        </Link>
        <button onClick={reload} className="btn-ghost-glass inline-flex h-10 items-center gap-2 px-4 text-sm">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      <header>
        <h1 className="font-display text-3xl">Recorrência</h1>
        <p className="mt-1 text-sm text-muted-foreground">WhatsApp Gratuito (confirmação + lembrete) e — mais abaixo — recorrência avançada por e-mail / WhatsApp pago.</p>
      </header>

      {/* WhatsApp Gratuito — bloco principal */}
      <WaFreeBlock tenantId={tenantId} />

      {/* === Bloco antigo (recorrência paga / e-mail) recolhido === */}
      <details className="glass p-5 group">
        <summary className="flex cursor-pointer items-center justify-between gap-3 list-none">
          <div>
            <h2 className="font-medium">Recorrência avançada (E-mail / WhatsApp pago)</h2>
            <p className="mt-1 text-xs text-muted-foreground">Campanhas em lote, gatilho por inatividade, e integração paga via UAZAPI.</p>
          </div>
          <ChevronDown size={18} className="transition-transform group-open:rotate-180" />
        </summary>

        <div className="mt-5 space-y-6">
        {/* Configurações de remetente */}
        <section className="glass p-5">
        <h2 className="font-medium">Remetente do estabelecimento</h2>
        <p className="mt-1 text-xs text-muted-foreground">E-mail de resposta e número de WhatsApp aparecem para o cliente. A entrega usa a infra global do Markee.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-muted-foreground">E-mail de resposta</span>
            <input className="input mt-1 w-full" placeholder="contato@seusalao.com" value={comm.email_reply_to}
              onChange={(e) => setComm({ ...comm, email_reply_to: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Número WhatsApp do salão</span>
            <input className="input mt-1 w-full" placeholder="5511999999999" value={comm.whatsapp_sender_number}
              onChange={(e) => setComm({ ...comm, whatsapp_sender_number: e.target.value })} />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs text-muted-foreground">Instância UAZAPI (opcional, configurada pelo Markee)</span>
            <input className="input mt-1 w-full" placeholder="—" value={comm.whatsapp_instance}
              onChange={(e) => setComm({ ...comm, whatsapp_instance: e.target.value })} />
          </label>
        </div>
        <button onClick={saveComm} className="btn-primary mt-4 h-10 px-4 text-sm">Salvar</button>
      </section>

      {/* Campanhas */}
      <section className="glass p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Campanhas</h2>
          <button onClick={() => setEditing("new")} className="btn-primary inline-flex h-10 items-center gap-2 px-3 text-sm">
            <Plus size={14} /> Nova campanha
          </button>
        </div>
        {loading ? <p className="mt-4 text-sm text-muted-foreground">Carregando…</p> :
          campaigns.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Nenhuma campanha ainda.</p> :
          <ul className="mt-4 space-y-3">
            {campaigns.map((c) => (
              <li key={c.id} className="glass p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-base">{c.name}</strong>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${c.active ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-muted-foreground"}`}>
                        {c.active ? "ativa" : "pausada"}
                      </span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                        {c.kind === "inactive_trigger" ? `gatilho ${c.inactive_days}d` : "manual"}
                      </span>
                      {c.channels.map((ch) => (
                        <span key={ch} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase text-primary">
                          {ch === "email" ? <Mail size={10} /> : <MessageCircle size={10} />}{ch}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{c.message_body}</p>
                    {c.last_run_at ? <p className="mt-1 text-[11px] text-muted-foreground">Último disparo: {new Date(c.last_run_at).toLocaleString()}</p> : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button onClick={() => onRun(c.id)} className="btn-ghost-glass inline-flex h-9 items-center gap-1 px-3 text-xs"><Send size={12} /> Disparar</button>
                    <button onClick={() => setEditing(c)} className="btn-ghost-glass inline-flex h-9 items-center gap-1 px-3 text-xs"><Pencil size={12} /></button>
                    <button onClick={() => onDelete(c.id)} className="btn-ghost-glass inline-flex h-9 items-center gap-1 px-3 text-xs text-destructive"><Trash2 size={12} /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        }
      </section>

      {/* Fila */}
      <section className="glass p-5">
        <h2 className="font-medium">Fila de envios</h2>
        {queue.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Sem itens.</p> :
          <ul className="mt-3 space-y-2 text-sm">
            {queue.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
                <span className="inline-flex items-center gap-2">
                  {q.channel === "email" ? <Mail size={12} /> : <MessageCircle size={12} />} {q.channel}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${
                    q.status === "sent" ? "bg-emerald-500/20 text-emerald-300" :
                    q.status === "failed" ? "bg-red-500/20 text-red-300" :
                    q.status === "skipped" ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-muted-foreground"
                  }`}>{q.status}</span>
                </span>
                <span className="text-xs text-muted-foreground">{q.error ?? new Date(q.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        }
      </section>

      {/* Histórico */}
      <section className="glass p-5">
        <h2 className="font-medium">Histórico</h2>
        {log.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nada enviado ainda.</p> :
          <ul className="mt-3 space-y-2 text-sm">
            {log.map((l) => (
              <li key={l.id} className="rounded-lg bg-white/5 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2">
                    {l.channel === "email" ? <Mail size={12} /> : <MessageCircle size={12} />} {l.recipient}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${
                      l.status === "sent" ? "bg-emerald-500/20 text-emerald-300" :
                      l.status === "failed" ? "bg-red-500/20 text-red-300" :
                      l.status === "skipped" ? "bg-amber-500/20 text-amber-300" : "bg-white/10"
                    }`}>{l.status}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
                </div>
                {l.message_preview ? <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{l.message_preview}</p> : null}
                {l.error ? <p className="mt-1 text-xs text-red-300">{l.error}</p> : null}
              </li>
            ))}
          </ul>
        }
      </section>
        </div>
      </details>

      {editing ? (
        <CampaignDialog
          tenantId={tenantId}
          campaign={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={onSave}
          fnProfiles={fnProfiles}
        />
      ) : null}
    </div>
  );
}

function WaFreeBlock({ tenantId }: { tenantId: string }) {
  const fnGet = useServerFn(ownerGetWaFreeConfig);
  const fnSet = useServerFn(ownerUpdateWaFreeConfig);
  const fnList = useServerFn(ownerListWaFreeReminders);
  const [loading, setLoading] = useState(true);
  const [adminOk, setAdminOk] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [confirmTpl, setConfirmTpl] = useState("");
  const [reminderTpl, setReminderTpl] = useState("");
  const [minsBefore, setMinsBefore] = useState(40);
  const [ownerPhone, setOwnerPhone] = useState("");
  const [reminders, setReminders] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fnGet({ data: { tenant_id: tenantId } });
      setAdminOk(!!r.feature_admin_enabled);
      const c = r.config as any;
      setEnabled(!!c?.wa_free_enabled);
      setConfirmTpl(c?.wa_free_confirm_template ?? "");
      setReminderTpl(c?.wa_free_reminder_template ?? "");
      setMinsBefore(c?.wa_free_reminder_minutes_before ?? 40);
      setOwnerPhone(c?.owner_phone ?? "");
      if (r.feature_admin_enabled) {
        const l = await fnList({ data: { tenant_id: tenantId } });
        setReminders(l.reminders ?? []);
      }
    } catch (e: any) { toast.error(e?.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const save = async () => {
    setSaving(true);
    try {
      await fnSet({ data: {
        tenant_id: tenantId,
        wa_free_enabled: enabled,
        wa_free_confirm_template: confirmTpl,
        wa_free_reminder_template: reminderTpl,
        wa_free_reminder_minutes_before: minsBefore,
        owner_phone: ownerPhone.replace(/\D/g, ""),
      }});
      toast.success("Salvo.");
    } catch (e: any) {
      if (e?.message === "feature_not_available") {
        toast.error("Esta função ainda não foi liberada pelo Markee.");
      } else toast.error(e?.message || "Erro ao salvar.");
    } finally { setSaving(false); }
  };

  if (loading) {
    return <section className="glass p-5"><p className="text-sm text-muted-foreground">Carregando WhatsApp Gratuito…</p></section>;
  }

  if (!adminOk) {
    return (
      <section className="glass p-5">
        <h2 className="font-medium inline-flex items-center gap-2"><MessageCircle size={16} /> WhatsApp Gratuito</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta função (confirmação automática e lembrete por wa.me, sem custo) precisa ser liberada pelo Markee no BackOffice.
        </p>
      </section>
    );
  }

  return (
    <section className="glass p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium inline-flex items-center gap-2"><MessageCircle size={16} /> WhatsApp Gratuito (Confirmação + Lembrete)</h2>
          <p className="mt-1 text-xs text-muted-foreground">Gera links wa.me prontos. Confirmação aparece para o cliente na tela ao agendar. Lembrete fica disponível {minsBefore} min antes do horário para você clicar e enviar.</p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Ativar
        </label>
      </div>

      <div className="mt-4 grid gap-4">
        <label className="block">
          <span className="text-xs text-muted-foreground">Número do WhatsApp do negócio (remetente)</span>
          <input type="tel" placeholder="DDD + número, ex: 11999998888" className="input mt-1 w-full" value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)} />
          <span className="mt-1 block text-[11px] text-muted-foreground">
            Este é o número que precisa estar logado no WhatsApp do celular do dono para enviar. Alterar aqui também altera no BackOffice e fica registrado no log de auditoria.
          </span>
        </label>
        <label className="block">
          <span className="text-xs text-muted-foreground">Mensagem de confirmação</span>
          <textarea className="input mt-1 min-h-[100px] w-full" value={confirmTpl} onChange={(e) => setConfirmTpl(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs text-muted-foreground">Mensagem de lembrete</span>
          <textarea className="input mt-1 min-h-[100px] w-full" value={reminderTpl} onChange={(e) => setReminderTpl(e.target.value)} />
        </label>
        <label className="block max-w-[220px]">
          <span className="text-xs text-muted-foreground">Minutos antes do horário</span>
          <input type="number" min={5} max={1440} className="input mt-1 w-full" value={minsBefore}
            onChange={(e) => setMinsBefore(Math.max(5, Math.min(1440, parseInt(e.target.value || "40", 10))))} />
        </label>
        <p className="text-[11px] text-muted-foreground">Variáveis: {WA_FREE_PLACEHOLDERS.join("  ")}</p>
        <div>
          <button onClick={save} disabled={saving} className="btn-primary h-10 px-4 text-sm">{saving ? "Salvando…" : "Salvar"}</button>
        </div>
      </div>

      {reminders.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-medium">Lembretes prontos para enviar</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {reminders.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
                <span className="text-xs">{r.recipient || "—"} · {new Date(r.created_at).toLocaleString()}</span>
                {r.message_preview ? (
                  <a href={r.message_preview} target="_blank" rel="noreferrer" className="btn-primary inline-flex h-9 items-center gap-1 px-3 text-xs">
                    <Send size={12} /> Abrir WhatsApp
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function CampaignDialog({ tenantId, campaign, onClose, onSave, fnProfiles }: {
  tenantId: string; campaign: Campaign | null; onClose: () => void; onSave: (data: any) => void;
  fnProfiles: (args: { data: { tenant_id: string } }) => Promise<{ profiles: Profile[] }>;
}) {
  const [name, setName] = useState(campaign?.name ?? "");
  const [kind, setKind] = useState<"manual" | "inactive_trigger">(campaign?.kind ?? "manual");
  const [channels, setChannels] = useState<string[]>(campaign?.channels ?? ["email"]);
  const [audience, setAudience] = useState<"all" | "active" | "inactive" | "manual">(campaign?.audience_mode ?? "all");
  const [inactiveDays, setInactiveDays] = useState(campaign?.inactive_days ?? 20);
  const [message, setMessage] = useState(campaign?.message_body ?? "Olá {{name}}! Faz tempo que não te vejo no {{business}}. Que tal agendar um horário? 💛");
  const [subject, setSubject] = useState(campaign?.email_subject ?? "Sentimos sua falta!");
  const [active, setActive] = useState(campaign?.active ?? true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (audience !== "manual") return;
    fnProfiles({ data: { tenant_id: tenantId } }).then((r) => setProfiles(r.profiles));
  }, [audience, tenantId, fnProfiles]);

  useEffect(() => {
    if (campaign && audience === "manual" && profiles.length === 0) return;
  }, [campaign, audience, profiles]);

  const filtered = useMemo(() => profiles.filter((p) =>
    !filter || (p.name ?? "").toLowerCase().includes(filter.toLowerCase()) || (p.whatsapp ?? "").includes(filter)
  ), [profiles, filter]);

  const submit = () => {
    if (!name.trim()) { toast.error("Dê um nome."); return; }
    if (!message.trim()) { toast.error("Mensagem obrigatória."); return; }
    if (channels.length === 0) { toast.error("Escolha pelo menos 1 canal."); return; }
    onSave({
      id: campaign?.id, name, kind, channels, audience_mode: audience,
      inactive_days: inactiveDays, message_body: message,
      email_subject: subject || null, active,
      target_profile_ids: audience === "manual" ? [...picked] : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="glass max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-2xl">{campaign ? "Editar campanha" : "Nova campanha"}</h2>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs text-muted-foreground">Nome interno</span>
            <input className="input mt-1 w-full" value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-muted-foreground">Tipo</span>
              <select className="input mt-1 w-full" value={kind} onChange={(e) => {
                const k = e.target.value as any; setKind(k);
                if (k === "inactive_trigger") setAudience("inactive");
              }}>
                <option value="manual">Manual (disparo sob demanda)</option>
                <option value="inactive_trigger">Gatilho automático por inatividade</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Status</span>
              <select className="input mt-1 w-full" value={active ? "1" : "0"} onChange={(e) => setActive(e.target.value === "1")}>
                <option value="1">Ativa</option>
                <option value="0">Pausada</option>
              </select>
            </label>
          </div>

          <div>
            <span className="text-xs text-muted-foreground">Canais</span>
            <div className="mt-1 flex gap-2">
              {(["email", "whatsapp"] as const).map((c) => (
                <label key={c} className={`glass cursor-pointer px-3 py-1.5 text-xs ${channels.includes(c) ? "ring-1 ring-primary" : ""}`}>
                  <input type="checkbox" className="mr-1" checked={channels.includes(c)} onChange={(e) => {
                    setChannels(e.target.checked ? [...channels, c] : channels.filter((x) => x !== c));
                  }} />
                  {c === "email" ? "E-mail" : "WhatsApp"}
                </label>
              ))}
            </div>
            {channels.includes("whatsapp") ? (
              <p className="mt-1 text-[11px] text-amber-300/80">WhatsApp marca como “aguardando integração” até o Markee ativar o envio.</p>
            ) : null}
          </div>

          {kind === "manual" ? (
            <label className="block">
              <span className="text-xs text-muted-foreground">Público</span>
              <select className="input mt-1 w-full" value={audience} onChange={(e) => setAudience(e.target.value as any)}>
                <option value="all">Todos</option>
                <option value="active">Apenas ativos</option>
                <option value="inactive">Inativos (sem agendar há X dias)</option>
                <option value="manual">Selecionar manualmente</option>
              </select>
            </label>
          ) : null}

          {(kind === "inactive_trigger" || audience === "inactive") ? (
            <label className="block">
              <span className="text-xs text-muted-foreground">Dias sem agendamento</span>
              <input type="number" min={1} max={365} className="input mt-1 w-full" value={inactiveDays}
                onChange={(e) => setInactiveDays(Math.max(1, parseInt(e.target.value || "1", 10)))} />
            </label>
          ) : null}

          {audience === "manual" && kind === "manual" ? (
            <div>
              <span className="text-xs text-muted-foreground">Clientes ({picked.size} selecionados)</span>
              <input className="input mt-1 w-full" placeholder="Buscar..." value={filter} onChange={(e) => setFilter(e.target.value)} />
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-black/30">
                {filtered.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 border-b border-white/5 px-3 py-2 text-sm last:border-b-0">
                    <input type="checkbox" checked={picked.has(p.id)} onChange={(e) => {
                      const n = new Set(picked);
                      if (e.target.checked) n.add(p.id); else n.delete(p.id);
                      setPicked(n);
                    }} />
                    <span className="flex-1">{p.name || "Cliente"}</span>
                    <span className="text-[10px] text-muted-foreground">{p.email || p.whatsapp || "—"}</span>
                  </label>
                ))}
                {filtered.length === 0 ? <p className="px-3 py-4 text-xs text-muted-foreground">Sem clientes.</p> : null}
              </div>
            </div>
          ) : null}

          {channels.includes("email") ? (
            <label className="block">
              <span className="text-xs text-muted-foreground">Assunto do e-mail</span>
              <input className="input mt-1 w-full" value={subject ?? ""} onChange={(e) => setSubject(e.target.value)} />
            </label>
          ) : null}

          <label className="block">
            <span className="text-xs text-muted-foreground">Mensagem (use {"{{name}}"} e {"{{business}}"})</span>
            <textarea className="input mt-1 min-h-[140px] w-full" value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-ghost-glass h-10 px-4 text-sm">Cancelar</button>
          <button onClick={submit} className="btn-primary h-10 px-4 text-sm">Salvar</button>
        </div>
      </div>
    </div>
  );
}
