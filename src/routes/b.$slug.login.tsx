import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LoginPage } from "./login";
import { cacheTenantId } from "@/lib/tenant";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/b/$slug/login")({
  component: TenantLogin,
  head: () => ({ meta: [{ title: "Login" }] }),
});

function TenantLogin() {
  const { slug } = Route.useParams();
  const [tenantOk, setTenantOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, slug, name")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (!tenant) {
        setTenantOk(false);
        return;
      }
      cacheTenantId(tenant.slug, tenant.id, tenant.name);
      setTenantOk(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("tenant_id")
        .eq("user_id", user.id)
        .eq("tenant_id", tenant.id)
        .in("role", ["owner", "professional", "admin"])
        .limit(1);
      if (!roles?.length) {
        await supabase.auth.signOut();
        return;
      }
      window.location.replace(`/b/${slug}/painel`);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (tenantOk === false) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-lg font-semibold">Empresa não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O slug <code className="rounded bg-white/10 px-1">{slug}</code> não existe neste banco.
        </p>
        <Link to="/b/dom-amorim/login" className="btn-ghost-glass mt-6 inline-flex h-10 items-center px-4 text-sm">
          Ir para Dom Amorim
        </Link>
      </div>
    );
  }

  if (tenantOk === null) {
    return <div className="grid min-h-[40vh] place-items-center text-sm text-muted-foreground">Carregando…</div>;
  }

  return <LoginPage expectedSlug={slug} />;
}
