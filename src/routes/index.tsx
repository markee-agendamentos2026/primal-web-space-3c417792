import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Calendar, ListChecks, MessageCircle, Instagram, Sparkles, X } from "lucide-react";
import { fetchAvailability, isClientActive, getMyWhatsapp, type Availability } from "@/lib/store";
import { tenantHref, DEFAULT_TENANT_SLUG, getCurrentTenant } from "@/lib/tenant";
import { MaintenanceDialog } from "@/components/MaintenanceDialog";

export const Route = createFileRoute("/")({
  beforeLoad: () => { throw redirect({ to: "/b/$slug", params: { slug: DEFAULT_TENANT_SLUG } }); },
  component: Index,
  head: () => ({
    meta: [
      { title: "Ronielson Hair — Agendamento premium" },
      { name: "description", content: "Agende seu corte com a Ronielson Hair em poucos toques." },
    ],
  }),
});

export function Index() {
  const [av, setAv] = useState<Availability | null>(null);
  const [logoOpen, setLogoOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { fetchAvailability().then(setAv); }, []);
  useEffect(() => {
    if (!logoOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLogoOpen(false); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [logoOpen]);
  const wa = av?.whatsapp_url || "https://wa.me/5500000000000";
  const ig = av?.instagram_url || "https://instagram.com/";
  const name = av?.business_name || getCurrentTenant().name;

  const guardedGo = async (to: string) => {
    const w = getMyWhatsapp();
    if (w) {
      const ok = await isClientActive(w);
      if (!ok) { setBlockedOpen(true); return; }
    }
    navigate({ to: tenantHref(to) as any });
  };

  return (
    <AppShell>
      <header className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Studio</span>
        <span />
      </header>

      <section className="mt-10 flex flex-col items-center text-center animate-fade-up">
        {av?.logo_url ? (
          <button
            type="button"
            onClick={() => setLogoOpen(true)}
            aria-label="Ampliar logo"
            className="relative mb-6 h-20 w-20 overflow-hidden rounded-full border border-white/15 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] transition hover:scale-105 active:scale-95"
          >
            <img
              src={av.logo_url}
              alt={name}
              loading="eager"
              decoding="async"
              className="absolute inset-0 block h-full w-full object-cover"
            />
          </button>
        ) : (
          <div className="glass mb-6 flex h-20 w-20 items-center justify-center text-3xl">💈</div>
        )}

        <h1 className="font-display text-5xl font-black leading-none">
          {name.split(" ")[0]}
          <br />
          <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            {name.split(" ").slice(1).join(" ") || "Hair"}
          </span>
        </h1>

        <div className="mt-8 flex w-full flex-col gap-3">
          <button type="button" onClick={() => guardedGo("/agendar")} className="block w-full text-left">
            <PrimaryButton icon={<Calendar size={20} />}>Agendar serviço</PrimaryButton>
          </button>
          <button type="button" onClick={() => guardedGo("/meus-agendamentos")} className="block w-full text-left">
            <PrimaryButton variant="ghost" icon={<ListChecks size={20} />}>
              Ver meus agendamentos
            </PrimaryButton>
          </button>
        </div>
      </section>

      <section className="mt-10 animate-fade-up">
        <div className="glass-strong relative overflow-hidden p-6">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-primary">
              <Sparkles size={12} /> Markee
            </div>
            <h2 className="mt-3 font-display text-2xl">Agende em segundos.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Fale com a gente direto pelo WhatsApp ou nos siga no Instagram.
            </p>
            <div className="mt-5 flex gap-3">
              <a href={wa} target="_blank" rel="noreferrer" className="flex-1">
                <PrimaryButton icon={<MessageCircle size={18} />}>WhatsApp</PrimaryButton>
              </a>
              <a href={ig} target="_blank" rel="noreferrer" className="flex-1">
                <PrimaryButton variant="ghost" icon={<Instagram size={18} />}>Instagram</PrimaryButton>
              </a>
            </div>
          </div>
        </div>
      </section>

      {logoOpen && av?.logo_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-md animate-in fade-in"
          onClick={() => setLogoOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLogoOpen(false); }}
            aria-label="Fechar"
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
          >
            <X size={18} />
          </button>
          <img
            src={av.logo_url}
            alt={name}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] max-w-[90vw] rounded-2xl border border-white/15 object-contain shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] animate-in zoom-in-95"
          />
        </div>
      )}
      <MaintenanceDialog open={blockedOpen} onOpenChange={setBlockedOpen} />
    </AppShell>
  );
}
