import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { tenantSubscription, tenantSubmitReceipt } from "@/lib/admin.functions";
import { getCurrentTenantId } from "@/lib/tenant";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar, CreditCard, Copy, Check, Upload, AlertCircle, CheckCircle2,
  Clock, XCircle, FileText,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/b/$slug/painel/pagamentos")({
  component: PaymentsPage,
  head: () => ({ meta: [{ title: "Pagamentos — Painel" }] }),
});

const brl = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");
const fmtDt = (d: string | null) => (d ? new Date(d).toLocaleString("pt-BR") : "—");

const STATUS_META: Record<string, { label: string; class: string; icon: any }> = {
  active: { label: "Em dia", class: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30", icon: CheckCircle2 },
  late: { label: "Atrasada", class: "bg-amber-500/10 text-amber-300 border-amber-500/30", icon: AlertCircle },
  blocked: { label: "Bloqueada", class: "bg-rose-500/10 text-rose-300 border-rose-500/30", icon: AlertCircle },
};
const RECEIPT_META: Record<string, { label: string; class: string; icon: any }> = {
  pending: { label: "Em análise", class: "bg-amber-500/10 text-amber-300 border-amber-500/30", icon: Clock },
  approved: { label: "Aprovado", class: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30", icon: CheckCircle2 },
  rejected: { label: "Reprovado", class: "bg-rose-500/10 text-rose-300 border-rose-500/30", icon: XCircle },
};

// ---- PIX EMV (BR Code) builder ---------------------------------------------
// Gera "PIX Copia e Cola" estático seguindo a especificação do Bacen.
function tlv(id: string, value: string) {
  const len = String(value.length).padStart(2, "0");
  return `${id}${len}${value}`;
}
function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
function buildPixPayload(opts: {
  key: string; name: string; city: string; amount?: number; txid?: string;
}) {
  const name = (opts.name || "MARKEE").toUpperCase().slice(0, 25);
  const city = (opts.city || "SAO PAULO").toUpperCase().slice(0, 15);
  const merchantAccount = tlv("00", "br.gov.bcb.pix") + tlv("01", opts.key);
  let payload =
    tlv("00", "01") +
    tlv("26", merchantAccount) +
    tlv("52", "0000") +
    tlv("53", "986");
  if (opts.amount && opts.amount > 0) payload += tlv("54", opts.amount.toFixed(2));
  payload +=
    tlv("58", "BR") +
    tlv("59", name) +
    tlv("60", city) +
    tlv("62", tlv("05", (opts.txid || "***").slice(0, 25)));
  const toCrc = payload + "6304";
  return toCrc + crc16(toCrc);
}
// ----------------------------------------------------------------------------

function PaymentsPage() {
  const tenantId = getCurrentTenantId();
  const fn = useServerFn(tenantSubscription);
  const submitFn = useServerFn(tenantSubmitReceipt);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["tenant-subscription", tenantId],
    queryFn: () => fn({ data: { tenant_id: tenantId } }),
  });

  const [copied, setCopied] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pix = data?.pix ?? null;
  const t = data?.tenant ?? null;
  const fin = data?.financial ?? null;
  const meta = STATUS_META[fin?.effective_status ?? t?.status ?? "active"] ?? STATUS_META.active;
  const Icon = meta.icon;

  const pixPayload = useMemo(() => {
    if (!pix?.pix_key) return "";
    return buildPixPayload({
      key: pix.pix_key,
      name: pix.pix_beneficiary_name || "MARKEE",
      city: pix.pix_beneficiary_city || "SAO PAULO",
      amount: t?.monthly_price ? Number(t.monthly_price) : undefined,
    });
  }, [pix, t]);

  const copy = async (txt: string, which: "key" | "payload") => {
    try {
      await navigator.clipboard.writeText(txt);
      if (which === "key") { setCopied(true); setTimeout(() => setCopied(false), 1500); }
      else { setCopiedPayload(true); setTimeout(() => setCopiedPayload(false), 1500); }
      toast.success("Copiado!");
    } catch { toast.error("Não foi possível copiar."); }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("Arquivo até 8MB."); return; }
    const value = Number((amount || "").toString().replace(",", "."));
    if (!value || value <= 0) { toast.error("Informe o valor pago."); return; }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${tenantId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const up = await supabase.storage.from("payment-receipts").upload(path, file, {
        contentType: file.type || undefined, upsert: false,
      });
      if (up.error) throw up.error;
      const { data: signed, error: sErr } = await supabase.storage
        .from("payment-receipts").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (sErr || !signed) throw sErr ?? new Error("url");
      await submitFn({ data: {
        tenant_id: tenantId, amount: value, file_path: path, file_url: signed.signedUrl,
        note: note.trim() || undefined,
      }});
      toast.success("Comprovante enviado! Aguarde a análise.");
      setAmount(""); setNote("");
      if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["tenant-subscription", tenantId] });
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao enviar comprovante.");
    } finally {
      setUploading(false);
    }
  };

  if (isLoading || !t) return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-display">Pagamentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pague via PIX e envie o comprovante para liberação.</p>
      </div>

      {/* Status */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass p-5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Status da assinatura</div>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${meta.class}`}>
              <Icon size={12} /> {meta.label}
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <div className="text-3xl font-semibold">{brl(Number(t.monthly_price))}</div>
            <div className="text-xs text-muted-foreground">/ mês</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Próx. vencimento</div>
              <div className="mt-1 flex items-center gap-1.5"><Calendar size={14} className="text-primary" /> {fmtDate(t.due_date)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Último pagamento</div>
              <div className="mt-1 flex items-center gap-1.5"><CreditCard size={14} className="text-primary" /> {fmtDate(t.last_payment_at)}</div>
            </div>
          </div>
          {fin?.has_pending_receipt && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              <Clock size={14} className="mt-0.5 shrink-0" />
              Você tem um comprovante em análise. Liberamos assim que confirmado.
            </div>
          )}
        </div>

        {/* PIX */}
        <div className="glass p-5">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Pagar via PIX</div>
          {!pix?.pix_key ? (
            <p className="mt-3 text-sm text-muted-foreground">A chave PIX ainda não foi configurada. Fale com o suporte.</p>
          ) : (
            <>
              <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <div className="rounded-xl border border-white/10 bg-white p-3">
                  <QRCodeCanvas value={pixPayload} size={140} level="M" includeMargin={false} />
                </div>
                <div className="flex-1 space-y-2 text-sm w-full">
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Chave PIX {pix.pix_key_type ? `(${pix.pix_key_type})` : ""}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 truncate rounded-md bg-white/5 px-2 py-1.5 text-xs">{pix.pix_key}</code>
                      <button onClick={() => copy(pix.pix_key!, "key")} className="inline-flex h-8 items-center gap-1 rounded-md border border-white/10 px-2 text-xs hover:bg-white/5">
                        {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Ok" : "Copiar"}
                      </button>
                    </div>
                  </div>
                  {pix.pix_beneficiary_name && (
                    <div className="text-xs text-muted-foreground">
                      <span className="opacity-70">Beneficiário:</span> {pix.pix_beneficiary_name}
                    </div>
                  )}
                  <button onClick={() => copy(pixPayload, "payload")} className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs hover:bg-white/[0.06]">
                    {copiedPayload ? <Check size={12} /> : <Copy size={12} />} {copiedPayload ? "Copiado" : "Copiar PIX Copia & Cola"}
                  </button>
                </div>
              </div>
              {pix.pix_instructions && (
                <p className="mt-3 text-xs text-muted-foreground">{pix.pix_instructions}</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Upload comprovante */}
      <div className="glass p-5">
        <h2 className="text-sm font-semibold">Enviar comprovante</h2>
        <p className="mt-1 text-xs text-muted-foreground">Após pagar, anexe o comprovante. A liberação acontece logo após a aprovação.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Valor pago</label>
            <input
              type="number" step="0.01" inputMode="decimal" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t.monthly_price ? Number(t.monthly_price).toFixed(2) : "0,00"}
              className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Observação (opcional)</label>
            <input
              type="text" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200}
              placeholder="Ex.: pagamento referente a maio"
              className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/60"
            />
          </div>
        </div>
        <div className="mt-3">
          <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={onFile} className="hidden" id="receipt-file" />
          <label
            htmlFor="receipt-file"
            className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-primary/15 px-3 py-2 text-sm text-primary hover:bg-primary/25 ${uploading ? "pointer-events-none opacity-60" : ""}`}
          >
            <Upload size={14} /> {uploading ? "Enviando…" : "Anexar comprovante"}
          </label>
          <span className="ml-2 text-[11px] text-muted-foreground">PDF ou imagem, até 8MB.</span>
        </div>
      </div>

      {/* Histórico de comprovantes */}
      <div className="glass p-5">
        <h2 className="text-sm font-semibold">Comprovantes enviados</h2>
        {(!data?.receipts || data.receipts.length === 0) ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhum comprovante enviado ainda.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {data.receipts.map((r: any) => {
              const rm = RECEIPT_META[r.status] ?? RECEIPT_META.pending;
              const RIcon = rm.icon;
              return (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${rm.class}`}>
                        <RIcon size={11} /> {rm.label}
                      </span>
                      <span className="text-sm font-medium">{brl(Number(r.amount))}</span>
                      <span className="text-[11px] text-muted-foreground">{fmtDt(r.created_at)}</span>
                    </div>
                    {r.note && <div className="mt-1 text-xs text-muted-foreground">{r.note}</div>}
                    {r.status === "rejected" && r.rejection_reason && (
                      <div className="mt-1 text-xs text-rose-300">Motivo: {r.rejection_reason}</div>
                    )}
                  </div>
                  <a href={r.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs hover:bg-white/5">
                    <FileText size={12} /> Ver arquivo
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Histórico de pagamentos confirmados */}
      <div className="glass p-5">
        <h2 className="text-sm font-semibold">Histórico de pagamentos</h2>
        {data!.payments.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhum pagamento registrado ainda.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[11px] uppercase tracking-widest text-muted-foreground">
                  <th className="px-2 py-2 text-left font-normal">Data</th>
                  <th className="px-2 py-2 text-left font-normal">Valor</th>
                  <th className="px-2 py-2 text-left font-normal">Método</th>
                </tr>
              </thead>
              <tbody>
                {data!.payments.map((p: any) => (
                  <tr key={p.id} className="border-b border-white/[0.04]">
                    <td className="px-2 py-2 text-muted-foreground">{fmtDt(p.paid_at)}</td>
                    <td className="px-2 py-2 font-medium">{brl(p.amount)}</td>
                    <td className="px-2 py-2 text-muted-foreground">{p.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
