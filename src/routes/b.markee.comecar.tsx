import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, CheckCircle2, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { MarkeeFace } from "@/components/markee/MarkeeFace";
import { markeeCreateLead } from "@/lib/markee.functions";
import segBarbearia from "@/assets/markee-seg-barbearia.jpg";
import segSalao from "@/assets/markee-seg-salao.jpg";
import segEstetica from "@/assets/markee-seg-estetica.jpg";
import segNail from "@/assets/markee-seg-nail.jpg";
import segOutros from "@/assets/markee-seg-outros.jpg";

export const Route = createFileRoute("/b/markee/comecar")({
  component: MarkeeWizard,
  head: () => ({ meta: [{ title: "Começar — Markee" }] }),
});

type Segment = "barbearia" | "salao" | "estetica" | "nail" | "outros";

type FormState = {
  business_name: string;
  owner_name: string;
  whatsapp: string;
  email: string;
  segment: Segment | "";
  segment_other: string;
  about: string;
  primary: string;
  primary_glow: string;
  secondary: string;
};

const SEGMENTS: { key: Segment; label: string; tag: string; desc: string; image: string }[] = [
  { key: "barbearia", label: "Barbearia", tag: "Estilo", desc: "Cortes, barba e navalha com a precisão de um clássico.", image: segBarbearia },
  { key: "salao", label: "Salão de beleza", tag: "Beleza", desc: "Cabelo, coloração e escova em ambiente sofisticado.", image: segSalao },
  { key: "estetica", label: "Estética", tag: "Bem-estar", desc: "Tratamentos faciais e corporais em ritmo de spa.", image: segEstetica },
  { key: "nail", label: "Nail design", tag: "Detalhe", desc: "Mãos e pés com acabamento impecável.", image: segNail },
  { key: "outros", label: "Outro segmento", tag: "Sob medida", desc: "Conta pra gente o que você atende — a Markee se adapta.", image: segOutros },
];

const COLOR_PRESETS: { name: string; primary: string; glow: string; secondary: string }[] = [
  { name: "Violeta IA", primary: "#a78bfa", glow: "#60a5fa", secondary: "#0b0b1a" },
  { name: "Dourado clássico", primary: "#d4a64a", glow: "#f0c674", secondary: "#0a0a0a" },
  { name: "Rosa boutique", primary: "#ec4899", glow: "#f9a8d4", secondary: "#1a0d14" },
  { name: "Verde menta", primary: "#34d399", glow: "#a7f3d0", secondary: "#0a1410" },
  { name: "Azul oceano", primary: "#38bdf8", glow: "#7dd3fc", secondary: "#0a1220" },
];

const STORAGE_KEY = "markee:onboarding:v1";

function loadDraft(): FormState {
  if (typeof window === "undefined") return blank();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...blank(), ...(JSON.parse(raw) as Partial<FormState>) };
  } catch {
    /* ignore */
  }
  return blank();
}

function blank(): FormState {
  return {
    business_name: "",
    owner_name: "",
    whatsapp: "",
    email: "",
    segment: "",
    segment_other: "",
    about: "",
    primary: COLOR_PRESETS[0].primary,
    primary_glow: COLOR_PRESETS[0].glow,
    secondary: COLOR_PRESETS[0].secondary,
  };
}

const STEP_TITLES = ["Você", "Segmento", "Identidade", "Revisão"];

