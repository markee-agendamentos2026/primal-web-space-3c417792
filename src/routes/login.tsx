import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ArrowLeft, Mail, Lock, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setCurrentTenantContext, DEFAULT_TENANT_SLUG, resolveTenantSlugFromPath, tenantHref } from "@/lib/tenant";

export const Route = createFileRoute("/login")({
  beforeLoad: () => { throw redirect({ to: "/b/$slug/login", params: { slug: DEFAULT_TENANT_SLUG } }); },
  component: LoginPage,
  head: () => ({ meta: [{ title: "Login — Painel" }] }),
});


export function LoginPage({ expectedSlug }: { expectedSlug?: string } = {}) {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    const { data: auth, error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    if (error || !auth.user) { setLoading(false); setErr("E-mail ou senha incorretos."); return; }

    const userId = auth.user.id;
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("tenant_id, role")
      .eq("user_id", userId)
      .in("role", ["owner", "professional", "admin"]);

      if (rolesError) {
        await supabase.auth.signOut();
        setLoading(false);
        setErr("Não foi possível validar o acesso desta empresa.");
        return;
      }

      const tenantIds = [...new Set((roles ?? []).map((r) => r.tenant_id as string))];
      const { data: tenantRows } = tenantIds.length
        ? await supabase.from("tenants").select("id, slug, name").in("id", tenantIds)
        : { data: [] as { id: string; slug: string; name: string }[] };

      const slugById = new Map((tenantRows ?? []).map((t) => [t.id, t.slug]));
      const tenantRoles = tenantIds
        .map((tenantId) => ({
          tenantId,
          slug: slugById.get(tenantId),
        }))
        .filter((r) => r.slug) as { tenantId: string; slug: string }[];

    // Slug esperado: preferir prop (rota /b/:slug/login) e fallback à URL.
    const urlSlug = typeof window !== "undefined" ? resolveTenantSlugFromPath(window.location.pathname) : null;
    const targetSlug = expectedSlug ?? urlSlug ?? null;

    if (targetSlug) {
      const target = tenantRoles.find((r) => r.slug === targetSlug);
      if (!target) {
        await supabase.auth.signOut();
        setLoading(false);
        setErr("Esta conta não tem permissão de dono/equipe nesta empresa. Use o e-mail cadastrado como owner ou peça acesso no BackOffice.");
        return;
      }
      setCurrentTenantContext(targetSlug, target.tenantId);
      setLoading(false);
      window.location.replace(`/b/${targetSlug}/painel`);
      return;
    }

    // Login legado (sem contexto de URL): vai pro tenant do usuário.
    const first = tenantRoles[0];
    const slug = first?.slug ?? DEFAULT_TENANT_SLUG;
    setCurrentTenantContext(slug, first?.tenantId);
    setLoading(false);
    window.location.replace(`/b/${slug}/painel`);
  };

  return (
    <AppShell>
      <header className="flex items-center justify-between">
        <Link to={tenantHref("/") as any} className="btn-ghost-glass inline-flex h-10 items-center gap-2 px-4 text-sm">
          <ArrowLeft size={16} /> Voltar
        </Link>
        <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Login</span>
        <span className="w-16" />
      </header>

      <form onSubmit={submit} className="mt-12 flex flex-1 flex-col justify-center animate-fade-up">
        <h1 className="font-display text-4xl">Bem-vindo</h1>
        <p className="mt-2 text-sm text-muted-foreground">Acesso restrito para funcionários e proprietários.</p>

        <div className="mt-8 space-y-4">
          <Field icon={<Mail size={18} />} placeholder="E-mail" type="email" value={email} onChange={setEmail} />
          <Field icon={<Lock size={18} />} placeholder="Senha" type="password" value={pwd} onChange={setPwd} />
        </div>

        {err && <p className="mt-4 text-sm text-destructive">{err}</p>}

        <div className="mt-8 space-y-3">
          <PrimaryButton icon={<LogIn size={20} />} disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </PrimaryButton>
          <Link to={tenantHref("/") as any}>
            <PrimaryButton type="button" variant="ghost" icon={<ArrowLeft size={18} />}>Voltar</PrimaryButton>
          </Link>
        </div>
      </form>
    </AppShell>
  );
}

function Field({ icon, value, onChange, placeholder, type = "text" }: {
  icon: React.ReactNode; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
      <input className="input-glass" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} />
    </div>
  );
}
