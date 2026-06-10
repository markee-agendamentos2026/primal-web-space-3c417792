import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Users, Phone, MessageCircle, ChevronLeft, Trash2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentTenantId, tenantRealtimeFilter } from "@/lib/tenant";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { toast } from "sonner";

type WaitlistEntry = {
  id: string;
  tenant_id: string;
  date: string;
  client_name: string;
  whatsapp: string;
  email: string | null;
  service_id: string | null;
  service_name: string | null;
  professional_id: string | null;
  professional_name: string | null;
  window_type: "any" | "range";
  window_start: string | null;
  window_end: string | null;
  notes: string | null;
  status: "waiting" | "scheduled" | "cancelled";
  created_at: string;
};

function formatBRDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

function digitsOnly(p: string) {
  return (p || "").replace(/\D/g, "");
}

function formatPhone(p: string) {
  const d = digitsOnly(p);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return p;
}

export function WaitlistFab({ dateIso }: { dateIso: string }) {
  const [items, setItems] = useState<WaitlistEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<WaitlistEntry | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const load = async () => {
    const { data } = await supabase
      .from("waitlist")
      .select("*")
      .eq("tenant_id", getCurrentTenantId())
      .eq("date", dateIso)
      .eq("status", "waiting")
      .order("created_at", { ascending: true });
    setItems((data as any) ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [dateIso]);

  useEffect(() => {
    const tenantId = getCurrentTenantId();
    const ch = supabase
      .channel(`waitlist-fab-${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "waitlist", filter: tenantRealtimeFilter(tenantId) }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line
  }, [dateIso]);

  const count = items.length;

  const updateStatus = async (id: string, status: "scheduled" | "cancelled") => {
    const { error } = await supabase.from("waitlist").update({ status }).eq("id", id).eq("tenant_id", getCurrentTenantId());
    if (error) {
      toast.error("Não foi possível atualizar.");
      return;
    }
    toast.success(status === "scheduled" ? "Cliente confirmado e encaixado." : "Removido da fila.");
    setSelected(null);
    load();
  };

  // Render trigger via portal so it escapes any ancestor `transform`
  // (e.g. `animate-fade-up`), which would otherwise turn `position: fixed`
  // into a containing-block-bound element that scrolls with the page.
  const trigger = (
    <button
      type="button"
      aria-label="Fila de espera do dia"
      onClick={() => setOpen(true)}
      className="fixed top-4 left-[68px] z-[60] inline-flex h-11 items-center gap-2 rounded-full shadow-lg shadow-black/40 bg-neutral-950/70 backdrop-blur-xl border border-white/10 text-foreground px-3"
    >
      <Users size={16} className="text-primary" />
      <span className="text-xs font-medium">Fila</span>
      <span
        className={`inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
          count > 0 ? "bg-primary text-primary-foreground" : "bg-white/10 text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </button>
  );

  return (
    <>
      {mounted && createPortal(trigger, document.body)}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="bg-neutral-950/95 backdrop-blur-xl border-r border-white/10 text-foreground w-full sm:max-w-md overflow-y-auto"
        >
          {!selected ? (
            <div className="mt-2">
              <h2 className="font-display text-2xl">Fila de espera</h2>
              <p className="mt-1 text-xs text-muted-foreground capitalize">{formatBRDate(dateIso)}</p>

              <div className="mt-6 space-y-2">
                {items.length === 0 && (
                  <div className="glass p-6 text-center text-sm text-muted-foreground">
                    Ninguém na fila para este dia.
                  </div>
                )}
                {items.map((it, idx) => (
                  <button
                    key={it.id}
                    onClick={() => setSelected(it)}
                    className="glass flex w-full items-center gap-3 p-4 text-left hover:bg-white/5 transition"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{it.client_name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {it.service_name || "Serviço"} ·{" "}
                        {it.window_type === "any"
                          ? "Dia todo"
                          : `${(it.window_start || "").slice(0, 5)}–${(it.window_end || "").slice(0, 5)}`}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <button
                onClick={() => setSelected(null)}
                className="btn-ghost-glass inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs"
              >
                <ChevronLeft size={14} /> Voltar
              </button>

              <h2 className="mt-4 font-display text-2xl">{selected.client_name}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Na fila desde{" "}
                {new Date(selected.created_at).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>

              <div className="glass mt-5 space-y-3 p-5 text-sm">
                <Row label="Serviço" value={selected.service_name || "—"} />
                {selected.professional_name && <Row label="Profissional" value={selected.professional_name} />}
                <Row label="Data" value={formatBRDate(selected.date)} />
                <Row
                  label="Janela"
                  value={
                    selected.window_type === "any"
                      ? "O dia todo"
                      : `${(selected.window_start || "").slice(0, 5)} às ${(selected.window_end || "").slice(0, 5)}`
                  }
                />
                <Row label="WhatsApp" value={formatPhone(selected.whatsapp)} />
                {selected.email && <Row label="E-mail" value={selected.email} />}
                {selected.notes && (
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Observações</div>
                    <p className="mt-1 whitespace-pre-wrap">{selected.notes}</p>
                  </div>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <a
                  href={`tel:+55${digitsOnly(selected.whatsapp)}`}
                  className="btn-ghost-glass flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-medium"
                >
                  <Phone size={16} /> Ligar
                </a>
                <a
                  href={`https://wa.me/55${digitsOnly(selected.whatsapp)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost-glass flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-medium"
                >
                  <MessageCircle size={16} /> WhatsApp
                </a>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateStatus(selected.id, "scheduled")}
                  className="btn-primary flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-semibold"
                >
                  <Check size={16} /> Confirmar encaixe
                </button>
                <button
                  onClick={() => updateStatus(selected.id, "cancelled")}
                  className="glass flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-medium text-destructive"
                >
                  <Trash2 size={14} /> Remover
                </button>
              </div>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Confirmar avisa o cliente em "Meus agendamentos" como confirmado.
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-medium">{value}</span>
    </div>
  );
}
