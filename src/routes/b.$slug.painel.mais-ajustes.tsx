import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import type { Availability, Professional } from "@/lib/store";
import { fetchAvailability } from "@/lib/store";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ArrowLeft, Save, Plus, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import {
  createProfessional,
  updateProfessional,
  deleteProfessional,
} from "@/lib/professionals.functions";
import { getCurrentTenantId, tenantHref} from "@/lib/tenant";

export const Route = createFileRoute("/b/$slug/painel/mais-ajustes")({
  component: MaisAjustes,
});

type ProForm = {
  id?: string;
  name: string;
  role: string;
  email: string;
  password: string;
  active: boolean;
  photo_url: string | null;
};


function MaisAjustes() {
  const [av, setAv] = useState<Availability | null>(null);
  const [pros, setPros] = useState<Professional[]>([]);
  const [editing, setEditing] = useState<ProForm | null>(null);
  const [savingBiz, setSavingBiz] = useState(false);
  const [savingPro, setSavingPro] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPro, setUploadingPro] = useState(false);


  const createFn = useServerFn(createProfessional);
  const updateFn = useServerFn(updateProfessional);
  const deleteFn = useServerFn(deleteProfessional);

  // Ao abrir o modal: trava o scroll da página (html + body) sem deslocar o
  // layout. Evitamos `position: fixed` no body porque ele tira a página do
  // fluxo e quebra o scroll interno do próprio modal em alguns browsers
  // mobile, deixando o conteúdo "preso" fora da viewport.
  useEffect(() => {
    if (!editing) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [editing]);

  const getLogoPath = (url: string | null) => {
    if (!url) return null;
    const marker = "/storage/v1/object/public/service-photos/";
    const i = url.indexOf(marker);
    return i === -1 ? null : url.slice(i + marker.length);
  };

  const onPickProPhoto = async (file: File) => {
    if (!editing) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem deve ter até 5MB."); return; }
    setUploadingPro(true);
    try {
      const prev = getLogoPath(editing.photo_url);
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `professionals/pro-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("service-photos").upload(path, file, { upsert: true, contentType: file.type });
      if (up.error) throw up.error;
      const { data: pub } = supabase.storage.from("service-photos").getPublicUrl(path);
      if (prev && prev !== path) await supabase.storage.from("service-photos").remove([prev]);
      setEditing({ ...editing, photo_url: pub.publicUrl });
      toast.success("Foto atualizada");
    } catch (e: any) {
      toast.error(e?.message || "Falha no upload");
    } finally {
      setUploadingPro(false);
    }
  };

  const removeProPhoto = async () => {
    if (!editing) return;
    const prev = getLogoPath(editing.photo_url);
    if (prev) await supabase.storage.from("service-photos").remove([prev]);
    setEditing({ ...editing, photo_url: null });
  };


  const onPickLogo = async (file: File) => {
    if (!av) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem deve ter até 5MB."); return; }
    setUploadingLogo(true);
    try {
      const prev = getLogoPath(av.logo_url);
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `business/logo-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("service-photos").upload(path, file, { upsert: true, contentType: file.type });
      if (up.error) throw up.error;
      const { data: pub } = supabase.storage.from("service-photos").getPublicUrl(path);
      const { error } = await supabase.from("availability").update({ logo_url: pub.publicUrl }).eq("tenant_id", getCurrentTenantId());
      if (error) throw error;
      if (prev && prev !== path) await supabase.storage.from("service-photos").remove([prev]);
      setAv({ ...av, logo_url: pub.publicUrl });
      toast.success("Foto atualizada");
    } catch (e: any) {
      toast.error(e?.message || "Falha no upload");
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = async () => {
    if (!av) return;
    const prev = getLogoPath(av.logo_url);
    const { error } = await supabase.from("availability").update({ logo_url: null }).eq("tenant_id", getCurrentTenantId());
    if (error) { toast.error(error.message); return; }
    if (prev) await supabase.storage.from("service-photos").remove([prev]);
    setAv({ ...av, logo_url: null });
    toast.success("Foto removida");
  };

  const load = async () => {
    setAv(await fetchAvailability());
    const { data } = await supabase.from("professionals").select("*").eq("tenant_id", getCurrentTenantId()).order("sort_order");
    setPros((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const saveBusiness = async () => {
    if (!av) return;
    if (!av.business_name?.trim()) {
      toast.error("Informe o nome do estabelecimento.");
      return;
    }
    setSavingBiz(true);
    const { error } = await supabase.from("availability").update({
      business_name: av.business_name?.trim() || null,
      address: av.address?.trim() || null,
      whatsapp_url: av.whatsapp_url?.trim() || null,
      instagram_url: av.instagram_url?.trim() || null,
      facebook_url: av.facebook_url?.trim() || null,
      maps_url: av.maps_url?.trim() || null,
    }).eq("tenant_id", getCurrentTenantId());
    setSavingBiz(false);
    if (error) toast.error(error.message);
    else toast.success("Estabelecimento salvo");
  };

  const submitPro = async () => {
    if (!editing) return;
    if (!editing.name.trim()) return toast.error("Informe o nome.");
    if (!editing.id) {
      // Criação exige e-mail e senha.
      if (!editing.email.trim()) return toast.error("Informe o e-mail.");
      if (editing.password.length < 6)
        return toast.error("Senha precisa de pelo menos 6 caracteres.");
    } else if (editing.password && editing.password.length < 6) {
      // Edição: senha é opcional, mas se preencher tem que ser válida.
      return toast.error("Nova senha precisa de pelo menos 6 caracteres.");
    }
    setSavingPro(true);
    try {
      if (editing.id) {
        await updateFn({
          data: {
            id: editing.id,
            name: editing.name.trim(),
            role: editing.role.trim() || null,
            active: editing.active,
            photo_url: editing.photo_url,
            ...(editing.email.trim() ? { email: editing.email.trim() } : {}),
            ...(editing.password ? { password: editing.password } : {}),
          },
        });
      } else {
        await createFn({
          data: {
            name: editing.name.trim(),
            role: editing.role.trim() || null,
            email: editing.email.trim(),
            password: editing.password,
            active: editing.active,
            photo_url: editing.photo_url,
            tenant_id: getCurrentTenantId(),
          },
        });
      }

      toast.success("Profissional salvo");
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao salvar profissional.");
    } finally {
      setSavingPro(false);
    }
  };

  const removePro = async (id: string) => {
    if (!confirm("Excluir este profissional e sua conta de acesso?")) return;
    try {
      await deleteFn({ data: { id } });
      toast.success("Profissional removido");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao remover.");
    }
  };

  if (!av) return <div className="glass p-8 text-center text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-6">
      <Link to={tenantHref("/painel") as any} className="btn-ghost-glass inline-flex h-9 items-center gap-2 px-3 text-xs">
        <ArrowLeft size={14} /> Voltar
      </Link>
      <h1 className="font-display text-3xl">Demais ajustes</h1>

      {/* PROFISSIONAIS */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Profissionais</h2>
          <button
            onClick={() => setEditing({ name: "", role: "", email: "", password: "", active: true, photo_url: null })}
            className="btn-primary inline-flex h-9 items-center gap-1.5 px-3 text-xs"
          >
            <Plus size={14} /> Novo
          </button>
        </div>
        <div className="space-y-2">
          {pros.length === 0 && (
            <div className="glass p-4 text-center text-xs text-muted-foreground">Nenhum profissional cadastrado.</div>
          )}
          {pros.map((p) => (
            <div key={p.id} className={`glass flex items-center justify-between p-3 ${!p.active ? "opacity-60" : ""}`}>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{p.name}</div>
                <div className="truncate text-xs text-muted-foreground">{p.role || "—"}</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditing({
                    id: p.id, name: p.name, role: p.role || "",
                    email: "", password: "", active: p.active, photo_url: p.photo_url ?? null,
                  })}

                  className="btn-ghost-glass inline-flex h-8 w-8 items-center justify-center"
                  aria-label="Editar"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => removePro(p.id)}
                  className="btn-ghost-glass inline-flex h-8 w-8 items-center justify-center text-destructive"
                  aria-label="Excluir"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ESTABELECIMENTO */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Estabelecimento</h2>
        <div className="space-y-3">
          <TextField label="Nome" value={av.business_name || ""} onChange={(v) => setAv({ ...av, business_name: v })} />

          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Foto / logo do estabelecimento</div>
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/15 bg-primary/15 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]">
                {av.logo_url ? (
                  <img
                    src={av.logo_url}
                    alt="Logo"
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 block h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl">💈</div>
                )}
              </div>
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <label className="btn-ghost-glass inline-flex h-10 cursor-pointer items-center gap-2 px-3 text-xs">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickLogo(f); e.target.value = ""; }}
                  />
                  {uploadingLogo ? "Enviando…" : av.logo_url ? "Trocar foto" : "Adicionar foto"}
                </label>
                {av.logo_url && (
                  <button type="button" onClick={removeLogo} className="btn-ghost-glass inline-flex h-10 items-center px-3 text-xs">
                    Remover
                  </button>
                )}
              </div>
            </div>
          </div>
          <TextField label="Endereço" value={av.address || ""} onChange={(v) => setAv({ ...av, address: v })} />
          <TextField label="WhatsApp (link)" value={av.whatsapp_url || ""} onChange={(v) => setAv({ ...av, whatsapp_url: v })} placeholder="https://wa.me/55..." />
          <TextField label="Instagram" value={av.instagram_url || ""} onChange={(v) => setAv({ ...av, instagram_url: v })} placeholder="https://instagram.com/..." />
          <TextField label="Facebook" value={av.facebook_url || ""} onChange={(v) => setAv({ ...av, facebook_url: v })} placeholder="https://facebook.com/..." />
          <TextField label="Google Maps" value={av.maps_url || ""} onChange={(v) => setAv({ ...av, maps_url: v })} placeholder="https://maps.google.com/..." />
          <PrimaryButton onClick={saveBusiness} icon={<Save size={18} />} disabled={savingBiz}>
            {savingBiz ? "Salvando…" : "Salvar estabelecimento"}
          </PrimaryButton>
        </div>
      </section>

      {/* MODAL PRO — renderizado via portal no body para evitar conflito com
          transforms/overflow dos ancestrais, sempre centralizado e com scroll
          interno próprio (funciona em mobile e desktop). */}
      {editing && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overscroll-contain bg-black/60 p-3 backdrop-blur-sm sm:p-4"
          onClick={() => setEditing(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="glass-strong flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h3 className="font-display text-xl">{editing.id ? "Editar profissional" : "Novo profissional"}</h3>
              <button onClick={() => setEditing(null)} className="btn-ghost-glass inline-flex h-8 w-8 items-center justify-center"><X size={14} /></button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-5 [-webkit-overflow-scrolling:touch]">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/15 bg-primary/15 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]">
                  {editing.photo_url ? (
                    <img
                      src={editing.photo_url}
                      alt={editing.name || "Foto"}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 block h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-bold text-primary">
                      {(editing.name || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <label className="btn-ghost-glass inline-flex h-10 cursor-pointer items-center gap-2 px-3 text-xs">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickProPhoto(f); e.target.value = ""; }}
                    />
                    {uploadingPro ? "Enviando…" : editing.photo_url ? "Trocar foto" : "Adicionar foto"}
                  </label>
                  {editing.photo_url && (
                    <button type="button" onClick={removeProPhoto} className="btn-ghost-glass inline-flex h-10 items-center px-3 text-xs">
                      Remover
                    </button>
                  )}
                </div>
              </div>
              <TextField label="Nome" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
              <TextField label="Função" value={editing.role} onChange={(v) => setEditing({ ...editing, role: v })} placeholder="Ex.: Barbeiro" />
              <TextField label="E-mail" value={editing.email} onChange={(v) => setEditing({ ...editing, email: v })} placeholder={editing.id ? "Novo e-mail (opcional)" : "email@exemplo.com"} type="email" />
              <TextField
                label={editing.id ? "Nova senha (opcional)" : "Senha"}
                value={editing.password}
                onChange={(v) => setEditing({ ...editing, password: v })}
                placeholder="Mínimo 6 caracteres"
                type="password"
              />
              <label className="glass flex items-center justify-between p-3">
                <span className="text-sm">Ativo</span>
                <button
                  onClick={() => setEditing({ ...editing, active: !editing.active })}
                  className={`relative h-6 w-11 rounded-full transition ${editing.active ? "bg-primary" : "bg-white/10"}`}
                  aria-label="Alternar ativo"
                >
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${editing.active ? "left-6" : "left-1"}`} />
                </button>
              </label>
            </div>
            <div className="border-t border-white/10 p-5">
              <PrimaryButton onClick={submitPro} icon={<Save size={18} />} disabled={savingPro}>
                {savingPro ? "Salvando…" : "Salvar"}
              </PrimaryButton>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <input
        type={type}
        className="input-glass-sm"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
