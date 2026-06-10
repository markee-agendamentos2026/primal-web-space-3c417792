import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, Mail, Lock, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
  head: () => ({ meta: [{ title: "Admin · Login — Markee" }] }),
});

function AdminLoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // If already signed in as admin, jump to /admin
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const { data: ok } = await supabase.rpc("is_admin", { _user_id: data.session.user.id });
      if (ok) nav({ to: "/admin", replace: true });
    })();
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    // Garante sessão limpa — evita estados intermediários de cache/token
    // de uma sessão anterior (ex.: dono de tenant logado em outra aba)
    // que faziam o whoami falhar logo após o login e cair na tela de erro.
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    const { data: auth, error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    if (error || !auth.user) { setLoading(false); setErr("Credenciais inválidas."); return; }
    const { data: ok } = await supabase.rpc("is_admin", { _user_id: auth.user.id });
    if (!ok) {
      await supabase.auth.signOut();
      setLoading(false);
      setErr("Esta conta não tem permissão administrativa.");
      return;
    }
    // Hard navigation para /admin — garante que o token recém-emitido
    // seja anexado em todas as chamadas do BackOffice sem corrida com
    // o router/SSR cache.
    if (typeof window !== "undefined") {
      window.location.assign("/admin");
      return;
    }
    setLoading(false);
    nav({ to: "/admin", replace: true });
  };

  return (
    <div className="grid min-h-screen place-items-center bg-neutral-950 px-4 text-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
            <Shield size={20} />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight">Markee BackOffice</h1>
            <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted-foreground">Acesso restrito</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <Field icon={<Mail size={16} />} placeholder="E-mail" type="email" value={email} onChange={setEmail} />
          <Field icon={<Lock size={16} />} placeholder="Senha" type="password" value={pwd} onChange={setPwd} />
          {err && <p className="text-sm text-destructive">{err}</p>}
          <button
            type="submit" disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-glow py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <LogIn size={16} /> {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="mt-6 text-center text-[11px] uppercase tracking-widest text-muted-foreground">Markee · v1.0</p>
      </div>
    </div>
  );
}

function Field({ icon, value, onChange, placeholder, type = "text" }:
  { icon: React.ReactNode; value: string; onChange: (v: string) => void; placeholder: string; type?: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
      />
    </div>
  );
}
