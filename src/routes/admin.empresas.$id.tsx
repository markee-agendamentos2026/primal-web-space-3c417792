import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  adminGetTenant, adminUpdateTenant, adminConfirmPayment,
  adminSetTenantStatus, adminResetTenantOwnerPassword, adminDeleteTenant,
} from "@/lib/admin.functions";
import { adminListTenantFeatures, adminSetTenantFeature } from "@/lib/features.functions";
import { FEATURES } from "@/lib/features";
import { PageHeader, Card } from "@/components/AdminShell";
import { ArrowLeft, Check, Ban, RotateCcw, KeyRound, ExternalLink, DollarSign, Save, MessageCircle, Palette, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/empresas/$id")({ component: TenantDetailPage });

const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";
const fmtDt = (d: string | null) => d ? new Date(d).toLocaleString("pt-BR") : "—";
const brl = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function TenantDetailPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(adminGetTenant);
  const updateFn = useServerFn(adminUpdateTenant);
  const confirmFn = useServerFn(adminConfirmPayment);
  const statusFn = useServerFn(adminSetTenantStatus);
  const resetFn = useServerFn(adminResetTenantOwnerPassword);
  const deleteFn = useServerFn(adminDeleteTenant);
  const featuresFn = useServerFn(adminListTenantFeatures);
  const setFeatureFn = useServerFn(adminSetTenantFeature);

  const { data, isLoading } = useQuery({ queryKey: ["admin-tenant", id], queryFn: () => getFn({ data: { id } }) });
  const { data: featData } = useQuery({ queryKey: ["admin-tenant-features", id], queryFn: () => featuresFn({ data: { tenant_id: id } }) });

  const [edit, setEdit] = useState<any>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("pix");
  const [payNotes, setPayNotes] = useState("");
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [waForm, setWaForm] = useState<any>(null);
  const [waSaving, setWaSaving] = useState(false);
  const [brandForm, setBrandForm] = useState<any>(null);
  const [brandSaving, setBrandSaving] = useState(false);
  const [deleteSlug, setDeleteSlug] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  if (isLoading || !data?.tenant) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  const t = data.tenant;
  const form = edit ?? { name: t.name, slug: t.slug, owner_name: t.owner_name, owner_phone: t.owner_phone, owner_email: t.owner_email, monthly_price: t.monthly_price, due_date: t.due_date, blocked_grace_days: t.blocked_grace_days };
  const wa = waForm ?? {
    whatsapp_enabled: !!t.whatsapp_enabled,
    uazapi_token: t.uazapi_token ?? "",
    whatsapp_instance: t.whatsapp_instance ?? "",
    whatsapp_sender_number: t.whatsapp_sender_number ?? "",
  };
  const brand = brandForm ?? {
    primary_color: t.primary_color ?? "#d4a64a",
    primary_glow_color: t.primary_glow_color ?? "#f0c674",
    secondary_color: t.secondary_color ?? "#0a0a0a",
  };

  const reload = () => qc.invalidateQueries({ queryKey: ["admin-tenant", id] });

  const save = async () => {
    try {
      const slugChanged = form.slug && form.slug !== t.slug;
      await updateFn({ data: { id, ...form, monthly_price: Number(form.monthly_price) } });
      toast.success(slugChanged ? `Empresa atualizada. Nova URL: /b/${form.slug}` : "Empresa atualizada");
      setEdit(null); reload();
      if (slugChanged) qc.invalidateQueries({ queryKey: ["admin-tenants"] });
    } catch (e: any) {
      const msg = e?.message ?? "Erro ao salvar";
      if (msg === "slug_in_use") toast.error("Este slug já está em uso por outra empresa.");
      else toast.error(msg);
    }
  };

  const confirmPayment = async () => {
    const amt = Number(payAmount); if (!amt || amt <= 0) { toast.error("Informe um valor"); return; }
    try {
      await confirmFn({ data: { tenant_id: id, amount: amt, method: payMethod, notes: payNotes || undefined } });
      toast.success("Pagamento confirmado");
      setPayAmount(""); setPayNotes(""); reload();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  const setStatus = async (s: "active" | "blocked") => {
    try {
      await statusFn({ data: { id, status: s } });
      toast.success(s === "active" ? "Empresa reativada" : "Empresa bloqueada");
      reload();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  const submitPwd = async () => {
    if (pwd1.length < 6) { toast.error("A senha deve ter pelo menos 6 caracteres"); return; }
    if (pwd1 !== pwd2) { toast.error("As senhas não conferem"); return; }
    setPwdLoading(true);
    try {
      await resetFn({ data: { tenant_id: id, new_password: pwd1 } });
      toast.success("Senha atualizada com sucesso");
      setPwdOpen(false); setPwd1(""); setPwd2(""); reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao atualizar senha");
    } finally { setPwdLoading(false); }
  };

  const saveWa = async () => {
    setWaSaving(true);
    try {
      await updateFn({ data: {
        id,
        whatsapp_enabled: !!wa.whatsapp_enabled,
        uazapi_token: wa.uazapi_token || null,
        whatsapp_instance: wa.whatsapp_instance || null,
        whatsapp_sender_number: wa.whatsapp_sender_number || null,
      }});
      toast.success("Integração WhatsApp salva.");
      setWaForm(null); reload();
    } catch (e: any) { toast.error(e?.message ?? "Erro ao salvar"); }
    finally { setWaSaving(false); }
  };

  const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);
  const saveBrand = async () => {
    if (!isHex(brand.primary_color) || !isHex(brand.primary_glow_color) || !isHex(brand.secondary_color)) {
      toast.error("Use cores no formato #RRGGBB"); return;
    }
    setBrandSaving(true);
    try {
      await updateFn({ data: {
        id,
        primary_color: brand.primary_color,
        primary_glow_color: brand.primary_glow_color,
        secondary_color: brand.secondary_color,
      }});
      toast.success("Cores da marca salvas.");
      setBrandForm(null); reload();
    } catch (e: any) { toast.error(e?.message ?? "Erro ao salvar"); }
    finally { setBrandSaving(false); }
  };
  const featMap = new Map<string, boolean>(
    (featData?.features ?? []).map((f: any) => [f.feature_key, !!f.admin_enabled]),
  );
  const toggleFeature = async (key: string, enabled: boolean) => {
    try {
      await setFeatureFn({ data: { tenant_id: id, feature_key: key, enabled } });
      toast.success(enabled ? "Tela liberada para esta empresa." : "Tela removida desta empresa.");
      qc.invalidateQueries({ queryKey: ["admin-tenant-features", id] });
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };



  return (
    <>
      <button onClick={() => nav({ to: "/admin/empresas" })} className="mb-4 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Empresas
      </button>

      <PageHeader
        title={t.name}
        subtitle={`/b/${t.slug} · status ${t.status}`}
        right={
          <div className="flex flex-wrap gap-2">
            <a href={`/b/${t.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground hover:bg-white/[0.06]">
              <ExternalLink size={14} /> Ver site da empresa
            </a>
            <button onClick={() => { setPwd1(""); setPwd2(""); setPwdOpen(true); }} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground hover:bg-white/[0.06]">
              <KeyRound size={14} /> Redefinir senha
            </button>
            {t.status !== "blocked" ? (
              <button onClick={() => setStatus("blocked")} className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/20">
                <Ban size={14} /> Bloquear
              </button>
            ) : (
              <button onClick={() => setStatus("active")} className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-500/20">
                <RotateCcw size={14} /> Reativar
              </button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Dados da empresa</h2>
            {edit ? (
              <button onClick={save} className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-primary to-primary-glow px-3 py-1.5 text-xs font-semibold text-primary-foreground"><Save size={12} /> Salvar</button>
            ) : (
              <button onClick={() => setEdit(form)} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-muted-foreground hover:bg-white/[0.06]">Editar</button>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Nome" value={form.name} onChange={(v) => setEdit({ ...form, name: v })} disabled={!edit} />
            <FormField label="Slug (URL pública /b/…)" value={form.slug ?? ""} onChange={(v) => setEdit({ ...form, slug: v.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-") })} disabled={!edit} />
            <FormField label="Responsável" value={form.owner_name ?? ""} onChange={(v) => setEdit({ ...form, owner_name: v })} disabled={!edit} />
            <FormField label="Telefone" value={form.owner_phone ?? ""} onChange={(v) => setEdit({ ...form, owner_phone: v })} disabled={!edit} />
            <FormField label="E-mail" value={form.owner_email ?? ""} onChange={(v) => setEdit({ ...form, owner_email: v })} disabled={!edit} />
            <FormField label="Mensalidade (R$)" type="number" value={String(form.monthly_price ?? 0)} onChange={(v) => setEdit({ ...form, monthly_price: v })} disabled={!edit} />
            <FormField label="Vencimento" type="date" value={form.due_date ?? ""} onChange={(v) => setEdit({ ...form, due_date: v })} disabled={!edit} />
            <FormField label="Dias de carência p/ bloqueio" type="number" value={String(form.blocked_grace_days ?? 7)} onChange={(v) => setEdit({ ...form, blocked_grace_days: Number(v) })} disabled={!edit} />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold">Confirmar pagamento</h2>
          <div className="space-y-3">
            <FormField label="Valor (R$)" type="number" value={payAmount} onChange={setPayAmount} />
            <div>
              <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Método</label>
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm focus:border-primary focus:outline-none">
                <option value="pix">PIX</option>
                <option value="manual">Manual</option>
                <option value="card">Cartão</option>
                <option value="other">Outro</option>
              </select>
            </div>
            <FormField label="Observações" value={payNotes} onChange={setPayNotes} />
            <button onClick={confirmPayment} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-glow py-2.5 text-sm font-semibold text-primary-foreground">
              <Check size={14} /> Confirmar pagamento
            </button>
            <p className="text-[11px] text-muted-foreground">Atualiza o vencimento em +30 dias e reativa a empresa.</p>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><DollarSign size={14} /> Histórico financeiro</h2>
          {data.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] uppercase tracking-widest text-muted-foreground">
                    <th className="px-2 py-2 text-left font-normal">Data</th>
                    <th className="px-2 py-2 text-left font-normal">Valor</th>
                    <th className="px-2 py-2 text-left font-normal">Método</th>
                    <th className="px-2 py-2 text-left font-normal">Obs.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((p: any) => (
                    <tr key={p.id} className="border-b border-white/[0.04]">
                      <td className="px-2 py-2 text-muted-foreground">{fmtDt(p.paid_at)}</td>
                      <td className="px-2 py-2 font-medium">{brl(p.amount)}</td>
                      <td className="px-2 py-2 text-muted-foreground">{p.method}</td>
                      <td className="px-2 py-2 text-muted-foreground">{p.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><MessageCircle size={14} /> Integração WhatsApp (UAZAPI) — desta empresa</h2>
            <button onClick={saveWa} disabled={waSaving} className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-primary to-primary-glow px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60">
              <Save size={12} /> {waSaving ? "Salvando…" : "Salvar"}
            </button>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Cole aqui o token UAZAPI contratado para esta empresa quando ela aderir ao plano com WhatsApp. Sem token ou com o interruptor desligado, os envios de WhatsApp ficam na fila como <span className="text-amber-300">aguardando integração</span> e e-mails seguem normalmente.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Token UAZAPI desta empresa" value={wa.uazapi_token} onChange={(v) => setWaForm({ ...wa, uazapi_token: v })} />
            <FormField label="Instância UAZAPI (opcional)" value={wa.whatsapp_instance} onChange={(v) => setWaForm({ ...wa, whatsapp_instance: v })} />
            <FormField label="Número remetente WhatsApp" value={wa.whatsapp_sender_number} onChange={(v) => setWaForm({ ...wa, whatsapp_sender_number: v })} />
            <label className="flex items-center gap-2 self-end rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs">
              <input type="checkbox" checked={!!wa.whatsapp_enabled} onChange={(e) => setWaForm({ ...wa, whatsapp_enabled: e.target.checked })} />
              <span className="text-foreground">Envio de WhatsApp ativo para esta empresa</span>
            </label>
          </div>
          <div className={`mt-3 rounded-xl border p-3 text-[11px] ${wa.whatsapp_enabled && wa.uazapi_token ? "border-emerald-400/30 bg-emerald-400/5 text-emerald-200" : "border-amber-400/30 bg-amber-400/5 text-amber-200"}`}>
            {wa.whatsapp_enabled && wa.uazapi_token ? "Ativo — WhatsApp será enviado normalmente." : "Aguardando ativação para esta empresa."}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Palette size={14} /> Identidade visual — cores da marca</h2>
            <button onClick={saveBrand} disabled={brandSaving} className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-primary to-primary-glow px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60">
              <Save size={12} /> {brandSaving ? "Salvando…" : "Salvar cores"}
            </button>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Estas cores são aplicadas automaticamente no site público (<code>/b/{t.slug}</code>) e no painel desta empresa. Clique no quadrado para escolher visualmente ou digite o código hex (<code>#RRGGBB</code>).
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <ColorField label="Primária" value={brand.primary_color} onChange={(v) => setBrandForm({ ...brand, primary_color: v })} />
            <ColorField label="Brilho da primária" value={brand.primary_glow_color} onChange={(v) => setBrandForm({ ...brand, primary_glow_color: v })} />
            <ColorField label="Secundária" value={brand.secondary_color} onChange={(v) => setBrandForm({ ...brand, secondary_color: v })} />
          </div>
          <div className="mt-4 rounded-xl border border-white/10 p-4" style={{ background: `linear-gradient(135deg, ${brand.primary_color}, ${brand.primary_glow_color})` }}>
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: brand.secondary_color }}>Pré-visualização</div>
            <div className="mt-1 font-display text-2xl" style={{ color: brand.secondary_color }}>{t.name}</div>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-3">
          <div className="mb-3 flex items-center gap-2">
            <SlidersHorizontal size={14} />
            <h2 className="text-sm font-semibold">Fluxo de telas disponíveis para esta empresa</h2>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Ative as telas extras que esta empresa pode usar. O dono só consegue habilitar/desabilitar no painel dela aquilo que estiver liberado aqui.
          </p>
          <div className="space-y-2">
            {FEATURES.map((f) => {
              const enabled = featMap.get(f.key) ?? false;
              return (
                <label key={f.key} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{f.label}</div>
                    <div className="text-[11px] text-muted-foreground">{f.description}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => toggleFeature(f.key, e.target.checked)}
                    className="mt-1 h-5 w-5 cursor-pointer accent-primary"
                  />
                </label>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">


          <h2 className="mb-4 text-sm font-semibold">Auditoria recente</h2>
          {data.audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem registros.</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {data.audit.slice(0, 12).map((a: any) => (
                <li key={a.id} className="flex items-start justify-between gap-2 border-b border-white/[0.04] pb-2">
                  <div>
                    <div className="font-medium text-foreground">{a.action}</div>
                    <div className="text-[11px] text-muted-foreground">{fmtDt(a.created_at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {pwdOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !pwdLoading && setPwdOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0b12] p-6 shadow-2xl">
            <h3 className="text-base font-semibold">Redefinir senha do dono</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Define a senha de acesso de <span className="text-foreground">{t.owner_email}</span> ao painel da empresa. Mínimo 6 caracteres.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Nova senha</label>
                <input type="text" value={pwd1} onChange={(e) => setPwd1(e.target.value)} autoFocus
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Confirmar senha</label>
                <input type="text" value={pwd2} onChange={(e) => setPwd2(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitPwd(); }}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setPwdOpen(false)} disabled={pwdLoading}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-muted-foreground hover:bg-white/[0.06]">Cancelar</button>
              <button onClick={submitPwd} disabled={pwdLoading}
                className="rounded-xl bg-gradient-to-r from-primary to-primary-glow px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {pwdLoading ? "Salvando…" : "Salvar nova senha"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Card className="mt-8 border-rose-500/30 p-6">
        <h3 className="text-sm font-semibold text-rose-300">Zona perigosa</h3>
        <p className="mt-2 text-xs text-muted-foreground">
          Exclui a empresa <strong>{t.name}</strong>, agendamentos, serviços, profissionais e usuários dono/profissionais deste tenant. Irreversível.
        </p>
        <div className="mt-4">
          <label className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Digite o slug <code className="text-rose-200">{t.slug}</code> para confirmar
          </label>
          <input
            value={deleteSlug}
            onChange={(e) => setDeleteSlug(e.target.value)}
            className="mt-1 w-full max-w-sm rounded-xl border border-rose-500/30 bg-black/40 px-3 py-2 text-sm"
            placeholder={t.slug}
          />
        </div>
        <button
          type="button"
          disabled={deleteLoading || deleteSlug.trim().toLowerCase() !== t.slug}
          onClick={async () => {
            setDeleteLoading(true);
            try {
              await deleteFn({ data: { tenant_id: id, confirm_slug: deleteSlug } });
              toast.success("Empresa excluída");
              qc.invalidateQueries({ queryKey: ["admin-tenants"] });
              nav({ to: "/admin/empresas" });
            } catch (e: any) {
              const msg = e?.message ?? "Erro ao excluir";
              toast.error(msg === "confirm_slug_mismatch" ? "Slug de confirmação incorreto" : msg);
            } finally {
              setDeleteLoading(false);
            }
          }}
          className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 disabled:opacity-50"
        >
          {deleteLoading ? "Excluindo…" : "Excluir empresa permanentemente"}
        </button>
      </Card>
    </>
  );
}

function FormField({ label, value, onChange, type = "text", disabled }:
  { label: string; value: string; onChange: (v: string) => void; type?: string; disabled?: boolean }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:opacity-70"
      />
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
        <input
          type="color"
          value={safe}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} (seletor visual)`}
          className="h-8 w-10 cursor-pointer rounded-md border border-white/10 bg-transparent p-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`)}
          placeholder="#RRGGBB"
          maxLength={7}
          className="flex-1 bg-transparent px-1 py-1 text-sm font-mono uppercase focus:outline-none"
        />
      </div>
    </div>
  );
}
