import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ArrowLeft, ArrowRight, User, Phone, Mail, Check, Clock, AlertCircle, MapPin, Loader2, ListPlus } from "lucide-react";
import { toast } from "sonner";
import {
  getDraft,
  setDraft,
  clearDraft,
  type Draft,
  fetchAvailability,
  type Availability,
  createBooking,
  getAvailableSlots,
  roundDuration,
  isValidPhone,
  isClientActive,
  maskPhone,
  type Service,
  type Professional,
} from "@/lib/store";
import { tenantHref, getCurrentTenantId, tenantRealtimeFilter, DEFAULT_TENANT_SLUG } from "@/lib/tenant";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MaintenanceDialog } from "@/components/MaintenanceDialog";
import { motion, AnimatePresence } from "framer-motion";


export const Route = createFileRoute("/agendar")({
  beforeLoad: () => { throw redirect({ to: "/b/$slug/agendar", params: { slug: DEFAULT_TENANT_SLUG } }); },
  component: AgendarPage,
  head: () => ({ meta: [{ title: "Agendar — Ronielson Hair" }] }),
});

type Step = "dados" | "profissional" | "servico" | "data" | "horario" | "localizacao";

export function AgendarPage() {
  const navigate = useNavigate();
  const [av, setAv] = useState<Availability | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [pros, setPros] = useState<Professional[]>([]);
  const [step, setStep] = useState<Step>("dados");
  const [draft, setLocalDraft] = useState<Draft>({});
  const [locationEnabled, setLocationEnabled] = useState(false);
  useEffect(() => {
    setLocalDraft(getDraft());
  }, []);
  const [submitting, setSubmitting] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [checkingClient, setCheckingClient] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchAvailability().then(setAv);
    const tenantId = getCurrentTenantId();
    const loadServices = () => {
      supabase
        .from("services")
        .select("*")
        .eq("active", true)
        .eq("tenant_id", tenantId)
        .order("sort_order")
        .then(({ data }) => setServices((data as any) ?? []));
    };

    const loadPros = () => {
      supabase
        .from("professionals")
        .select("*")
        .eq("active", true)
        .eq("tenant_id", tenantId)
        .order("sort_order")
        .then(({ data }) => setPros((data as any) ?? []));
    };

    loadServices();
    loadPros();

    // Load feature flags
    supabase.rpc("get_tenant_features_public", { _tenant_id: tenantId }).then(({ data }) => {
      const loc = (data as any[] | null)?.find((f) => f.feature_key === "flow.client_location");
      setLocationEnabled(!!loc?.enabled);
    });

    const tf = tenantRealtimeFilter(tenantId);
    const servicesChannel = supabase
      .channel(`services-booking-${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "services", filter: tf }, loadServices)
      .subscribe();

    const prosChannel = supabase
      .channel(`pros-booking-${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "professionals", filter: tf }, loadPros)
      .subscribe();

    return () => {
      supabase.removeChannel(servicesChannel);
      supabase.removeChannel(prosChannel);
    };
  }, []);

  const steps: Step[] = useMemo(() => {
    const base: Step[] = ["dados", "servico", "data", "horario"];
    if (av?.require_pro_selection) base.splice(1, 0, "profissional");
    if (locationEnabled) base.push("localizacao");
    return base;
  }, [av, locationEnabled]);

  const stepIdx = steps.indexOf(step);
  const progress = ((stepIdx + 1) / steps.length) * 100;

  const update = (patch: Draft) => {
    setLocalDraft((prev) => ({ ...prev, ...patch }));
    setDraft(patch);
  };

  const goNext = async () => {
    if (step === "dados" && draft.whatsapp) {
      setCheckingClient(true);
      const ok = await isClientActive(draft.whatsapp);
      setCheckingClient(false);
      if (!ok) { setBlockedOpen(true); return; }
    }
    if (stepIdx < steps.length - 1) setStep(steps[stepIdx + 1]);
  };
  const goBack = async () => {
    if (draft.whatsapp) {
      const ok = await isClientActive(draft.whatsapp);
      if (!ok) { setBlockedOpen(true); return; }
    }
    if (stepIdx === 0) navigate({ to: tenantHref("/") as any });
    else setStep(steps[stepIdx - 1]);
  };


  const confirm = async () => {
    if (!draft.serviceId || !draft.date || !draft.time || !draft.name || !draft.whatsapp) return;
    if (locationEnabled) {
      if (!draft.cep || !draft.street || !draft.number || !draft.neighborhood || !draft.city || !draft.state) {
        setErrorMsg("Preencha o endereço completo.");
        return;
      }
    }
    setSubmitting(true);
    setErrorMsg("");
    const r = await createBooking({
      client_name: draft.name,
      whatsapp: draft.whatsapp,
      email: draft.email,
      professional_id: draft.proId || null,
      service_id: draft.serviceId,
      date: draft.date,
      time: draft.time,
      address: locationEnabled
        ? {
            cep: draft.cep!,
            street: draft.street!,
            number: draft.number!,
            complement: draft.complement,
            neighborhood: draft.neighborhood!,
            city: draft.city!,
            state: draft.state!,
          }
        : null,
    });
    setSubmitting(false);
    if ("error" in r) {
      if (r.error === "BLOCKED") {
        setBlockedOpen(true);
        return;
      }
      setErrorMsg(r.error || "Erro ao agendar.");
      return;
    }
    clearDraft();
    navigate({ to: tenantHref("/agendamento-confirmado") as any, search: { id: r.id! } as any });
  };


  return (
    <AppShell>
      <header className="flex items-center justify-between">
        {/*<Link to="/" className="btn-ghost-glass inline-flex h-10 items-center gap-2 px-4 text-sm">
    <ArrowLeft size={16} /> Início
  </Link>*/}
        <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{labelFor(step)}</span>
        <span className="w-16 text-right text-xs text-muted-foreground">
          {stepIdx + 1}/{steps.length}
        </span>
      </header>

      <div className="progress-track mt-4">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-6 flex-1 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >
            {step === "dados" && <DadosStep draft={draft} update={update} />}
            {step === "profissional" && <ProStep draft={draft} update={update} pros={pros} />}
            {step === "servico" && <ServicoStep draft={draft} update={update} services={services} />}
            {step === "data" && <DataStep draft={draft} update={update} maxDays={av?.max_future_days ?? 60} daysEnabled={av?.days_enabled ?? [true,true,true,true,true,true,true]} closeTime={av?.close_time ?? "20:00"} minLeadMin={av?.min_lead_min ?? 0} />}
            {step === "horario" && <HorarioStep draft={draft} update={update} services={services} pros={pros} />}
            {step === "localizacao" && <LocalizacaoStep draft={draft} update={update} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky bottom action */}
      <div className="sticky bottom-4 z-10 mt-2 space-y-2">
        {errorMsg && (
          <div className="glass flex items-center gap-2 p-3 text-sm text-destructive">
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}
        {step === "horario" && !locationEnabled ? (
          <PrimaryButton icon={<Check size={20} />} disabled={!draft.time || submitting} onClick={confirm}>
            {submitting ? "Confirmando…" : "Confirmar agendamento"}
          </PrimaryButton>
        ) : step === "localizacao" ? (
          <PrimaryButton icon={<Check size={20} />} disabled={!canProceed(step, draft) || submitting} onClick={confirm}>
            {submitting ? "Confirmando…" : "Confirmar agendamento"}
          </PrimaryButton>
        ) : (
          <PrimaryButton icon={<ArrowRight size={20} />} onClick={goNext} disabled={!canProceed(step, draft) || checkingClient}>
            {checkingClient ? "Verificando…" : "Continuar"}
          </PrimaryButton>
        )}

        <PrimaryButton variant="ghost" icon={<ArrowLeft size={20} />} onClick={goBack}>
          Voltar
        </PrimaryButton>
      </div>

      <MaintenanceDialog open={blockedOpen} onOpenChange={setBlockedOpen} />

    </AppShell>
  );
}

