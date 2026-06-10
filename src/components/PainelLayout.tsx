import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth, signOut } from "@/hooks/use-auth";
import { useTenantBootstrap } from "@/hooks/use-tenant-bootstrap";
import {
  CalendarDays,
  Scissors,
  Users,
  Settings,
  LogOut,
  Menu,
  Star,
  Send,
  CreditCard,
  SlidersHorizontal,
  Palette,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { painelPath } from "@/lib/tenant-routes";
import { cacheTenantId, getCurrentTenantId } from "@/lib/tenant";
import { toast } from "sonner";
import { FinancialCountdownDialog, type FinancialStatus } from "@/components/FinancialCountdownDialog";

type Props = { slug: string };

export function PainelLayout({ slug }: Props) {
  const bootstrapReady = useTenantBootstrap(slug);
  const nav = useNavigate();
  const loc = useLocation();
  const { user, loading } = useAuth();
  const [tenantOk, setTenantOk] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fin, setFin] = useState<FinancialStatus | null>(null);

  const base = painelPath("", slug);
  const paymentsHref = painelPath("/pagamentos", slug);
  const isBlocked = fin?.effective_status === "blocked";

  useEffect(() => {
    if (!loading && !user) {
      nav({ to: "/b/$slug/login", params: { slug }, replace: true });
    }
  }, [user, loading, nav, slug]);

  useEffect(() => {
    if (!user) {
      setTenantOk(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, slug, name")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled || !tenant) return;

      const { data: roles, error: roleErr } = await supabase
        .from("user_roles")
        .select("tenant_id")
        .eq("user_id", user.id)
        .eq("tenant_id", tenant.id)
        .in("role", ["owner", "professional", "admin"])
        .limit(1);
      if (cancelled) return;
      if (roleErr || !roles?.length) {
        toast.error(`Este usuário não pertence a ${tenant.name}.`);
        nav({ to: "/b/$slug/login", params: { slug }, replace: true });
        return;
      }
      cacheTenantId(tenant.slug, tenant.id, tenant.name);
      setTenantOk(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, slug, nav]);

  useEffect(() => {
    if (!tenantOk) return;
    let cancelled = false;
    const load = async () => {
      const id = getCurrentTenantId();
      if (!id || cancelled) return;
      const { data } = await supabase.rpc("tenant_financial_status", { _tenant_id: id });
      if (cancelled) return;
      setFin((((data as unknown[] | null) ?? [])[0] as FinancialStatus) ?? null);
    };
    load();
    const t = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [tenantOk, slug]);

  useEffect(() => {
    if (!isBlocked) return;
    if (loc.pathname !== paymentsHref) {
      nav({ to: "/b/$slug/painel/pagamentos", params: { slug }, replace: true });
    }
  }, [isBlocked, loc.pathname, paymentsHref, nav, slug]);

  const tabs: { to: string; label: string; icon: typeof CalendarDays; exact?: boolean }[] = [
    { to: base, label: "Agenda", icon: CalendarDays, exact: true },
    { to: painelPath("/clientes", slug), label: "Clientes", icon: Users },
    { to: painelPath("/servicos", slug), label: "Serviços", icon: Scissors },
    { to: painelPath("/disponibilidade", slug), label: "Disponib.", icon: Settings },
    { to: painelPath("/mais-ajustes", slug), label: "Ajustes", icon: SlidersHorizontal },
    { to: painelPath("/fluxo", slug), label: "Fluxo e Layout", icon: Palette },
  ];

  const pathActive = (to: string, exact?: boolean) => {
    const p = loc.pathname.replace(/\/+$/, "") || "/";
    const t = to.replace(/\/+$/, "") || "/";
    return exact ? p === t : p === t || p.startsWith(`${t}/`);
  };

  return (
    <AppShell allowBlockedAccess={isBlocked && loc.pathname === paymentsHref}>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger
          aria-label="Abrir menu"
          className="fixed top-4 left-4 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full shadow-lg shadow-black/40 bg-neutral-950/70 backdrop-blur-xl border border-white/10 text-foreground"
        >
          <Menu size={18} />
        </SheetTrigger>
        <SheetContent side="left" className="h-dvh overflow-y-auto bg-neutral-950/95 backdrop-blur-xl border-r border-white/10 text-foreground">
          <div className="min-h-full space-y-2 py-6 pr-1">
            {!isBlocked &&
              tabs.map((t) => {
                const active = pathActive(t.to, t.exact);
                const Icon = t.icon;
                return (
                  <Link
                    key={t.to}
                    to={t.to as "/"}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 p-4 rounded-2xl ${active ? "btn-primary" : "glass"}`}
                  >
                    <Icon size={18} className={active ? "" : "text-primary"} /> {t.label}
                  </Link>
                );
              })}
            {!isBlocked && <div className="h-px bg-white/10 my-2" />}
            <Link
              to={paymentsHref as "/"}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 p-4 rounded-2xl ${pathActive(paymentsHref) ? "btn-primary" : "glass"}`}
            >
              <CreditCard size={18} className={pathActive(paymentsHref) ? "" : "text-primary"} /> Pagamentos
            </Link>
            {!isBlocked && (
              <>
                <Link
                  to={painelPath("/avaliacoes", slug) as "/"}
                  onClick={() => setMenuOpen(false)}
                  className="glass flex items-center gap-3 p-4"
                >
                  <Star size={18} className="text-primary" /> Avaliações
                </Link>
                <Link
                  to={painelPath("/recorrencia", slug) as "/"}
                  onClick={() => setMenuOpen(false)}
                  className="glass flex items-center gap-3 p-4"
                >
                  <Send size={18} className="text-primary" /> Recorrência
                </Link>
              </>
            )}
            <button
              onClick={async () => {
                await signOut();
                window.location.href = `/b/${slug}`;
              }}
              className="glass flex w-full items-center gap-3 p-4 text-left"
            >
              <LogOut size={18} className="text-destructive" /> Sair
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="pt-16 animate-fade-up">
        {bootstrapReady && tenantOk ? (
          <Outlet />
        ) : (
          <div className="grid min-h-[40vh] place-items-center text-sm text-muted-foreground">
            Carregando painel…
          </div>
        )}
      </div>

      {tenantOk && fin ? (
        <FinancialCountdownDialog fin={fin} paymentsHref={paymentsHref} />
      ) : null}
    </AppShell>
  );
}