function MarkeeWizard() {
  const navigate = useNavigate();
  const createLead = useServerFn(markeeCreateLead);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(() => loadDraft());
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  const totalSteps = STEP_TITLES.length;

  const stepValid = useMemo(() => {
    if (step === 0)
      return (
        form.business_name.trim().length >= 2 &&
        form.owner_name.trim().length >= 2 &&
        form.whatsapp.replace(/\D/g, "").length >= 10 &&
        /.+@.+\..+/.test(form.email)
      );
    if (step === 1)
      return !!form.segment && (form.segment !== "outros" || form.segment_other.trim().length >= 2);
    if (step === 2) return form.about.length <= 500;
    return true;
  }, [step, form]);

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await createLead({
        data: {
          business_name: form.business_name.trim(),
          owner_name: form.owner_name.trim(),
          whatsapp: form.whatsapp,
          email: form.email.trim(),
          segment: (form.segment || "outros") as any,
          segment_other: form.segment_other?.trim() || undefined,
          about: form.about?.trim() || undefined,
          primary_color: form.primary,
          primary_glow_color: form.primary_glow,
          secondary_color: form.secondary,
        },
      });
      setTicket(res.ticket_number);
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    } catch (e: any) {
      setError(e?.message || "Não foi possível enviar agora. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (ticket) {
    return (
      <section className="pt-10 md:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-2xl text-center"
        >
          <div className="mx-auto mb-6 flex justify-center">
            <MarkeeFace size={160} />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--primary)]/15 px-3 py-1 text-xs uppercase tracking-[0.22em] text-[color:var(--primary)]">
            <CheckCircle2 size={14} /> Proposta recebida
          </div>
          <h1 className="markee-display mt-5 text-4xl font-bold leading-[1.05] sm:text-5xl">
            Estamos <span className="markee-grad-text">cuidando de tudo</span> pra você.
          </h1>
          <p className="mt-4 text-[color:var(--muted-foreground)]">
            Em instantes a confirmação chega no WhatsApp e no e-mail. Guarde o número do seu chamado:
          </p>
          <div className="markee-display mt-6 inline-flex items-baseline gap-3 rounded-full border border-[color:var(--glass-border)] bg-[color:var(--glass)] px-6 py-3 text-3xl font-semibold tracking-[0.08em]">
            {ticket}
          </div>
          <div className="mt-8">
            <button
              type="button"
              onClick={() =>
                navigate({
                  to: "/b/$slug/acompanhamento",
                  params: { slug: "markee" },
                  search: { ticket },
                })
              }
              className="markee-cta inline-flex items-center gap-2"
            >
              Acompanhar status <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="pt-4 md:pt-8">
      {/* Topo editorial */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-[0.28em] text-[color:var(--muted-foreground)]">
            {String(step + 1).padStart(2, "0")} <span className="opacity-40">/ {String(totalSteps).padStart(2, "0")}</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-[color:var(--glass-border)] bg-[color:var(--glass)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
            <Sparkles size={11} /> {STEP_TITLES[step]}
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate({ to: "/b/$slug", params: { slug: "markee" } })}
          className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition"
        >
          Sair
        </button>
      </header>

      <div className="mt-10 md:mt-14">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {step === 0 && <StepInfo form={form} setForm={setForm} />}
            {step === 1 && <StepSegment form={form} setForm={setForm} />}
            {step === 2 && <StepAboutAndColors form={form} setForm={setForm} />}
            {step === 3 && <StepReview form={form} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dock flutuante de navegação */}
      <div className="mx-auto mt-12 max-w-xl">
        <div className="markee-dock">
          <button
            type="button"
            onClick={() => {
              if (step === 0) navigate({ to: "/b/$slug", params: { slug: "markee" } });
              else setStep((s) => Math.max(0, s - 1));
            }}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--foreground)]/85 hover:text-[color:var(--foreground)] transition"
            aria-label="Voltar"
          >
            <ChevronLeft size={18} /> Voltar
          </button>

          <div className="markee-dock-dots" aria-hidden>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span key={i} className={i === step ? "active" : ""} />
            ))}
          </div>

          {step < totalSteps - 1 ? (
            <button
              type="button"
              disabled={!stepValid}
              onClick={() => setStep((s) => s + 1)}
              className="markee-cta inline-flex items-center gap-1.5 text-sm disabled:opacity-40"
              style={{ padding: "0.55rem 1.1rem" }}
            >
              Continuar <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={onSubmit}
              className="markee-cta inline-flex items-center gap-1.5 text-sm disabled:opacity-60"
              style={{ padding: "0.55rem 1.1rem" }}
            >
              {submitting ? (
                <>
                  Enviando
                  <span className="inline-flex">
                    <span className="markee-dot" />
                    <span className="markee-dot" />
                    <span className="markee-dot" />
                  </span>
                </>
              ) : (
                <>Enviar <Check size={16} /></>
              )}
            </button>
          )}
        </div>
        {error && (
          <div className="mt-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>
    </section>
  );
}

