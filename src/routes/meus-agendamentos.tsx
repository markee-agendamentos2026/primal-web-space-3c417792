import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, Trash2, Search, Clock } from "lucide-react";
import { cancelBooking, getMyWhatsapp, getMyWhatsapps, isClientActive, rememberMyWhatsapp, maskPhone, isValidPhone, normalizePhone } from "@/lib/store";
import { tenantHref, getCurrentTenantId, tenantRealtimeFilter, DEFAULT_TENANT_SLUG } from "@/lib/tenant";
import { ConfirmCancelDialog } from "@/components/ConfirmCancelDialog";
import { MaintenanceDialog } from "@/components/MaintenanceDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/meus-agendamentos")({
  beforeLoad: () => { throw redirect({ to: "/b/$slug/meus-agendamentos", params: { slug: DEFAULT_TENANT_SLUG } }); },
  component: MyBookings,
  head: () => ({ meta: [{ title: "Meus agendamentos — Ronielson Hair" }] }),
});

type ListItem = {
  id: string;
  kind: "booking" | "waitlist";
  date: string;
  sortTime: string;
  whatsapp: string;
  service_name: string;
  professional_name: string | null;
  time?: string;
  client_address_full?: string | null;
  status?: "waiting" | "scheduled";
  window_type?: "any" | "range";
  window_start?: string | null;
  window_end?: string | null;
};

