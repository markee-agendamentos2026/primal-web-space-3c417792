import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/AdminShell";
import { adminWhoami } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  head: () => ({ meta: [{ title: "BackOffice — Markee" }] }),
});

function AdminLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const whoami = useServerFn(adminWhoami);
  const [state, setState] = useState<"checking" | "ok" | "deny">("checking");

  const isLoginRoute = location.pathname.replace(/\/+$/, "") === "/admin/login";

  useEffect(() => {
    if (isLoginRoute) { setState("checking"); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { nav({ to: "/admin/login", replace: true }); return; }
      // Tenta whoami; se falhar (token ainda não anexado, rede), aguarda
      // e tenta de novo antes de mandar para /admin/login. Isso evita a
      // tela de erro genérica após um login válido.
      const tryOnce = async () => {
        try { return await whoami(); } catch { return null; }
      };
      let r = await tryOnce();
      if (!r) { await new Promise((res) => setTimeout(res, 400)); r = await tryOnce(); }
      if (cancelled) return;
      if (!r || !r.isAdmin) { nav({ to: "/admin/login", replace: true }); return; }
      setState("ok");
    })();
    return () => { cancelled = true; };
  }, [nav, whoami, isLoginRoute]);

  // Login route renders without the admin shell/guard (avoids loop)
  if (isLoginRoute) return <Outlet />;

  if (state !== "ok") {
    return (
      <div className="grid min-h-screen place-items-center bg-neutral-950 text-muted-foreground">
        <div className="text-sm">Verificando acesso administrativo…</div>
      </div>
    );
  }

  return <AdminShell><Outlet /></AdminShell>;
}