function StepHeading({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub?: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--primary)]">{eyebrow}</div>
      <h1 className="markee-display mt-3 text-3xl font-semibold leading-[1.08] sm:text-4xl md:text-5xl">
        {title}
      </h1>
      {sub && (
        <p className="mx-auto mt-4 max-w-xl text-[15px] text-[color:var(--muted-foreground)] sm:text-base">
          {sub}
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  maxLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <div className={`markee-field ${value ? "has-value" : ""}`}>
      <label>{label}</label>
      <input
        type={type}
        value={value}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function StepInfo({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  return (
    <div>
      <StepHeading
        eyebrow="Sobre você"
        title={<>Vamos nos <span className="markee-grad-text">conhecer</span>?</>}
        sub="Quatro campos rápidos pra começarmos com o pé direito."
      />
      <div className="mx-auto mt-12 grid max-w-2xl gap-x-10 gap-y-8 sm:grid-cols-2">
        <Field label="Nome do estabelecimento" value={form.business_name} onChange={(v) => setForm((f) => ({ ...f, business_name: v }))} maxLength={120} />
        <Field label="Seu nome" value={form.owner_name} onChange={(v) => setForm((f) => ({ ...f, owner_name: v }))} maxLength={120} />
        <Field label="WhatsApp" value={form.whatsapp} onChange={(v) => setForm((f) => ({ ...f, whatsapp: v }))} maxLength={20} inputMode="tel" />
        <Field label="E-mail" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} maxLength={160} type="email" />
      </div>
    </div>
  );
}

function StepSegment({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: "smooth" });
  };

  return (
    <div>
      <StepHeading
        eyebrow="O seu universo"
        title={<>Em que você é <span className="markee-grad-text">referência</span>?</>}
        sub="Deslize pra ver as opções e toque na que mais combina com seu negócio."
      />

      <div className="relative mt-12">
        {/* setas desktop */}
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Anterior"
          className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-[color:var(--glass-border)] bg-[color:var(--background)]/60 p-2.5 text-[color:var(--foreground)] backdrop-blur transition hover:bg-[color:var(--background)]/90 md:block"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Próximo"
          className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-[color:var(--glass-border)] bg-[color:var(--background)]/60 p-2.5 text-[color:var(--foreground)] backdrop-blur transition hover:bg-[color:var(--background)]/90 md:block"
        >
          <ChevronRight size={18} />
        </button>

        <div
          ref={scroller}
          className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 md:gap-6 md:px-12"
          style={{ scrollPaddingLeft: "1.25rem", scrollPaddingRight: "1.25rem" }}
        >
          {SEGMENTS.map((s) => {
            const active = form.segment === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setForm((f) => ({ ...f, segment: s.key }))}
                className={`markee-seg-card text-left ${active ? "is-active" : ""}`}
              >
                <img src={s.image} alt={s.label} loading="lazy" className="seg-img" />
                <div className="seg-veil" />
                <div className="seg-check"><Check size={16} strokeWidth={3} /></div>
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <div className="text-[10px] uppercase tracking-[0.28em] opacity-80">{s.tag}</div>
                  <div className="markee-display mt-1 text-2xl font-semibold leading-tight">{s.label}</div>
                  <div className="mt-1.5 text-[13px] text-white/75 line-clamp-2">{s.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {form.segment === "outros" && (
        <div className="mx-auto mt-10 max-w-xl">
          <Field
            label="Qual segmento?"
            value={form.segment_other}
            onChange={(v) => setForm((f) => ({ ...f, segment_other: v }))}
            maxLength={80}
            placeholder="Pet shop, clínica, tatuagem…"
          />
        </div>
      )}
    </div>
  );
}

function StepAboutAndColors({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  return (
    <div>
      <StepHeading
        eyebrow="Identidade"
        title={<>A sua <span className="markee-grad-text">marca</span>, do seu jeito.</>}
        sub="Conte um pouco e escolha as cores que falam por você."
      />

      <div className="mx-auto mt-12 max-w-2xl">
        <div className={`markee-field ${form.about ? "has-value" : ""}`}>
          <label>Sobre o seu negócio</label>
          <textarea
            rows={4}
            value={form.about}
            onChange={(e) => setForm((f) => ({ ...f, about: e.target.value.slice(0, 500) }))}
          />
        </div>
        <div className="mt-1.5 text-right text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
          {form.about.length}/500
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-3xl">
        <div className="mb-4 text-center text-[11px] uppercase tracking-[0.28em] text-[color:var(--muted-foreground)]">
          Paleta
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {COLOR_PRESETS.map((p) => {
            const active = form.primary === p.primary && form.primary_glow === p.glow;
            return (
              <button
                key={p.name}
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, primary: p.primary, primary_glow: p.glow, secondary: p.secondary }))
                }
                className={`markee-palette ${active ? "is-active" : ""}`}
              >
                <span className="swatch-stack">
                  <span style={{ background: p.primary }} />
                  <span style={{ background: p.glow }} />
                  <span style={{ background: p.secondary }} />
                </span>
                <span className="text-sm font-medium">{p.name}</span>
                {active && <Check size={14} className="text-[color:var(--primary)]" />}
              </button>
            );
          })}
        </div>

        <details className="mx-auto mt-8 max-w-lg text-sm text-[color:var(--muted-foreground)]">
          <summary className="cursor-pointer text-center text-xs uppercase tracking-[0.22em] hover:text-[color:var(--foreground)]">
            Ajuste fino das cores
          </summary>
          <div className="mt-5 grid grid-cols-3 gap-4">
            <ColorPick label="Primária" value={form.primary} onChange={(v) => setForm((f) => ({ ...f, primary: v }))} />
            <ColorPick label="Brilho" value={form.primary_glow} onChange={(v) => setForm((f) => ({ ...f, primary_glow: v }))} />
            <ColorPick label="Fundo" value={form.secondary} onChange={(v) => setForm((f) => ({ ...f, secondary: v }))} />
          </div>
        </details>
      </div>
    </div>
  );
}

