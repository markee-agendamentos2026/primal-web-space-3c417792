import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { adminCreateTenant } from "@/lib/admin.functions";
import { PageHeader, Card } from "@/components/AdminShell";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/empresas/nova")({ component: NewTenantPage });

const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);

function NewTenantPage() {
  const nav = useNavigate();
  const fn = useServerFn(adminCreateTenant);
  const [f, setF] = useState({ name: "", slug: "", owner_name: "", owner_email: "", owner_phone: "", owner_password: "", monthly_price: "99" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ url: string; owner_email: string; temp_password: string; slug: string } | null>(null);

  const submit = async () => {
    if (!f.name || !f.slug || !f.owner_email || !f.owner_name || !f.owner_phone || !f.owner_password) { toast.error("Preencha todos os campos"); return; }
    if (f.owner_password.length < 6) { toast.error("A senha deve ter pelo menos 6 caracteres"); return; }
    setLoading(true);
    const slug = slugify(f.slug);
    if (!slug || slug.length < 2) { toast.error("Informe um slug válido (ex.: minha-barbearia)"); return; }
    try {
      const r = await fn({ data: { ...f, slug, monthly_price: Number(f.monthly_price) } });
      setResult(r);
      toast.success("Empresa criada");
    } catch (e: any) {
      const msg = e?.message ?? "Erro ao criar";
      toast.error(
        msg === "slug_in_use" ? "Esse slug já está em uso"
        : msg === "email_in_use" ? "Esse e-mail já está cadastrado"
        : /service_role|Invalid API key|Chave inválida/i.test(msg) ? msg
        : msg
      );
    } finally { setLoading(false); }
  };

  if (result) {
    return (
      <>
        <PageHeader title="Empresa criada" subtitle="Compartilhe as credenciais com o responsável" />
        <Card className="p-6 space-y-4">
          <Row k="URL de acesso" v={`${typeof window !== "undefined" ? window.location.origin : ""}${result.url}`} />
          <Row k="E-mail" v={result.owner_email} />
          <Row k="Senha temporária" v={result.temp_password} mono />
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
            Empresa criada com slug <strong>{result.slug}</strong>. Adicione as cores em <code>src/lib/theme.ts</code> (bloco &quot;{result.slug}&quot;) se quiser personalizar o tema.
          </div>
          <div className="flex gap-2 pt-2">
            <Link to="/admin/empresas" className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-muted-foreground hover:bg-white/[0.06]">Voltar à lista</Link>
            <button onClick={() => { setResult(null); setF({ name: "", slug: "", owner_name: "", owner_email: "", owner_phone: "", owner_password: "", monthly_price: "99" }); }} className="rounded-xl bg-gradient-to-r from-primary to-primary-glow px-4 py-2 text-sm font-semibold text-primary-foreground">Criar outra</button>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <button onClick={() => nav({ to: "/admin/empresas" })} className="mb-4 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Empresas
      </button>
      <PageHeader title="Nova empresa" subtitle="Cria a empresa e o usuário dono com a senha que você definir." />
      <Card className="p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nome da empresa" value={f.name} onChange={(v) => setF({ ...f, name: v })} />
          <div>
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Slug (URL)</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={f.slug}
                onChange={(e) => setF({ ...f, slug: slugify(e.target.value) })}
                placeholder="ex.: barbearia-centro"
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                disabled={!f.name.trim()}
                onClick={() => setF({ ...f, slug: slugify(f.name) })}
                className="shrink-0 rounded-xl border border-white/10 px-3 py-2 text-xs text-muted-foreground hover:bg-white/[0.06]"
              >
                Gerar do nome
              </button>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              O slug que você digitar será usado em <code>/b/{f.slug || "seu-slug"}</code> (não há valor padrão).
            </p>
          </div>
          <Field label="Nome do responsável" value={f.owner_name} onChange={(v) => setF({ ...f, owner_name: v })} />
          <Field label="E-mail do responsável" type="email" value={f.owner_email} onChange={(v) => setF({ ...f, owner_email: v })} />
          <Field label="Telefone (WhatsApp)" value={f.owner_phone} onChange={(v) => setF({ ...f, owner_phone: v })} />
          <Field label="Senha de acesso do dono" type="text" value={f.owner_password} onChange={(v) => setF({ ...f, owner_password: v })} hint="mínimo 6 caracteres — será usada no login" />
          <Field label="Mensalidade (R$)" type="number" value={f.monthly_price} onChange={(v) => setF({ ...f, monthly_price: v })} />
        </div>
        <button onClick={submit} disabled={loading} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-glow px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          <Plus size={14} /> {loading ? "Criando…" : "Criar empresa"}
        </button>
      </Card>
    </>
  );
}

function Field({ label, value, onChange, type = "text", hint }:
  { label: string; value: string; onChange: (v: string) => void; type?: string; hint?: string }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm focus:border-primary focus:outline-none" />
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{k}</div>
      <div className={`mt-1 break-all rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm ${mono ? "font-mono" : ""}`}>{v}</div>
    </div>
  );
}
