import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Building2, CreditCard, FileClock, LogOut, Plus, Shield, Settings, Repeat, Sparkles,
} from "lucide-react";
import { signOut } from "@/hooks/use-auth";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/empresas", label: "Empresas", icon: Building2 },
  { to: "/admin/markee-leads", label: "Chamados Markee", icon: Sparkles },
  { to: "/admin/pagamentos", label: "Pagamentos", icon: CreditCard },
  { to: "/admin/recorrencia", label: "Recorrência", icon: Repeat },
  { to: "/admin/auditoria", label: "Auditoria", icon: FileClock },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-neutral-950 text-foreground">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-white/5 bg-neutral-950/80 backdrop-blur-xl md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
            <Shield size={16} />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">Markee Admin</div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">BackOffice</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? loc.pathname === item.to : loc.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <Icon size={16} /> {item.label}
              </Link>
            );
          })}
          <Link
            to="/admin/empresas/nova"
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-glow px-3 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-95"
          >
            <Plus size={16} /> Nova empresa
          </Link>
        </nav>
        <button
          onClick={async () => { await signOut(); nav({ to: "/admin/login" }); }}
          className="m-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
        >
          <LogOut size={16} /> Sair
        </button>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/5 bg-neutral-950/80 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary-glow text-primary-foreground"><Shield size={14} /></div>
          <span className="text-sm font-semibold">Markee Admin</span>
        </div>
        <button onClick={async () => { await signOut(); nav({ to: "/admin/login" }); }} className="text-xs text-muted-foreground">Sair</button>
      </header>
      <nav className="sticky top-[49px] z-30 flex gap-1 overflow-x-auto border-b border-white/5 bg-neutral-950/80 px-3 py-2 backdrop-blur-xl scrollbar-none md:hidden">
        {NAV.map((item) => {
          const active = item.exact ? loc.pathname === item.to : loc.pathname.startsWith(item.to);
          return (
            <Link key={item.to} to={item.to} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs ${active ? "bg-white/10 text-foreground" : "text-muted-foreground"}`}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="md:pl-60">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10 animate-fade-up">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm ${className}`}>{children}</div>;
}
