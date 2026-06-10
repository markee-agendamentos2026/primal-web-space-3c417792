import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { cacheTenantId } from "@/lib/tenant";

type State = "loading" | "ok" | "missing";

/** Garante tenant_id em cache a partir do slug da URL antes de renderizar filhos. */
export function TenantSlugGate({ slug, children }: { slug: string; children: ReactNode }) {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    (async () => {
      const { data: tenant, error } = await supabase
        .from("tenants")
        .select("id, slug, name")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (error || !tenant) {
        setState("missing");
        return;
      }
      cacheTenantId(tenant.slug, tenant.id, tenant.name);
      setState("ok");
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state === "loading") {
    return (
      <div className="grid min-h-[40vh] place-items-center text-sm text-muted-foreground">
        Carregando empresa…
      </div>
    );
  }

  if (state === "missing") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-lg font-semibold text-foreground">Empresa não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O slug <code className="rounded bg-white/10 px-1">{slug}</code> não existe neste ambiente.
        </p>
        <Link to="/" className="btn-ghost-glass mt-6 inline-flex h-10 items-center px-4 text-sm">
          Voltar
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