function ColorPick({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col items-center gap-2">
      <span className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted-foreground)]">{label}</span>
      <span
        className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-full border border-[color:var(--glass-border)]"
        style={{ background: value }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </span>
    </label>
  );
}

function StepReview({ form }: { form: FormState }) {
  const seg = SEGMENTS.find((s) => s.key === form.segment);
  const segmentLabel = seg ? (form.segment === "outros" ? `${seg.label} — ${form.segment_other}` : seg.label) : "";
  return (
    <div>
      <StepHeading
        eyebrow="Revisão"
        title={<>Tudo pronto pra <span className="markee-grad-text">decolar</span>.</>}
        sub="Confira os dados — a Markee assume daqui."
      />

      <div className="mx-auto mt-12 grid max-w-3xl gap-6 md:grid-cols-[1.2fr,1fr]">
        <div className="markee-glass overflow-hidden p-0">
          {seg && (
            <div className="relative aspect-[16/10] overflow-hidden">
              <img src={seg.image} alt={seg.label} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 30%, oklch(0.10 0.04 280 / 0.9) 100%)" }} />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <div className="text-[10px] uppercase tracking-[0.28em] text-white/70">{seg.tag}</div>
                <div className="markee-display text-2xl font-semibold text-white">{segmentLabel}</div>
              </div>
            </div>
          )}
          <div className="space-y-3 p-6">
            <ReviewLine label="Negócio" value={form.business_name} />
            <ReviewLine label="Responsável" value={form.owner_name} />
            <ReviewLine label="WhatsApp" value={form.whatsapp} />
            <ReviewLine label="E-mail" value={form.email} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="markee-glass p-6">
            <div className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--muted-foreground)]">Paleta</div>
            <div className="mt-3 flex items-center gap-2">
              <span className="h-10 w-10 rounded-full" style={{ background: form.primary }} />
              <span className="h-10 w-10 rounded-full" style={{ background: form.primary_glow }} />
              <span className="h-10 w-10 rounded-full border border-white/20" style={{ background: form.secondary }} />
            </div>
            <div
              className="mt-5 rounded-2xl p-5 text-sm"
              style={{
                background: `linear-gradient(135deg, ${form.primary}, ${form.primary_glow})`,
                color: form.secondary,
              }}
            >
              <div className="text-[10px] uppercase tracking-[0.28em] opacity-80">Preview</div>
              <div className="markee-display mt-1 text-xl font-semibold">
                {form.business_name || "Seu negócio"}
              </div>
            </div>
          </div>

          {form.about && (
            <div className="markee-glass p-6">
              <div className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--muted-foreground)]">Sobre</div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{form.about}</p>
            </div>
          )}
        </div>
      </div>

      <p className="mx-auto mt-8 max-w-lg text-center text-xs text-[color:var(--muted-foreground)]">
        Ao enviar, sua proposta entra na fila da nossa equipe. Você recebe um número de chamado e atualizações por WhatsApp e e-mail.
      </p>
    </div>
  );
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[color:var(--glass-border)] pb-2 last:border-0 last:pb-0">
      <span className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">{label}</span>
      <span className="text-right text-sm">{value || <span className="text-[color:var(--muted-foreground)]">—</span>}</span>
    </div>
  );
}
