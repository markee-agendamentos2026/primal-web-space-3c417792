import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { adminGetAppSettings, adminUpdateAppSettings } from "@/lib/admin.functions";
import { PageHeader, Card } from "@/components/AdminShell";
import { Save, Clock, KeyRound, MessageCircle, Mail, Repeat, Info } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/configuracoes")({
  component: AdminSettingsPage,
  head: () => ({ meta: [{ title: "Configurações — BackOffice" }] }),
});

function AdminSettingsPage() {
  const getFn = useServerFn(adminGetAppSettings);
  const saveFn = useServerFn(adminUpdateAppSettings);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-settings"], queryFn: () => getFn() });

  const [form, setForm] = useState<any>(null);
  const [applyAll, setApplyAll] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data?.settings) setForm({ ...data.settings }); }, [data]);

  if (isLoading || !form) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  const save = async () => {
    setSaving(true);
    try {
      await saveFn({ data: {
        pix_key: form.pix_key || null,
        pix_key_type: form.pix_key_type || null,
        pix_beneficiary_name: form.pix_beneficiary_name || null,
        pix_beneficiary_city: form.pix_beneficiary_city || null,
        pix_instructions: form.pix_instructions || null,
        default_blocked_grace_days: Number(form.default_blocked_grace_days ?? 5),
        apply_grace_to_all: applyAll,
        uazapi_base_url: form.uazapi_base_url || null,
        email_from_name: form.email_from_name || "Markee",
        email_from_local: form.email_from_local || "contato",
        recurrence_min_interval_seconds: Number(form.recurrence_min_interval_seconds ?? 60),
        recurrence_batch_size: Number(form.recurrence_batch_size ?? 50),
      }});
      toast.success("Configurações salvas.");
      setApplyAll(false);
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar.");
    } finally { setSaving(false); }
  };

  return (
    <>
      <PageHeader title="Configurações globais" subtitle="Chave PIX recebedora e regras financeiras para todas as empresas." right={
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-glow px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">
          <Save size={14} /> {saving ? "Salvando…" : "Salvar"}
        </button>
      } />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><KeyRound size={14} /> Recebimento PIX (global)</h2>
          <p className="mb-4 text-xs text-muted-foreground">Essa chave aparece para todos os donos na tela de Pagamentos, com QR Code e Copia & Cola.</p>
          <div className="grid gap-3">
            <Field label="Chave PIX" value={form.pix_key ?? ""} onChange={(v) => set("pix_key", v)} placeholder="Ex.: contato@markee.com.br" />
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Tipo da chave" value={form.pix_key_type ?? ""} onChange={(v) => set("pix_key_type", v)}
                options={[
                  { value: "", label: "—" },
                  { value: "email", label: "E-mail" },
                  { value: "cpf", label: "CPF" },
                  { value: "cnpj", label: "CNPJ" },
                  { value: "phone", label: "Telefone" },
                  { value: "random", label: "Aleatória" },
                ]} />
              <Field label="Cidade" value={form.pix_beneficiary_city ?? ""} onChange={(v) => set("pix_beneficiary_city", v.toUpperCase())} placeholder="SAO PAULO" maxLength={15} />
            </div>
            <Field label="Nome do beneficiário" value={form.pix_beneficiary_name ?? ""} onChange={(v) => set("pix_beneficiary_name", v.toUpperCase())} placeholder="MARKEE LTDA" maxLength={25} />
            <div>
              <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Instruções (opcional)</label>
              <textarea value={form.pix_instructions ?? ""} onChange={(e) => set("pix_instructions", e.target.value)} rows={3} maxLength={500}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm focus:border-primary focus:outline-none"
                placeholder="Após pagar, anexe o comprovante na tela de Pagamentos." />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><Clock size={14} /> Regra de bloqueio por inadimplência</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Define quantos dias após o vencimento a empresa fica em estado <span className="text-amber-300">atrasada</span> antes de ser <span className="text-rose-300">bloqueada</span>.
            Esse número é usado nos pop-ups de aviso e no countdown.
          </p>
          <div className="grid gap-3">
            <Field label="Dias de carência" type="number" value={String(form.default_blocked_grace_days ?? 5)}
              onChange={(v) => set("default_blocked_grace_days", Number(v))} />
            <label className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs">
              <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} className="mt-0.5" />
              <span>
                <span className="block text-foreground font-medium">Aplicar a todas as empresas existentes</span>
                <span className="block text-muted-foreground">Sem isso, só novas empresas recebem o valor. Marcando, todas as atuais passam a usar essa carência.</span>
              </span>
            </label>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11px] text-muted-foreground">
              Fluxo aplicado em toda a plataforma: aviso amarelo nos {form.default_blocked_grace_days ?? 5} dias antes do vencimento → vencido vira <b>atrasada</b> → após {form.default_blocked_grace_days ?? 5} dias de atraso, <b>bloqueada</b> automaticamente.
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold"><MessageCircle size={14} /> WhatsApp — UAZAPI (URL base global)</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            URL única do servidor UAZAPI que a Markee usa. <b>O token de cada empresa</b> é configurado individualmente em <span className="text-foreground">Empresas › abrir a empresa › Integração WhatsApp</span>. Assim você só contrata o serviço para quem assinar o plano com WhatsApp.
          </p>
          <div className="grid gap-3">
            <Field label="URL base UAZAPI" value={form.uazapi_base_url ?? ""} onChange={(v) => set("uazapi_base_url", v)} placeholder="https://api.uazapi.com" />
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11px] text-muted-foreground flex items-start gap-2">
              <Info size={12} className="mt-0.5 shrink-0" />
              <span>Sem essa URL ou sem token/empresa habilitada, mensagens de WhatsApp ficam na fila como <span className="text-amber-300">aguardando integração</span>. E-mails seguem normalmente.</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Repeat size={14} /> Recorrência (campanhas)</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Controla a velocidade do dispatcher que envia campanhas (manual e gatilho automático por inatividade).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Intervalo mínimo (segundos)" type="number" value={String(form.recurrence_min_interval_seconds ?? 60)}
              onChange={(v) => set("recurrence_min_interval_seconds", Number(v))} />
            <Field label="Lote por ciclo" type="number" value={String(form.recurrence_batch_size ?? 50)}
              onChange={(v) => set("recurrence_batch_size", Number(v))} />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Remetente (nome)" value={form.email_from_name ?? "Markee"} onChange={(v) => set("email_from_name", v)} placeholder="Markee" />
            <div>
              <label className="text-[11px] uppercase tracking-widest text-muted-foreground"><Mail size={11} className="inline mr-1" />E-mail remetente</label>
              <div className="mt-1 flex items-center rounded-xl border border-white/10 bg-white/[0.03] focus-within:border-primary">
                <input value={form.email_from_local ?? "contato"} onChange={(e) => set("email_from_local", e.target.value)}
                  className="w-full bg-transparent px-3 py-2 text-sm focus:outline-none" placeholder="contato" />
                <span className="px-3 text-xs text-muted-foreground">@markee.com.br</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, maxLength }:
  { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; maxLength?: number }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength}
        className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }:
  { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm focus:border-primary focus:outline-none">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
