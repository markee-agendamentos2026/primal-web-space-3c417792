import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminDashboard } from "@/lib/admin.functions";
import { PageHeader, Card } from "@/components/AdminShell";
import { Building2, AlertTriangle, Ban, DollarSign, Users, Sparkles, Calendar, TrendingUp } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboardPage,
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function AdminDashboardPage() {
  const fn = useServerFn(adminDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["admin-dashboard"], queryFn: () => fn() });

  if (isLoading || !data) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  const k = data.kpis;
  const kpis = [
    { label: "Empresas ativas", value: k.active, icon: Building2, accent: "text-emerald-400" },
    { label: "Atrasadas", value: k.late, icon: AlertTriangle, accent: "text-amber-400" },
    { label: "Bloqueadas", value: k.blocked, icon: Ban, accent: "text-rose-400" },
    { label: "Receita do mês", value: brl(k.revenueMonth), icon: DollarSign, accent: "text-primary" },
    { label: "Total empresas", value: k.total, icon: Building2, accent: "text-sky-400" },
    { label: "Novas este mês", value: k.newThisMonth, icon: Sparkles, accent: "text-fuchsia-400" },
    { label: "Agendamentos hoje", value: k.bookingsToday, icon: Calendar, accent: "text-violet-400" },
    { label: "Usuários ativos", value: k.activeUsers, icon: Users, accent: "text-cyan-400" },
  ];

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Visão geral da plataforma" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((kp) => {
          const Icon = kp.icon;
          return (
            <Card key={kp.label} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{kp.label}</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight">{kp.value}</div>
                </div>
                <Icon size={18} className={kp.accent} />
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Faturamento</div>
              <div className="text-sm font-semibold">Últimos 6 meses</div>
            </div>
            <TrendingUp size={16} className="text-primary" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.charts.receita}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.14 65)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.78 0.14 65)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="mes" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickFormatter={(v) => brl(v as number)} />
                <Tooltip contentStyle={{ background: "rgba(20,20,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} formatter={(v: any) => brl(Number(v))} />
                <Area type="monotone" dataKey="receita" stroke="oklch(0.78 0.14 65)" fill="url(#rev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-3">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Crescimento</div>
            <div className="text-sm font-semibold">Novas empresas</div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.charts.empresas}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="mes" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "rgba(20,20,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                <Bar dataKey="total" fill="oklch(0.78 0.14 65)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-3">
          <div className="mb-3">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Atividade</div>
            <div className="text-sm font-semibold">Agendamentos por mês</div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.charts.agenda}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="mes" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "rgba(20,20,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                <Line type="monotone" dataKey="agendamentos" stroke="oklch(0.86 0.16 75)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </>
  );
}
