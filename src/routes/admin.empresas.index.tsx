import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { adminListTenants } from "@/lib/admin.functions";
import { PageHeader, Card } from "@/components/AdminShell";
import { Search, Download, Plus, ChevronRight } from "lucide-react";
import { downloadCSV } from "@/lib/csv";

export const Route = createFileRoute("/admin/empresas/")({ component: TenantsListPage });

const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";
const brl = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_LABEL: Record<string, string> = { active: "Ativa", late: "Atrasada", blocked: "Bloqueada" };
const STATUS_CLASS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  late: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  blocked: "bg-rose-500/10 text-rose-300 border-rose-500/20",
};

function TenantsListPage() {
  const fn = useServerFn(adminListTenants);
  const { data, isLoading } = useQuery({ queryKey: ["admin-tenants"], queryFn: () => fn() });
  const [filter, setFilter] = useState<"all" | "active" | "late" | "blocked" | "due_today" | "due_week">("all");
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "due_date" | "created_at">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const weekLimit = useMemo(() => { const d = new Date(today); d.setDate(d.getDate() + 7); return d; }, [today]);

  const rows = useMemo(() => {
    let r = data?.tenants ?? [];
    if (filter === "active" || filter === "late" || filter === "blocked") r = r.filter((t: any) => t.status === filter);
    if (filter === "due_today") r = r.filter((t: any) => t.due_date && new Date(t.due_date).toDateString() === today.toDateString());
    if (filter === "due_week") r = r.filter((t: any) => { if (!t.due_date) return false; const d = new Date(t.due_date); return d >= today && d <= weekLimit; });
    if (q.trim()) {
      const s = q.toLowerCase();
      r = r.filter((t: any) => [t.name, t.slug, t.owner_email, t.owner_name, t.owner_phone].some((v) => (v || "").toString().toLowerCase().includes(s)));
    }
    r = [...r].sort((a: any, b: any) => {
      const av = a[sortKey] ?? ""; const bv = b[sortKey] ?? "";
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return r;
  }, [data, filter, q, sortKey, sortDir, today, weekLimit]);

  const toggleSort = (k: typeof sortKey) => {
    if (sortKey === k) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  const exportCsv = () => {
    downloadCSV(`empresas-${new Date().toISOString().slice(0,10)}.csv`, rows.map((t: any) => ({
      nome: t.name, slug: t.slug, responsavel: t.owner_name ?? "", telefone: t.owner_phone ?? "",
      email: t.owner_email ?? "", status: STATUS_LABEL[t.status] ?? t.status,
      vencimento: fmtDate(t.due_date), ultimo_pagamento: fmtDate(t.last_payment_at),
      criada_em: fmtDate(t.created_at), usuarios: t.users_count, agendamentos: t.bookings_count,
      mensalidade: t.monthly_price,
    })));
  };

  return (
    <>
      <PageHeader
        title="Empresas"
        subtitle={`${data?.tenants?.length ?? 0} empresas cadastradas`}
        right={
          <div className="flex gap-2">
            <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground hover:bg-white/[0.06]">
              <Download size={14} /> Exportar
            </button>
            <Link to="/admin/empresas/nova" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-glow px-3 py-2 text-xs font-semibold text-primary-foreground">
              <Plus size={14} /> Nova empresa
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nome, e-mail, telefone…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
        </div>
        <div className="flex gap-1">
          {[
            { k: "all", label: "Todas" },
            { k: "active", label: "Ativas" },
            { k: "late", label: "Atrasadas" },
            { k: "blocked", label: "Bloqueadas" },
            { k: "due_today", label: "Venc. hoje" },
            { k: "due_week", label: "Venc. semana" },
          ].map((f) => (
            <button key={f.k} onClick={() => setFilter(f.k as any)}
              className={`rounded-lg px-2.5 py-1.5 text-xs ${filter === f.k ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[11px] uppercase tracking-widest text-muted-foreground">
                <Th onClick={() => toggleSort("name")}>Empresa</Th>
                <Th>Responsável</Th>
                <Th>Contato</Th>
                <Th>Status</Th>
                <Th onClick={() => toggleSort("due_date")}>Vencimento</Th>
                <Th>Último pgto</Th>
                <Th>Usuários</Th>
                <Th>Agend.</Th>
                <Th onClick={() => toggleSort("created_at")}>Criada</Th>
                <th />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="px-4 py-6 text-center text-muted-foreground">Carregando…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-6 text-center text-muted-foreground">Nenhuma empresa.</td></tr>
              ) : rows.map((t: any) => (
                <tr key={t.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-3 py-3">
                    <div className="font-medium">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground">/b/{t.slug} · {brl(t.monthly_price)}</div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{t.owner_name ?? "—"}</td>
                  <td className="px-3 py-3 text-muted-foreground">
                    <div>{t.owner_email ?? "—"}</div>
                    <div className="text-[11px]">{t.owner_phone ?? ""}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${STATUS_CLASS[t.status] ?? ""}`}>{STATUS_LABEL[t.status] ?? t.status}</span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{fmtDate(t.due_date)}</td>
                  <td className="px-3 py-3 text-muted-foreground">{fmtDate(t.last_payment_at)}</td>
                  <td className="px-3 py-3 text-muted-foreground">{t.users_count}</td>
                  <td className="px-3 py-3 text-muted-foreground">{t.bookings_count}</td>
                  <td className="px-3 py-3 text-muted-foreground">{fmtDate(t.created_at)}</td>
                  <td className="px-3 py-3">
                    <Link to="/admin/empresas/$id" params={{ id: t.id }} className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-muted-foreground hover:bg-white/[0.06] hover:text-foreground">
                      Detalhes <ChevronRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function Th({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <th className={`px-3 py-2.5 text-left font-normal ${onClick ? "cursor-pointer select-none hover:text-foreground" : ""}`} onClick={onClick}>
      {children}
    </th>
  );
}