function canProceed(step: Step, d: Draft): boolean {
  if (step === "dados") return !!d.name && !!d.whatsapp && isValidPhone(d.whatsapp) && !!d.terms;
  if (step === "profissional") return !!d.proId;
  if (step === "servico") return !!d.serviceId;
  if (step === "data") return !!d.date;
  if (step === "horario") return !!d.time;
  if (step === "localizacao") {
    const cepOk = !!d.cep && d.cep.replace(/\D/g, "").length === 8;
    return cepOk && !!d.street && !!d.number && !!d.neighborhood && !!d.city && !!d.state;
  }
  return true;
}

function labelFor(s: Step) {
  return (
    { dados: "Seus dados", profissional: "Profissional", servico: "Serviço", data: "Data", horario: "Horário", localizacao: "Endereço" } as const
  )[s];
}

/* ---------------- DADOS ---------------- */
function DadosStep({ draft, update }: { draft: Draft; update: (d: Draft) => void }) {
  const [openTerms, setOpenTerms] = useState(false);
  return (
    <div>
      <h2 className="font-display text-3xl">Vamos começar</h2>
      <p className="mt-2 text-sm text-muted-foreground">Só pra te chamar pelo nome e confirmar pelo WhatsApp.</p>
      <div className="mt-8 space-y-4">
        <Input
          icon={<User size={18} />}
          placeholder="Seu nome"
          value={draft.name || ""}
          onChange={(v) => update({ name: v })}
        />
        <Input
          icon={<Phone size={18} />}
          placeholder="(11) 99999-9999"
          type="tel"
          value={draft.whatsapp || ""}
          onChange={(v) => update({ whatsapp: maskPhone(v) })}
        />
        <Input
          icon={<Mail size={18} />}
          placeholder="E-mail (opcional)"
          type="email"
          value={draft.email || ""}
          onChange={(v) => update({ email: v })}
        />
        <div className="glass flex items-start gap-3 p-4">
          <button
            type="button"
            onClick={() => update({ terms: !draft.terms })}
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${draft.terms ? "bg-primary border-primary" : "border-white/20"}`}
          >
            {draft.terms && <Check size={16} className="text-primary-foreground" />}
          </button>
          <p className="text-sm text-muted-foreground">
            Aceito os{" "}
            <button
              type="button"
              onClick={() => setOpenTerms(true)}
              className="text-primary underline-offset-4 hover:underline"
            >
              termos de uso
            </button>
            .
          </p>
        </div>
      </div>

      <Dialog open={openTerms} onOpenChange={setOpenTerms}>
        <DialogContent className="glass-strong border-glass-border">
          <DialogHeader>
            <DialogTitle>Termos de uso</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-2 max-h-[60vh] overflow-y-auto">
            <p>Ao agendar, você aceita receber confirmações via WhatsApp e e-mail.</p>
            <p>Cancelamentos podem ser feitos diretamente em "Meus agendamentos".</p>
            <p>O estabelecimento se reserva o direito de remarcar caso necessário, com aviso prévio.</p>
            <p>Seus dados são usados apenas para gestão do seu atendimento.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Input({
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
      <input
        className="input-glass"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
      />
    </div>
  );
}

/* ---------------- PRO ---------------- */
function ProStep({ draft, update, pros }: { draft: Draft; update: (d: Draft) => void; pros: Professional[] }) {
  return (
    <div>
      <h2 className="font-display text-3xl">Com quem?</h2>
      <p className="mt-2 text-sm text-muted-foreground">Escolha um profissional.</p>
      <div className="mt-6 space-y-3">
        {pros.map((p) => {
          const active = draft.proId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => update({ proId: p.id })}
              className={`glass flex w-full items-center gap-4 p-4 text-left transition ${active ? "ring-2 ring-primary" : ""}`}
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-primary/15">
                {p.photo_url ? (
                  <img
                    src={p.photo_url}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 block h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-bold text-primary">
                    {p.name.charAt(0)}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="text-lg font-semibold">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.role}</div>
              </div>
              {active && <Check className="text-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- SERVIÇO ---------------- */
function ServicoStep({ draft, update, services }: { draft: Draft; update: (d: Draft) => void; services: Service[] }) {
  return (
    <div>
      <h2 className="font-display text-3xl">Qual serviço?</h2>
      <div className="mt-6 space-y-2">
        {services.map((s) => {
          const active = draft.serviceId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => update({ serviceId: s.id })}
              className={`relative flex w-full items-center gap-4 rounded-2xl p-4 text-left transition ${active ? "ring-2 ring-primary glass" : "glass"}`}
            >
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-2xl">
                {s.photo_url
                  ? <img src={s.photo_url} alt={s.name} loading="lazy" decoding="async" className="absolute inset-0 block h-full w-full object-cover" />
                  : <span>{s.emoji}</span>}
              </div>
              <div className="flex-1">
                <div className="text-base font-semibold">{s.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock size={11} /> {s.duration_min} min
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-primary">R${s.price}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- DATA ---------------- */
function DataStep({ draft, update, maxDays, daysEnabled, closeTime, minLeadMin }: { draft: Draft; update: (d: Draft) => void; maxDays: number; daysEnabled: boolean[]; closeTime: string; minLeadMin: number }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  // Hoje (BRT) e janela ainda disponível
  const tz = "America/Sao_Paulo";
  const todayIso = useMemo(() => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date()), []);
  const todayHasRoom = useMemo(() => {
    const nowHHMM = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
    const [nh, nm] = nowHHMM.split(":").map(Number);
    const [ch, cm] = closeTime.split(":").map(Number);
    return nh * 60 + nm + minLeadMin + 30 <= ch * 60 + cm;
  }, [closeTime, minLeadMin]);

  const days = useMemo(() => daysForCursor(cursor, 14).filter((d) => {
    const w = new Date(d.iso + "T12:00:00").getDay();
    if (!daysEnabled[w]) return false;
    if (d.iso === todayIso && !todayHasRoom) return false;
    return true;
  }).slice(0, 7), [cursor, daysEnabled, todayIso, todayHasRoom]);
  return (
    <div translate="no">
      <h2 className="font-display text-3xl">Quando?</h2>
      <p className="mt-2 text-sm text-muted-foreground">Próximos dias ou abra o calendário.</p>

      <div className="mt-6 -mx-5 overflow-x-auto px-5 pb-2 scrollbar-none">
        <div className="flex gap-3">
          {days.map((d) => {
            const active = draft.date === d.iso;
            return (
              <button
                key={d.iso}
                onClick={() => update({ date: d.iso })}
                className={`flex min-w-[72px] flex-col items-center rounded-2xl border px-3 py-3 transition ${active ? "border-primary bg-primary text-primary-foreground" : "glass border-transparent"}`}
              >
                <span className="text-[10px] uppercase opacity-80">{d.weekday}</span>
                <span className="text-2xl font-bold">{d.day}</span>
                <span className="text-[10px] opacity-80">{d.month}</span>
              </button>
            );
          })}
        </div>
      </div>

      <MiniCalendar
        cursor={cursor}
        setCursor={setCursor}
        selected={draft.date}
        onSelect={(iso) => update({ date: iso })}
        maxDays={maxDays}
        daysEnabled={daysEnabled}
        todayIso={todayIso}
        todayHasRoom={todayHasRoom}
      />
    </div>
  );
}

const WEEKDAYS_ABBR = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MONTHS_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function daysForCursor(cursor: Date, n: number) {
  const out = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sameMonth = cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth();
  const start = sameMonth ? today : new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  for (let i = 0; i < n; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (d.getMonth() !== cursor.getMonth()) break;
    if (d.getDate() > lastDay) break;
    out.push({
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      weekday: WEEKDAYS_ABBR[d.getDay()],
      day: String(d.getDate()).padStart(2, "0"),
      month: MONTHS_ABBR[d.getMonth()],
    });
  }
  return out;
}

function MiniCalendar({
  cursor,
  setCursor,
  selected,
  onSelect,
  maxDays,
  daysEnabled,
  todayIso,
  todayHasRoom,
}: {
  cursor: Date;
  setCursor: (d: Date) => void;
  selected?: string;
  onSelect: (iso: string) => void;
  maxDays: number;
  daysEnabled: boolean[];
  todayIso: string;
  todayHasRoom: boolean;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const max = new Date();
  max.setDate(max.getDate() + maxDays);
  const monthName = `${MONTHS_ABBR[cursor.getMonth()]} ${cursor.getFullYear()}`;
  const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  return (
    <div className="glass mt-6 p-5" translate="no">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="btn-ghost-glass h-9 w-9 rounded-full"
          aria-label="Mês anterior"
        >
          <ArrowLeft size={16} className="mx-auto" />
        </button>
        <div className="text-sm capitalize">{monthName}</div>
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="btn-ghost-glass h-9 w-9 rounded-full"
          aria-label="Próximo mês"
        >
          <ArrowRight size={16} className="mx-auto" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <div key={i} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const date = new Date(cursor.getFullYear(), cursor.getMonth(), d);
          const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
          const past = date < today;
          const tooFar = date > max;
          const dayOff = !daysEnabled[date.getDay()];
          const todayFull = iso === todayIso && !todayHasRoom;
          const disabled = past || tooFar || dayOff || todayFull;
          const active = selected === iso;
          return (
            <button
              key={i}
              disabled={disabled}
              onClick={() => onSelect(iso)}
              className={`aspect-square rounded-xl text-sm transition ${
                active ? "bg-primary text-primary-foreground font-bold" : disabled ? "opacity-25" : "hover:bg-white/5"
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- HORÁRIO ---------------- */
function HorarioStep({
  draft,
  update,
  services,
  pros,
}: {
  draft: Draft;
  update: (d: Draft) => void;
  services: Service[];
  pros: Professional[];
}) {
  const svc = services.find((s) => s.id === draft.serviceId);
  const pro = pros.find((p) => p.id === draft.proId);
  const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [waitOpen, setWaitOpen] = useState(false);

  const reload = () => {
    if (!draft.date || !svc) return;
    getAvailableSlots({
      date: draft.date,
      serviceDurationMin: svc.duration_min,
      professionalId: draft.proId || null,
    }).then(setSlots);
  };

  useEffect(() => {
    reload();
  }, [draft.date, draft.proId, draft.serviceId]);
  useEffect(() => {
    const tenantId = getCurrentTenantId();
    const ch = supabase
      .channel(`bookings-realtime-${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: tenantRealtimeFilter(tenantId) }, reload)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.date, draft.proId, draft.serviceId]);

  const dur = svc ? roundDuration(svc.duration_min) : 0;
  const hasAnyAvailable = slots.some((s) => s.available);

  return (
    <div>
      <h2 className="font-display text-3xl">Que horas?</h2>
      <p className="mt-2 text-sm text-muted-foreground">Selecione abaixo um horário disponível.</p>

      <div className="mt-6 grid grid-cols-3 gap-2">
        {slots.map((s) => {
          const active = draft.time === s.time;
          return (
            <button
              key={s.time}
              disabled={!s.available}
              onClick={() => update({ time: s.time })}
              className={`h-12 rounded-2xl text-sm font-semibold transition ${
                active ? "btn-primary" : !s.available ? "glass opacity-25" : "glass hover:bg-white/10"
              }`}
            >
              {s.time}
            </button>
          );
        })}
        {slots.length === 0 && (
          <div className="col-span-3 glass p-6 text-center text-sm text-muted-foreground">
            Selecione data e serviço.
          </div>
        )}
      </div>

      {draft.date && svc && (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setWaitOpen(true)}
            className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-4 text-left shadow-[0_8px_24px_-12px] shadow-primary/40 transition hover:border-primary/70 hover:bg-primary/10"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
              <ListPlus size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground">
                O horário que você precisa já está preenchido?
              </div>
              <div className="text-xs font-medium text-primary">
                Entre na fila de espera →
              </div>
            </div>
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Te avisamos se abrir vaga no período que você quer.
          </p>
        </div>
      )}

      <div className="glass mt-6 space-y-2 p-5 text-sm">
        <Row label="Profissional" value={pro?.name || "—"} />
        <Row label="Serviço" value={svc?.name || "—"} />
        <Row label="Data" value={draft.date ? formatDate(draft.date) : "—"} />
        <Row label="Horário" value={draft.time || "—"} />
        <Row label="Duração" value={dur ? `${dur} min` : "—"} />
        {svc && <Row label="Total" value={`R$${svc.price}`} highlight />}
      </div>

      <WaitlistDialog
        open={waitOpen}
        onOpenChange={setWaitOpen}
        draft={draft}
        service={svc}
        professional={pro}
      />
    </div>
  );
}

function WaitlistDialog({
  open,
  onOpenChange,
  draft,
  service,
  professional,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  draft: Draft;
  service?: Service;
  professional?: Professional;
}) {
  const navigate = useNavigate();
  const [windowType, setWindowType] = useState<"any" | "range">("any");
  const [startT, setStartT] = useState("09:00");
  const [endT, setEndT] = useState("12:00");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!draft.date || !draft.name || !draft.whatsapp || !service) {
      toast.error("Faltam dados para entrar na fila.");
      return;
    }
    if (windowType === "range" && (!startT || !endT || startT >= endT)) {
      toast.error("Informe um intervalo de horário válido.");
      return;
    }
    setSaving(true);
    const tenantId = getCurrentTenantId();
    const { error } = await supabase.from("waitlist").insert({
      tenant_id: tenantId,
      date: draft.date,
      client_name: draft.name,
      whatsapp: draft.whatsapp.replace(/\D/g, ""),
      email: draft.email || null,
      service_id: service.id,
      service_name: service.name,
      professional_id: professional?.id || null,
      professional_name: professional?.name || null,
      window_type: windowType,
      window_start: windowType === "range" ? startT : null,
      window_end: windowType === "range" ? endT : null,
      notes: notes || null,
      status: "waiting",
    } as any);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível entrar na fila. Tente novamente.");
      return;
    }
    toast.success("Você está na fila! Vamos te avisar se abrir vaga.");
    onOpenChange(false);
    clearDraft();
    navigate({ to: tenantHref("/") as any });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-glass-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fila de espera</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Se abrir um horário em <strong className="text-foreground">{draft.date ? formatDate(draft.date) : "—"}</strong>, o salão entra em contato.
          </p>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Disponibilidade</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWindowType("any")}
                className={`rounded-2xl p-3 text-sm font-medium transition ${windowType === "any" ? "btn-primary" : "glass"}`}
              >
                O dia todo
              </button>
              <button
                type="button"
                onClick={() => setWindowType("range")}
                className={`rounded-2xl p-3 text-sm font-medium transition ${windowType === "range" ? "btn-primary" : "glass"}`}
              >
                Horário específico
              </button>
            </div>
          </div>

          {windowType === "range" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">De</label>
                <input
                  type="time"
                  value={startT}
                  onChange={(e) => setStartT(e.target.value)}
                  className="input-glass !pl-4"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Até</label>
                <input
                  type="time"
                  value={endT}
                  onChange={(e) => setEndT(e.target.value)}
                  className="input-glass !pl-4"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Observações (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: prefiro depois do almoço, posso ir correndo se chamar..."
              rows={3}
              className="input-glass !pl-4 !py-3 !h-auto resize-none"
            />
          </div>

          <PrimaryButton onClick={submit} disabled={saving} icon={<Check size={18} />}>
            {saving ? "Enviando…" : "Confirmar entrada na fila"}
          </PrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 whitespace-nowrap text-muted-foreground" translate="no">
        {label}
      </span>
      <span className={`min-w-0 truncate text-right ${highlight ? "text-lg font-bold text-primary" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}
function formatDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

function BlockedScreen() {
  return (
    <AppShell>
      <div className="flex min-h-[80vh] flex-col items-center justify-center text-center animate-fade-up">
        <div className="glass flex h-20 w-20 items-center justify-center rounded-full">
          <AlertCircle size={36} className="text-muted-foreground" />
        </div>
        <h2 className="mt-6 font-display text-3xl">Agendamento indisponível no momento</h2>
        <p className="mt-3 max-w-xs text-sm text-muted-foreground">
          Entre em contato com o estabelecimento para mais informações.
        </p>
        //{" "}
        {/*<Link to="/" className="mt-8 w-full max-w-xs">
          <PrimaryButton variant="ghost">Voltar ao início</PrimaryButton>
        </Link>*/}
      </div>
    </AppShell>
  );
}

/* ---------------- LOCALIZAÇÃO ---------------- */
function maskCep(v: string) {
  const d = (v || "").replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function LocalizacaoStep({ draft, update }: { draft: Draft; update: (d: Draft) => void }) {
  const [loading, setLoading] = useState(false);
  const [cepError, setCepError] = useState("");

  const lookupCep = async (raw: string) => {
    const cep = raw.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setLoading(true);
    setCepError("");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data?.erro) {
        setCepError("CEP não encontrado.");
        setLoading(false);
        return;
      }
      update({
        cep: maskCep(raw),
        street: data.logradouro || draft.street || "",
        neighborhood: data.bairro || draft.neighborhood || "",
        city: data.localidade || "",
        state: data.uf || "",
      });
    } catch {
      setCepError("Não foi possível buscar o CEP. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="font-display text-3xl">Onde te encontramos?</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Informe o endereço completo para o atendimento.
      </p>
      <div className="mt-6 space-y-4">
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
          </span>
          <input
            className="input-glass"
            value={draft.cep || ""}
            onChange={(e) => {
              const v = maskCep(e.target.value);
              update({ cep: v });
              if (v.replace(/\D/g, "").length === 8) lookupCep(v);
            }}
            placeholder="CEP (00000-000)"
            inputMode="numeric"
          />
        </div>
        {cepError && (
          <div className="glass flex items-center gap-2 p-3 text-xs text-destructive">
            <AlertCircle size={14} /> {cepError}
          </div>
        )}

        <input
          className="input-glass !pl-4"
          value={draft.street || ""}
          onChange={(e) => update({ street: e.target.value })}
          placeholder="Rua / Avenida"
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            className="input-glass !pl-4"
            value={draft.number || ""}
            onChange={(e) => update({ number: e.target.value })}
            placeholder="Número"
          />
          <input
            className="input-glass !pl-4"
            value={draft.complement || ""}
            onChange={(e) => update({ complement: e.target.value })}
            placeholder="Complemento (opcional)"
          />
        </div>

        <input
          className="input-glass !pl-4"
          value={draft.neighborhood || ""}
          onChange={(e) => update({ neighborhood: e.target.value })}
          placeholder="Bairro"
        />

        <div className="grid grid-cols-[1fr_100px] gap-3">
          <input
            className="input-glass !pl-4"
            value={draft.city || ""}
            onChange={(e) => update({ city: e.target.value })}
            placeholder="Cidade"
          />
          <input
            className="input-glass !pl-4 uppercase"
            value={draft.state || ""}
            onChange={(e) => update({ state: e.target.value.toUpperCase().slice(0, 2) })}
            placeholder="UF"
            maxLength={2}
          />
        </div>
      </div>
    </div>
  );
}
