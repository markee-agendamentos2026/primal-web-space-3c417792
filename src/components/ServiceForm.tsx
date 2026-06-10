import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PrimaryButton } from "@/components/PrimaryButton";
import { getCurrentTenantId, getCurrentTenantSlug } from "@/lib/tenant";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

type FormState = {
  name: string; description: string; emoji: string; duration_min: number; price_cents: number;
  active: boolean; photo_url: string | null;
  promo_pct: number | ""; promo_starts_at: string; promo_ends_at: string;
};

const DURATIONS = [15, 30, 45, 60, 90, 120];

function getStoragePath(url: string | null) {
  if (!url) return null;
  const marker = "/storage/v1/object/public/service-photos/";
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ServiceForm({ id }: { id?: string }) {
  const nav = useNavigate();
  const { slug: slugParam } = useParams({ strict: false }) as { slug?: string };
  const slug = slugParam ?? getCurrentTenantSlug();
  const servicosTo = "/b/$slug/painel/servicos" as const;
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const [s, setS] = useState<FormState>({
    name: "", description: "", emoji: "✂️", duration_min: 30, price_cents: 5000, active: true, photo_url: null,
    promo_pct: "", promo_starts_at: "", promo_ends_at: "",
  });

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase.from("services").select("*").eq("id", id).eq("tenant_id", getCurrentTenantId()).maybeSingle().then(({ data, error }) => {
      if (error) {
        toast.error("Não foi possível carregar o serviço.");
        nav({ to: servicosTo, params: { slug } });
        return;
      }
      if (!data) {
        toast.error("Serviço não encontrado.");
        nav({ to: servicosTo, params: { slug } });
        return;
      }
      setS({
        name: data.name,
        description: (data as any).description ?? "",
        emoji: data.emoji ?? "✂️",
        duration_min: data.duration_min,
        price_cents: Math.round(Number(data.price) * 100),
        active: data.active,
        photo_url: data.photo_url ?? null,
        promo_pct: data.promo_pct ?? "",
        promo_starts_at: data.promo_starts_at?.slice(0, 16) ?? "",
        promo_ends_at: data.promo_ends_at?.slice(0, 16) ?? "",
      });
      setLoading(false);
    });
  }, [id]);

  const canSave = useMemo(() => {
    return !!s.name.trim() && s.price_cents > 0 && !!s.duration_min && s.duration_min > 0 && !saving && !uploading;
  }, [s.name, s.price_cents, s.duration_min, saving, uploading]);

  const onPickPhoto = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem deve ter até 5MB."); return; }
    setUploading(true);
    try {
      const previousPath = getStoragePath(s.photo_url);
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${id ?? "new"}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("service-photos").upload(path, file, { upsert: true, contentType: file.type });
      if (up.error) throw up.error;
      if (previousPath && previousPath !== path) {
        await supabase.storage.from("service-photos").remove([previousPath]);
      }
      const { data: pub } = supabase.storage.from("service-photos").getPublicUrl(path);
      setS((prev) => ({ ...prev, photo_url: pub.publicUrl }));
      toast.success("Foto carregada");
    } catch (e: any) {
      toast.error(e.message || "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!s.name.trim()) { toast.error("Informe o nome do serviço."); return; }
    if (s.price_cents <= 0) { toast.error("Informe o valor do serviço."); return; }
    if (!s.duration_min || s.duration_min <= 0) { toast.error("Duração inválida."); return; }
    if (s.promo_pct !== "" && (Number(s.promo_pct) < 0 || Number(s.promo_pct) > 100)) { toast.error("Desconto inválido."); return; }
    if (s.promo_starts_at && s.promo_ends_at && new Date(s.promo_starts_at) >= new Date(s.promo_ends_at)) { toast.error("Período da promoção inválido."); return; }
    setSaving(true);
    const payload: any = {
      name: s.name.trim(),
      description: s.description.trim() || null,
      emoji: s.emoji,
      duration_min: s.duration_min,
      price: s.price_cents / 100,
      active: s.active,
      photo_url: s.photo_url,
      promo_pct: s.promo_pct === "" ? null : Number(s.promo_pct),
      promo_starts_at: s.promo_starts_at || null,
      promo_ends_at: s.promo_ends_at || null,
    };
    const r = id
      ? await supabase.from("services").update(payload).eq("id", id).eq("tenant_id", getCurrentTenantId())
      : await supabase.from("services").insert({ ...payload, tenant_id: getCurrentTenantId() });
    setSaving(false);
    if (r.error) { toast.error(r.error.message); return; }
    toast.success(id ? "Serviço atualizado" : "Serviço criado");
    nav({ to: servicosTo, params: { slug } });
  };

  const removePhoto = async () => {
    const previousPath = getStoragePath(s.photo_url);
    if (previousPath) {
      await supabase.storage.from("service-photos").remove([previousPath]);
    }
    setS({ ...s, photo_url: null });
  };

  return (
    <div>
      <Link to={servicosTo} params={{ slug }} className="btn-ghost-glass inline-flex h-10 items-center gap-2 px-4 text-sm">
        <ArrowLeft size={16} /> Voltar
      </Link>
      <h1 className="mt-4 font-display text-3xl">{id ? "Editar serviço" : "Novo serviço"}</h1>

      {loading ? (
        <div className="glass mt-6 p-6 text-sm text-muted-foreground">Carregando dados do serviço…</div>
      ) : (

      <div className="mt-6 space-y-4">
        <Field label="Nome">
          <input
            className="input-glass-sm"
            value={s.name}
            placeholder="Ex.: Corte masculino"
            onChange={(e) => setS({ ...s, name: e.target.value })}
          />
        </Field>

        <Field label="Descrição curta">
          <textarea
            className="input-glass-sm min-h-[80px] py-3"
            value={s.description}
            placeholder="Detalhes que aparecem para o cliente (opcional)"
            onChange={(e) => setS({ ...s, description: e.target.value })}
          />
        </Field>

        <Field label="Foto do serviço">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-2xl">
              {s.photo_url
                ? <img src={s.photo_url} alt="" className="h-full w-full object-cover" />
                : <span>{s.emoji}</span>}
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <label className="btn-ghost-glass inline-flex h-10 cursor-pointer items-center gap-2 px-3 text-xs">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickPhoto(f); e.target.value = ""; }}
                />
                {uploading ? "Enviando…" : s.photo_url ? "Trocar foto" : "Enviar foto"}
              </label>
              {s.photo_url && (
                <button
                  type="button"
                  className="btn-ghost-glass inline-flex h-10 items-center px-3 text-xs"
                  onClick={removePhoto}
                >
                  Remover
                </button>
              )}
            </div>
          </div>
        </Field>

        <Field label="Emoji (usado quando não há foto)">
          <input
            className="input-glass-sm"
            value={s.emoji}
            onChange={(e) => setS({ ...s, emoji: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Duração">
            <select
              className="input-glass-sm"
              value={s.duration_min}
              onChange={(e) => setS({ ...s, duration_min: Number(e.target.value) })}
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>{d} min</option>
              ))}
            </select>
          </Field>
          <Field label="Valor">
            <input
              inputMode="numeric"
              className="input-glass-sm"
              value={formatMoney(s.price_cents)}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                setS({ ...s, price_cents: Number(digits || 0) });
              }}
            />
          </Field>
        </div>



        <label className="glass flex items-center justify-between p-4">
          <div>
            <div className="text-sm font-semibold">Serviço ativo</div>
            <div className="text-xs text-muted-foreground">
              Quando inativo, o serviço somem do agendamento e o histórico é preservado.
            </div>
          </div>
          <input
            type="checkbox"
            checked={s.active}
            onChange={(e) => setS({ ...s, active: e.target.checked })}
            className="h-5 w-5"
          />
        </label>
      </div>
      )}

      <div className="mt-6">
        <PrimaryButton onClick={save} disabled={!canSave || loading} icon={<Save size={18} />}>
          {saving ? "Salvando…" : "Salvar"}
        </PrimaryButton>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
