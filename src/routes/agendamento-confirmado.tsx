import { createFileRoute, useNavigate, useSearch, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { CheckCircle2, MapPin, Copy, ListChecks, Trash2, Home, Clock, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAvailability, cancelBooking, isClientActive, type Booking, type Availability } from "@/lib/store";
import { tenantHref, DEFAULT_TENANT_SLUG, getCurrentTenantId } from "@/lib/tenant";
import { toast } from "sonner";
import { ConfirmCancelDialog } from "@/components/ConfirmCancelDialog";
import { MaintenanceDialog } from "@/components/MaintenanceDialog";
import { useServerFn } from "@tanstack/react-start";
import { getWaFreePublicConfig } from "@/lib/wa-free.functions";
import { renderWaTemplate, waMeLink } from "@/lib/wa-free";


const search = z.object({ id: z.string().optional() });
export const confirmedSearchSchema = search;

export const Route = createFileRoute("/agendamento-confirmado")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/b/$slug/agendamento-confirmado", params: { slug: DEFAULT_TENANT_SLUG }, search: search as any });
  },
  validateSearch: search,
  component: ConfirmedPage,
  head: () => ({ meta: [{ title: "Agendamento confirmado — Ronielson Hair" }] }),
});

export function ConfirmedPage() {
  // Funciona tanto em /agendamento-confirmado quanto em /b/$slug/agendamento-confirmado
  const sp = useSearch({ strict: false }) as { id?: string };
  const id = sp.id;
  const nav = useNavigate();
  const [b, setB] = useState<Booking | null>(null);
  const [av, setAv] = useState<Availability | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [waLink, setWaLink] = useState<string | null>(null);
  const fnWa = useServerFn(getWaFreePublicConfig);

  const guardedGo = async (to: string) => {
    if (b?.whatsapp) {
      const ok = await isClientActive(b.whatsapp);
      if (!ok) { setBlockedOpen(true); return; }
    }
    nav({ to: tenantHref(to) as any });
  };


  useEffect(() => {
    if (!id) return;
    const tenantId = getCurrentTenantId();
    supabase
      .rpc("get_booking_by_id", { _id: id, _tenant_id: tenantId || null })
      .then(({ data }) => setB(data as any));
    fetchAvailability().then(setAv);
  }, [id]);

  useEffect(() => {
    if (!b) return;
    const tenantId = getCurrentTenantId();
    if (!tenantId) return;
    fnWa({ data: { tenant_id: tenantId } }).then((r) => {
      if (!r.enabled || !r.tenant) return;
      const msg = renderWaTemplate(r.tenant.wa_free_confirm_template ?? "", {
        cliente: b.client_name, servico: b.service_name,
        data: b.date, hora: b.time,
        profissional: b.professional_name, negocio: r.tenant.name,
      });
      // Cliente confirma com o NEGÓCIO → link aponta para o owner_phone
      setWaLink(waMeLink(r.tenant.owner_phone, msg));
    }).catch(() => {});
  }, [b, fnWa]);

  const doCancel = async () => {
    if (!b) return;
    setCancelling(true);
    const err = await cancelBooking(b.id, b.whatsapp);
    setCancelling(false);
    setConfirmOpen(false);
    if (err) {
      toast.error("Não foi possível cancelar. Tente novamente.");
      return;
    }
    toast.success("Agendamento cancelado");
    nav({ to: tenantHref("/") as any });
  };
  const copyAddress = async () => {
    if (av?.address) {
      await navigator.clipboard.writeText(av.address);
      toast.success("Endereço copiado");
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col items-center pt-6 text-center animate-fade-up">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/40 blur-2xl" />
          <CheckCircle2 size={88} className="relative text-primary" />
        </div>
        <h2 className="mt-6 font-display text-3xl">Agendamento confirmado</h2>
        <p className="mt-2 text-sm text-muted-foreground">Te esperamos no studio.</p>

        {b ? (
          <>
            <div className="glass mt-6 w-full space-y-2 p-5 text-left text-sm">
              <Row label="Profissional" value={b.professional_name || "—"} />
              <Row label="Serviço" value={b.service_name} />
              <Row label="Data" value={formatDate(b.date)} />
              <Row label="Horário" value={b.time.slice(0,5)} />
              <Row label="Duração" value={`${b.duration_min} min`} />
              <Row label="Total" value={`R$${b.price}`} highlight />
            </div>
            {(b as any).client_address_full && (
              <div className="glass mt-4 w-full p-5 text-left">
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="text-primary mt-0.5" size={20} />
                  <div className="flex-1">
                    <div className="font-semibold">Endereço de atendimento</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {(b as any).client_address_full}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="glass mt-6 w-full p-6 text-sm text-muted-foreground">Carregando…</div>
        )}

        {av?.address && (
          <div className="glass mt-4 w-full p-5 text-left">
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="text-primary mt-0.5" size={20} />
              <div className="flex-1">
                <div className="font-semibold">{av.business_name || "Studio"}</div>
                <div className="text-xs text-muted-foreground">{av.address}</div>
              </div>
              <button onClick={copyAddress} className="btn-ghost-glass inline-flex h-9 items-center gap-1 px-3 text-xs">
                <Copy size={12} /> Copiar
              </button>
            </div>
            {av.maps_url && (
              <a href={av.maps_url} target="_blank" rel="noreferrer" className="mt-4 block">
                <PrimaryButton icon={<MapPin size={18} />}>Abrir no Google Maps</PrimaryButton>
              </a>
            )}
          </div>
        )}

        <div className="mt-6 w-full flex flex-col gap-4">
          {waLink && (
            <a href={waLink} target="_blank" rel="noreferrer" className="block w-full">
              <PrimaryButton icon={<MessageCircle size={18} />}>Confirmar no WhatsApp</PrimaryButton>
            </a>
          )}
          <button type="button" onClick={() => guardedGo("/meus-agendamentos")} className="block w-full text-left">
            <PrimaryButton icon={<ListChecks size={18} />}>Meus agendamentos</PrimaryButton>
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            className="btn-ghost-glass flex h-14 w-full items-center justify-center gap-2 px-4 text-sm text-destructive"
          >
            <Trash2 size={16} /> Cancelar agendamento
          </button>
          <button type="button" onClick={() => guardedGo("/")} className="block w-full text-left">
            <PrimaryButton variant="ghost" icon={<Home size={18} />}>Voltar ao início</PrimaryButton>
          </button>
        </div>
      </div>
      <ConfirmCancelDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={doCancel}
        loading={cancelling}
      />
      <MaintenanceDialog open={blockedOpen} onOpenChange={setBlockedOpen} />

    </AppShell>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "text-lg font-bold text-primary" : "font-medium"}>{value}</span>
    </div>
  );
}
function formatDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}
