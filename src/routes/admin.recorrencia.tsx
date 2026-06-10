import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminRecurrenceOverview, adminRetryQueueItems } from "@/lib/admin.functions";
import { PageHeader, Card } from "@/components/AdminShell";
import { Mail, MessageCircle, RotateCcw, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/recorrencia")({
  component: AdminRecurrencePage,
  head: () => ({ meta: [{ title: "Recorrência — BackOffice" }] }),
});

const fmtDt = (d: string | null) => d ? new Date(d).toLocaleString("pt-BR") : "—";

function AdminRecurrencePage() {
  const getFn = useServerFn(adminRecurrenceOverview);
  const retryFn = useServerFn(adminRetryQueueItems);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-recurrence"], queryFn: () => getFn() });

  const reload = () => qc.invalidateQueries({ queryKey: ["admin-recurrence"] });

  const retry = async (scope: "failed" | "skipped" | "all_non_sent", ids?: string[]) => {
    try {
      const r = await retryFn({ data: ids?.length ? { ids } : { scope } });
      toast.success(`${r.count} item(s) re-enfileirados.`);
      reload();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  if (isLoading || !data) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  const { totals, queue, queueStats, errors } = data;

  return (
    <>
      <PageHeader title="Recorrência — visão global" subtitle="Envios por canal, fila e erros recentes de todas as empresas." />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(["today", "week", "month"] as const).map((k) => (
          <Card key={k} className="p-4">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {k === "today" ? "Hoje" : k === "week" ? "Últimos 7 dias" : "Este mês"}
            </div>
            <div className="mt-2 flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2"><Mail size={14} /> <b>{totals[k].email}</b> e-mails</div>
              <div className="flex items-center gap-2"><MessageCircle size={14} /> <b>{totals[k].whatsapp}</b> WhatsApp</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Fila ({queueStats.queued} aguardando · {queueStats.failed} falhou · {queueStats.skipped} skipped)</h2>
            <div className="flex gap-2">
              <button onClick={() => retry("failed")} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs hover:bg-white/[0.06]"><RotateCcw size={12} className="inline mr-1" />Reprocessar falhas</button>
              <button onClick={() => retry("skipped")} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs hover:bg-white/[0.06]"><RotateCcw size={12} className="inline mr-1" />Reprocessar skipped</button>
            </div>
          </div>
          {queue.length === 0 ? <p className="text-sm text-muted-foreground">Fila vazia.</p> : (
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr><th className="px-2 py-2 text-left font-normal">Empresa</th><th className="text-left font-normal">Canal</th><th className="text-left font-normal">Status</th><th className="text-left font-normal">Erro</th></tr>
                </thead>
                <tbody>
                  {queue.map((q: any) => (
                    <tr key={q.id} className="border-b border-white/[0.04]">
                      <td className="px-2 py-1.5">{q.tenant?.name ?? "—"}</td>
                      <td className="px-2 py-1.5">{q.channel}</td>
                      <td className={`px-2 py-1.5 ${q.status === "failed" ? "text-rose-300" : q.status === "skipped" ? "text-amber-300" : "text-muted-foreground"}`}>{q.status}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{q.error ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><AlertCircle size={14} /> Erros recentes (mês)</h2>
          {errors.length === 0 ? <p className="text-sm text-muted-foreground">Sem erros no período.</p> : (
            <ul className="max-h-[420px] space-y-2 overflow-auto text-xs">
              {errors.map((e: any, i: number) => (
                <li key={i} className="border-b border-white/[0.04] pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{e.tenant?.name ?? "—"} · {e.channel}</span>
                    <span className="text-[10px] text-muted-foreground">{fmtDt(e.created_at)}</span>
                  </div>
                  <div className="text-muted-foreground">{e.recipient ?? "—"} — <span className={e.status === "failed" ? "text-rose-300" : "text-amber-300"}>{e.status}</span> — {e.error ?? "—"}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
