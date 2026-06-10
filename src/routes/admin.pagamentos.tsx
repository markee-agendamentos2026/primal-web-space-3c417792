import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  adminListPayments, adminListReceipts, adminReviewReceipt, adminSignReceiptUrl,
} from "@/lib/admin.functions";
import { PageHeader, Card } from "@/components/AdminShell";
import { Download, Check, X, FileText, Clock, ExternalLink } from "lucide-react";
import { downloadCSV } from "@/lib/csv";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pagamentos")({ component: AdminPaymentsPage });

const brl = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDt = (d: string) => new Date(d).toLocaleString("pt-BR");

type Tab = "pending" | "history" | "all_receipts";

function AdminPaymentsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  return (
    <>
      <PageHeader title="Pagamentos" subtitle="Comprovantes recebidos e pagamentos confirmados." />
      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1 text-xs">
        <TabBtn active={tab === "pending"} onClick={() => setTab("pending")}>Comprovantes pendentes</TabBtn>
        <TabBtn active={tab === "all_receipts"} onClick={() => setTab("all_receipts")}>Todos os comprovantes</TabBtn>
        <TabBtn active={tab === "history"} onClick={() => setTab("history")}>Histórico de pagamentos</TabBtn>
      </div>
      {tab === "history" ? <PaymentsHistory /> : <ReceiptsList status={tab === "pending" ? "pending" : "all"} />}
    </>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`rounded-lg px-3 py-2 transition ${active ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
      {children}
    </button>
  );
}

function ReceiptsList({ status }: { status: "pending" | "all" }) {
  const fn = useServerFn(adminListReceipts);
  const reviewFn = useServerFn(adminReviewReceipt);
  const signFn = useServerFn(adminSignReceiptUrl);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-receipts", status],
    queryFn: () => fn({ data: { status } }),
  });
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-receipts"] });

  const open = async (path: string) => {
    try { const r = await signFn({ data: { path } }); window.open(r.url, "_blank"); }
    catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  const approve = async (id: string) => {
    setBusy(id);
    try {
      await reviewFn({ data: { receipt_id: id, decision: "approve" } });
      toast.success("Comprovante aprovado. Empresa reativada e vencimento prorrogado.");
      refresh();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
    finally { setBusy(null); }
  };

  const reject = async () => {
    if (!rejecting) return;
    setBusy(rejecting);
    try {
      await reviewFn({ data: { receipt_id: rejecting, decision: "reject", rejection_reason: reason.trim() || undefined } });
      toast.success("Comprovante reprovado.");
      setRejecting(null); setReason(""); refresh();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
    finally { setBusy(null); }
  };

  const receipts = data?.receipts ?? [];

  return (
    <Card className="p-0">
      {isLoading ? (
        <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
      ) : receipts.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">Nenhum comprovante {status === "pending" ? "pendente" : "registrado"}.</div>
      ) : (
        <div className="divide-y divide-white/[0.04]">
          {receipts.map((r: any) => {
            const sm = r.status === "pending"
              ? { label: "Pendente", cls: "bg-amber-500/10 text-amber-300 border-amber-500/30" }
              : r.status === "approved"
                ? { label: "Aprovado", cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" }
                : { label: "Reprovado", cls: "bg-rose-500/10 text-rose-300 border-rose-500/30" };
            return (
              <div key={r.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${sm.cls}`}>
                      {r.status === "pending" ? <Clock size={11} /> : r.status === "approved" ? <Check size={11} /> : <X size={11} />}
                      {sm.label}
                    </span>
                    <span className="text-sm font-medium">{brl(r.amount)}</span>
                    {r.tenant && (
                      <Link to="/admin/empresas/$id" params={{ id: r.tenant_id }} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                        {r.tenant.name} <span className="opacity-60">/b/{r.tenant.slug}</span> <ExternalLink size={10} />
                      </Link>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">Enviado em {fmtDt(r.created_at)}</div>
                  {r.note && <div className="mt-1 text-xs text-muted-foreground">Obs.: {r.note}</div>}
                  {r.rejection_reason && <div className="mt-1 text-xs text-rose-300">Motivo: {r.rejection_reason}</div>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => open(r.file_path)} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs hover:bg-white/5">
                    <FileText size={12} /> Ver arquivo
                  </button>
                  {r.status === "pending" && (
                    <>
                      <button disabled={busy === r.id} onClick={() => approve(r.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-60">
                        <Check size={12} /> Aprovar
                      </button>
                      <button disabled={busy === r.id} onClick={() => { setRejecting(r.id); setReason(""); }}
                        className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/20 disabled:opacity-60">
                        <X size={12} /> Reprovar
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setRejecting(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0b12] p-6 shadow-2xl">
            <h3 className="text-base font-semibold">Reprovar comprovante</h3>
            <p className="mt-1 text-xs text-muted-foreground">A empresa continua bloqueada/atrasada e verá o motivo na tela de Pagamentos.</p>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={300} autoFocus
              placeholder="Ex.: comprovante ilegível, valor divergente, beneficiário incorreto…"
              className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setRejecting(null)} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-muted-foreground hover:bg-white/[0.06]">Cancelar</button>
              <button onClick={reject} disabled={busy === rejecting}
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-60">
                Reprovar
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function PaymentsHistory() {
  const fn = useServerFn(adminListPayments);
  const { data, isLoading } = useQuery({ queryKey: ["admin-payments"], queryFn: () => fn() });
  const total = (data?.payments ?? []).reduce((s, p: any) => s + Number(p.amount || 0), 0);

  const exportCsv = () => {
    downloadCSV(`pagamentos-${new Date().toISOString().slice(0, 10)}.csv`,
      (data?.payments ?? []).map((p: any) => ({
        data: fmtDt(p.paid_at), empresa: p.tenant?.name ?? "", slug: p.tenant?.slug ?? "",
        valor: p.amount, metodo: p.method, referencia: p.reference ?? "", obs: p.notes ?? "",
      })));
  };

  return (
    <Card>
      <div className="flex items-center justify-between gap-2 border-b border-white/5 px-4 py-3">
        <div className="text-xs text-muted-foreground">Total: <span className="text-foreground font-medium">{brl(total)}</span></div>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground hover:bg-white/[0.06]">
          <Download size={14} /> Exportar CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-[11px] uppercase tracking-widest text-muted-foreground">
              <th className="px-3 py-2.5 text-left font-normal">Data</th>
              <th className="px-3 py-2.5 text-left font-normal">Empresa</th>
              <th className="px-3 py-2.5 text-left font-normal">Valor</th>
              <th className="px-3 py-2.5 text-left font-normal">Método</th>
              <th className="px-3 py-2.5 text-left font-normal">Obs.</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Carregando…</td></tr>
            ) : (data?.payments ?? []).length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Nenhum pagamento.</td></tr>
            ) : (data!.payments).map((p: any) => (
              <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="px-3 py-2.5 text-muted-foreground">{fmtDt(p.paid_at)}</td>
                <td className="px-3 py-2.5">{p.tenant?.name ?? "—"} <span className="text-[11px] text-muted-foreground">/b/{p.tenant?.slug}</span></td>
                <td className="px-3 py-2.5 font-medium">{brl(p.amount)}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{p.method}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{p.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