export function MyBookings() {
  const [whatsapp, setWhatsapp] = useState("");
  const [items, setItems] = useState<ListItem[]>([]);
  const [searched, setSearched] = useState(false);
  const [confirmId, setConfirmId] = useState<{ id: string; kind: "booking" | "waitlist"; whatsapp: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchPhone, setSearchPhone] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const navigate = useNavigate();

  const doSearch = async () => {
    if (!isValidPhone(searchPhone)) { toast.error("Digite um WhatsApp válido."); return; }
    setSearchLoading(true);
    const w = normalizePhone(searchPhone);
    const ok = await isClientActive(w);
    if (!ok) { setSearchLoading(false); setSearchOpen(false); setBlockedOpen(true); return; }
    rememberMyWhatsapp(w);
    setWhatsapp(w);
    await load(w);
    setSearchLoading(false);
    setSearchOpen(false);
  };

  const todayBR = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const visibleItems = showAll ? items : items.filter((b) => b.date >= todayBR);

  useEffect(() => {
    const w = getMyWhatsapp();
    if (w) {
      setWhatsapp(w);
      isClientActive(w).then((ok) => {
        if (!ok) { setBlockedOpen(true); return; }
        load(w);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!whatsapp) return;
    const tenantId = getCurrentTenantId();
    const tf = tenantRealtimeFilter(tenantId);
    const channel = supabase
      .channel(`mybookings-${tenantId}-${whatsapp}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: tf }, () => load(whatsapp))
      .on("postgres_changes", { event: "*", schema: "public", table: "waitlist", filter: tf }, () => load(whatsapp))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [whatsapp]);

  const load = async (w: string) => {
    if (!w) return;
    const phones = Array.from(new Set([w, ...getMyWhatsapps()].map(normalizePhone).filter(Boolean)));
    const tenantId = getCurrentTenantId();

    const [bookingResults, waitlistResults] = await Promise.all([
      Promise.all(phones.map((p) => supabase.rpc("get_bookings_by_whatsapp", { _whatsapp: p, _tenant_id: tenantId }))),
      Promise.all(phones.map((p) => supabase.rpc("get_waitlist_by_whatsapp" as any, { _whatsapp: p, _tenant_id: tenantId }))),
    ]);

    const merged: ListItem[] = [];
    const seen = new Set<string>();

    for (const r of bookingResults) {
      for (const b of ((r.data as any[]) ?? [])) {
        if (b.status === "cancelled") continue;
        const key = `b:${b.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push({
          id: b.id, kind: "booking", date: b.date,
          sortTime: (b.time || "00:00").slice(0, 5),
          whatsapp: b.whatsapp, service_name: b.service_name,
          professional_name: b.professional_name, time: b.time,
          client_address_full: b.client_address_full,
        });
      }
    }

    for (const r of waitlistResults) {
      for (const w of ((r.data as any[]) ?? [])) {
        if (w.status === "cancelled") continue;
        const key = `w:${w.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push({
          id: w.id, kind: "waitlist", date: w.date,
          sortTime: (w.window_start || "00:00").slice(0, 5),
          whatsapp: w.whatsapp,
          service_name: w.service_name || "Serviço",
          professional_name: w.professional_name,
          status: w.status, window_type: w.window_type,
          window_start: w.window_start, window_end: w.window_end,
        });
      }
    }

    merged.sort((a, b) => (a.date + a.sortTime).localeCompare(b.date + b.sortTime));
    setItems(merged);
    setSearched(true);
  };

  const doCancel = async () => {
    if (!confirmId) return;
    setCancelling(true);
    const prev = items;
    setItems((b) => b.filter((x) => !(x.id === confirmId.id && x.kind === confirmId.kind)));
    let errMsg: string | undefined;
    if (confirmId.kind === "booking") {
      errMsg = await cancelBooking(confirmId.id, confirmId.whatsapp);
    } else {
      const { data, error } = await supabase.rpc("cancel_waitlist" as any, { _id: confirmId.id, _whatsapp: confirmId.whatsapp });
      if (error || data === false) errMsg = error?.message || "Não foi possível remover da fila.";
    }
    setCancelling(false);
    setConfirmId(null);
    if (errMsg) {
      setItems(prev);
      toast.error(errMsg || "Não foi possível cancelar. Tente novamente.");
      return;
    }
    toast.success(confirmId.kind === "booking" ? "Agendamento cancelado" : "Removido da fila");
    load(whatsapp);
  };

  return (
    <AppShell>
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={async () => {
            const w = getMyWhatsapp();
            if (w) {
              const ok = await isClientActive(w);
              if (!ok) { setBlockedOpen(true); return; }
            }
            navigate({ to: tenantHref("/") as any });
          }}
          className="btn-ghost-glass inline-flex h-10 items-center gap-2 px-4 text-sm"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Meus agendamentos</span>
        <span className="w-16" />
      </header>

      <div className="mt-8 flex-1 animate-fade-up">
        <h1 className="font-display text-3xl whitespace-normal break-words" translate="no">Seus agendamentos</h1>

        {searched && items.length > 0 && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setShowAll((v) => !v)}
              className={`btn-ghost-glass inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs uppercase tracking-wider ${showAll ? "ring-1 ring-primary text-primary" : ""}`}
            >
              {showAll ? "Mostrar apenas próximos" : "Todos"}
            </button>
          </div>
        )}

        {(!whatsapp || (searched && visibleItems.length === 0)) && (
          <div className="glass mt-8 p-8 text-center">
            <Calendar size={36} className="mx-auto text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">
              {!whatsapp
                ? "Não encontramos agendamentos neste dispositivo. Você pode agendar agora ou pesquisar pelo seu WhatsApp."
                : items.length === 0
                ? "Nenhum agendamento encontrado para este dispositivo. Tente pesquisar pelo seu WhatsApp."
                : "Nenhum agendamento futuro. Clique em \"Todos\" para ver o histórico."}
            </p>
            <div className="mt-6 flex flex-col gap-4 items-center">
              <Link to={tenantHref("/agendar") as any}>
                <PrimaryButton icon={<Calendar size={18} />}>Agendar agora</PrimaryButton>
              </Link>
              <button
                type="button"
                onClick={() => { setSearchPhone(whatsapp ? maskPhone(whatsapp) : ""); setSearchOpen(true); }}
                className="btn-ghost-glass inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm"
              >
                <Search size={16} /> Pesquisar minha agenda
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {visibleItems.map((b) => {
            const isWaitlist = b.kind === "waitlist";
            const isPending = isWaitlist && b.status === "waiting";
            const isConfirmedWait = isWaitlist && b.status === "scheduled";
            const statusLabel = isPending ? "Pendente — fila de espera" : isConfirmedWait ? "Confirmado pelo salão" : null;
            const statusClass = isPending
              ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
              : isConfirmedWait
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              : "";
            const subline = isWaitlist
              ? `${b.professional_name || "—"} • ${formatPt(b.date)} • ${
                  b.window_type === "any" ? "o dia todo" : `${(b.window_start || "").slice(0, 5)}–${(b.window_end || "").slice(0, 5)}`
                }`
              : `${b.professional_name || "—"} • ${formatPt(b.date)}`;

            return (
              <div key={`${b.kind}:${b.id}`} className="glass flex items-center gap-4 p-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isWaitlist ? "bg-yellow-500/15 text-yellow-300" : "bg-primary/15 text-primary"}`}>
                  {isWaitlist ? <Clock size={20} /> : <Calendar size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold truncate">{b.service_name}</div>
                  <div className="text-xs text-muted-foreground truncate">{subline}</div>
                  {statusLabel && (
                    <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${statusClass}`}>
                      {statusLabel}
                    </span>
                  )}
                  {!isWaitlist && b.client_address_full && (
                    <div className="mt-1 text-[11px] text-muted-foreground/80 truncate">📍 {b.client_address_full}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">
                    {isWaitlist ? "Fila" : (b.time || "").slice(0, 5)}
                  </div>
                  {(isPending || !isWaitlist) && (
                    <button
                      onClick={() => setConfirmId({ id: b.id, kind: b.kind, whatsapp: b.whatsapp })}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={12} /> {isWaitlist ? "Sair da fila" : "Cancelar"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmCancelDialog
        open={!!confirmId}
        onOpenChange={(v) => !v && setConfirmId(null)}
        onConfirm={doCancel}
        loading={cancelling}
      />
      <MaintenanceDialog
        open={blockedOpen}
        onOpenChange={(v) => { setBlockedOpen(v); if (!v) navigate({ to: tenantHref("/") as any }); }}
      />
      <Dialog open={searchOpen} onOpenChange={(v) => { if (!searchLoading) setSearchOpen(v); }}>
        <DialogContent className="glass border-white/10 bg-background/80 backdrop-blur-xl sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
              <Search size={24} className="text-primary" />
            </div>
            <DialogTitle className="text-center font-display text-xl">Pesquisar minha agenda</DialogTitle>
          </DialogHeader>
          <p className="text-center text-sm text-muted-foreground">Digite o WhatsApp utilizado no agendamento.</p>
          <input
            type="tel" inputMode="numeric" autoFocus
            placeholder="(00) 00000-0000"
            value={searchPhone}
            onChange={(e) => setSearchPhone(maskPhone(e.target.value))}
            onKeyDown={(e) => { if (e.key === "Enter") doSearch(); }}
            className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-background/60 px-4 text-center text-base outline-none focus:border-primary"
          />
          <div className="mt-2">
            <PrimaryButton icon={<Search size={18} />} onClick={doSearch} disabled={searchLoading || !isValidPhone(searchPhone)}>
              {searchLoading ? "Buscando..." : "Pesquisar"}
            </PrimaryButton>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function formatPt(iso: string) {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}
