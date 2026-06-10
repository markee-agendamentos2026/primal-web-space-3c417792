import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminListAudit } from "@/lib/admin.functions";
import { PageHeader, Card } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/auditoria")({ component: AdminAuditPage });
const fmtDt = (d: string) => new Date(d).toLocaleString("pt-BR");

function AdminAuditPage() {
  const fn = useServerFn(adminListAudit);
  const { data, isLoading } = useQuery({ queryKey: ["admin-audit"], queryFn: () => fn() });

  return (
    <>
      <PageHeader title="Auditoria" subtitle="Trilha de eventos administrativos" />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[11px] uppercase tracking-widest text-muted-foreground">
                <th className="px-3 py-2.5 text-left font-normal">Quando</th>
                <th className="px-3 py-2.5 text-left font-normal">Empresa</th>
                <th className="px-3 py-2.5 text-left font-normal">Ação</th>
                <th className="px-3 py-2.5 text-left font-normal">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Carregando…</td></tr>
              ) : (data?.logs ?? []).length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Sem registros.</td></tr>
              ) : (data!.logs).map((l: any) => (
                <tr key={l.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] align-top">
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDt(l.created_at)}</td>
                  <td className="px-3 py-2.5">{l.tenant?.name ?? "—"}</td>
                  <td className="px-3 py-2.5"><span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px]">{l.action}</span></td>
                  <td className="px-3 py-2.5 text-[11px] text-muted-foreground font-mono">{JSON.stringify(l.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
