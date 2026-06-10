import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type Booking } from "@/lib/store";
import { getCurrentTenantId, tenantRealtimeFilter } from "@/lib/tenant";
import { Trash2, Calendar, ChevronLeft, ChevronRight, User2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { ConfirmCancelDialog } from "@/components/ConfirmCancelDialog";
import { WaitlistFab } from "@/components/WaitlistFab";

export const Route = createFileRoute("/b/$slug/painel/")({
  component: AgendaPage,
});

type View = "dia" | "semana" | "mes";

const HOUR_PX = 160;
const MIN_CARD_PX = 72;
const TIME_COL_PX = 56;
const DAY_COL_MIN_PX = 140; // largura mínima por coluna de dia
const MONTH_VISIBLE_DAYS = 14;

function AgendaPage() {
  const [view, setView] = useState<View>("dia");
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [items, setItems] = useState<Booking[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("20:00");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const bodyScrollRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    const { from, to } = rangeFor(view, cursor);
    const { data } = await supabase.from("bookings")
      .select("*").eq("tenant_id", getCurrentTenantId())
      .gte("date", from).lte("date", to).neq("status","cancelled")
      .order("date").order("time");
    setItems((data as any) ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [view, cursor]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("availability")
        .select("open_time, close_time")
        .eq("tenant_id", getCurrentTenantId())
        .maybeSingle();
      if (data) {
        setOpenTime((data.open_time as string)?.slice(0, 5) || "08:00");
        setCloseTime((data.close_time as string)?.slice(0, 5) || "20:00");
      }
    })();
  }, []);
  useEffect(() => {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return;
    const ch = supabase
      .channel(`painel-bookings-${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: tenantRealtimeFilter(tenantId) }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line
  }, []);

  const doCancel = async () => {
    if (!confirmId) return;
    setCancelling(true);
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", confirmId).eq("tenant_id", getCurrentTenantId());
    const err = error?.message;
    setCancelling(false);
    setConfirmId(null);
    if (err) {
      toast.error("Não foi possível cancelar. Tente novamente.");
      return;
    }
    toast.success("Agendamento cancelado");
    load();
  };

  const move = (dir: -1 | 1) => {
    const d = new Date(cursor);
    if (view === "dia") d.setDate(d.getDate() + dir);
    else if (view === "semana") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCursor(d);
  };

  const openMin = toMin(openTime);
  const closeMin = toMin(closeTime);
  const totalMin = Math.max(60, closeMin - openMin);
  const hours = useMemo(() => {
    const arr: string[] = [];
    for (let m = openMin; m <= closeMin; m += 60) arr.push(minToLabel(m));
    return arr;
  }, [openMin, closeMin]);

  const days = useMemo(() => buildDays(view, cursor), [view, cursor]);

  const todayBR = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const cursorIso = isoLocal(cursor);
  const isToday = cursorIso === todayBR;

  // Auto-scroll vertical p/ "agora" na visão Dia
  useEffect(() => {
    if (view !== "dia" || !isToday || !scrollRef.current) return;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    if (nowMin < openMin || nowMin > closeMin) return;
    const offset = ((nowMin - openMin) / 60) * HOUR_PX - 120;
    let el: HTMLElement | null = scrollRef.current;
    while (el && el !== document.body) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight) {
        const rect = scrollRef.current.getBoundingClientRect();
        const parentRect = el.getBoundingClientRect();
        el.scrollTo({ top: el.scrollTop + (rect.top - parentRect.top) + Math.max(0, offset), behavior: "smooth" });
        return;
      }
      el = el.parentElement;
    }
    window.scrollTo({ top: (scrollRef.current.getBoundingClientRect().top + window.scrollY) + Math.max(0, offset), behavior: "smooth" });
  }, [view, isToday, openMin, closeMin, items.length]);

  // Sync scroll horizontal entre a barra superior (desktop) e o corpo
  useEffect(() => {
    const top = topScrollRef.current;
    const body = bodyScrollRef.current;
    if (!top || !body) return;
    let syncing = false;
    const onTop = () => { if (syncing) return; syncing = true; body.scrollLeft = top.scrollLeft; syncing = false; };
    const onBody = () => { if (syncing) return; syncing = true; top.scrollLeft = body.scrollLeft; syncing = false; };
    top.addEventListener("scroll", onTop, { passive: true });
    body.addEventListener("scroll", onBody, { passive: true });
    return () => { top.removeEventListener("scroll", onTop); body.removeEventListener("scroll", onBody); };
  }, [view, days.length]);

  const nowOffset = (() => {
    const now = new Date();
    const m = now.getHours() * 60 + now.getMinutes();
    if (m < openMin || m > closeMin) return null;
    return ((m - openMin) / 60) * HOUR_PX;
  })();

  // Medir largura disponível para calcular colunas/scroll
  const [containerW, setContainerW] = useState(0);
  useEffect(() => {
    const el = bodyScrollRef.current;
    if (!el) return;
    const update = () => setContainerW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [view]);

  // Largura de coluna em px conforme a visão
  const colPx = useMemo(() => {
    if (view === "dia") return Math.max(0, containerW);
    if (view === "semana") return Math.max(150, containerW / 7);
    return Math.max(150, containerW / MONTH_VISIBLE_DAYS); // mês: 14 visíveis em telas largas, com mín. 150px
  }, [view, containerW]);


  const totalContentW = Math.round(colPx * days.length);
  const showHorizontalScroll = view !== "dia";


  return (
    <div>
      <WaitlistFab dateIso={cursorIso} />
      <h1 className="font-display text-3xl">Sua agenda</h1>

      <div className="glass mt-5 grid grid-cols-3 gap-1 p-1">
        {(["dia","semana","mes"] as View[]).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`h-10 rounded-xl text-sm capitalize transition ${view === v ? "btn-primary" : ""}`}>
            {v === "mes" ? "mês" : v}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button onClick={() => move(-1)} className="btn-ghost-glass h-9 w-9 rounded-full inline-flex items-center justify-center">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium capitalize">{labelFor(view, cursor)}</span>
        <button onClick={() => move(1)} className="btn-ghost-glass h-9 w-9 rounded-full inline-flex items-center justify-center">
          <ChevronRight size={18} />
        </button>
      </div>

      {items.length === 0 && (
        <div className="mt-6 p-10 text-center">
          <Calendar size={40} className="mx-auto text-primary" />
          <p className="mt-4 font-display text-lg">Sem agendamentos</p>
          <p className="mt-1 text-xs text-muted-foreground">Aproveite pra um café ☕</p>
        </div>
      )}

      <div ref={scrollRef} className="mt-5 -mx-4 sm:-mx-6 md:mx-0">
        {/* Header de dias (fixo) + área scrollável horizontalmente */}
        <div className="grid" style={{ gridTemplateColumns: `${TIME_COL_PX}px 1fr` }}>
          {/* canto vazio sobre a coluna de horas */}
          <div />

          {/* Cabeçalho dos dias + barra de scroll superior (desktop) */}
          <div className="min-w-0">
            {/* Linha de dias */}
            <div
              ref={view === "dia" ? undefined : (el) => { /* só visual */ }}
              className="overflow-hidden"
            >
              <div
                className="grid pb-2"
                style={{
                  gridTemplateColumns: view === "dia" ? "1fr" : `repeat(${days.length}, ${colPx}px)`,
                  width: showHorizontalScroll ? `${totalContentW}px` : "100%",
                }}

                // Espelha o scroll do body via ref dinâmico
                ref={(el) => {
                  if (!el) return;
                  // Atualiza translateX em todo scroll do body
                  const body = bodyScrollRef.current;
                  if (!body) return;
                  const update = () => { el.style.transform = `translateX(-${body.scrollLeft}px)`; };
                  update();
                  body.removeEventListener("scroll", (el as any)._handler || (() => {}));
                  (el as any)._handler = update;
                  body.addEventListener("scroll", update, { passive: true });
                }}
              >
                {days.map((d) => {
                  const iso = isoLocal(d);
                  const isCurrent = iso === todayBR;
                  return (
                    <div key={iso} className={`px-2 text-center ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                      <div className="text-[10px] font-semibold uppercase tracking-widest">
                        {d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                      </div>
                      <div className={`mt-0.5 inline-flex h-7 min-w-[28px] items-center justify-center rounded-full px-2 text-sm font-bold ${isCurrent ? "bg-primary text-primary-foreground" : ""}`}>
                        {d.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Barra de scroll suave (desktop only) */}
            {showHorizontalScroll && totalContentW > containerW && (
              <div ref={topScrollRef} className="h-scrollbar mb-2">
                <div style={{ width: `${totalContentW}px`, height: 1 }} />
              </div>
            )}

          </div>
        </div>

        {/* Corpo da timeline */}
        <div className="grid" style={{ gridTemplateColumns: `${TIME_COL_PX}px 1fr` }}>
          {/* Coluna de horários */}
          <div className="relative border-r border-white/10" style={{ height: (totalMin / 60) * HOUR_PX + 24 }}>
            {hours.map((h, i) => (
              <div
                key={h}
                className="absolute -translate-y-1/2 pr-2 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                style={{ top: i * HOUR_PX + 12, right: 0, left: 0 }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Container scrollável horizontalmente */}
          <div
            ref={bodyScrollRef}
            className={`min-w-0 ${showHorizontalScroll ? "overflow-x-auto scrollbar-none" : ""}`}
          >
            <div
              className="relative grid"
              style={{
                gridTemplateColumns: view === "dia" ? "1fr" : `repeat(${days.length}, ${colPx}px)`,
                height: (totalMin / 60) * HOUR_PX + 24,
                width: showHorizontalScroll ? `${totalContentW}px` : "100%",
              }}
            >

              {days.map((d, dayIdx) => {
                const iso = isoLocal(d);
                const dayItems = items.filter((b) => b.date === iso);
                const isCurrent = iso === todayBR;
                return (
                  <div
                    key={iso}
                    className={`relative ${dayIdx > 0 ? "border-l border-white/5" : ""}`}
                  >
                    {/* linhas de hora */}
                    {hours.map((_, i) => (
                      <div
                        key={i}
                        className="absolute left-0 right-0 border-t border-white/5"
                        style={{ top: i * HOUR_PX + 12 }}
                      />
                    ))}
                    {hours.slice(0, -1).map((_, i) => (
                      <div
                        key={`h-${i}`}
                        className="absolute left-0 right-0 border-t border-dashed border-white/[0.04]"
                        style={{ top: i * HOUR_PX + 12 + HOUR_PX / 2 }}
                      />
                    ))}

                    {/* linha de agora apenas no dia atual */}
                    {isCurrent && nowOffset !== null && (
                      <div
                        className="absolute left-0 right-1 z-10 flex items-center"
                        style={{ top: nowOffset + 12 }}
                      >
                        <span className="-ml-1 inline-block h-2 w-2 rounded-full bg-primary shadow-[0_0_10px] shadow-primary" />
                        <span className="ml-1 h-px flex-1 bg-primary/70" />
                      </div>
                    )}

                    {/* cards do dia */}
                    {layoutItems(dayItems, openMin, closeMin).map(({ b, start, dur, col, cols }) => {
                      const top = ((start - openMin) / 60) * HOUR_PX + 12;
                      const height = Math.max(MIN_CARD_PX, (dur / 60) * HOUR_PX - 4);
                      const compact = view !== "dia" || height < 90 || cols > 1;
                      const widthPct = 100 / cols;
                      const leftPct = col * widthPct;
                      const isDay = view === "dia";
                      return (
                        <div
                          key={b.id}
                          onClick={!isDay ? () => setConfirmId(b.id) : undefined}
                          className={`absolute overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-2 shadow-[0_8px_24px_-12px] shadow-primary/30 backdrop-blur ${!isDay ? "cursor-pointer hover:border-primary/60" : ""}`}
                          style={{
                            top,
                            height,
                            left: `calc(${leftPct}% + 4px)`,
                            width: `calc(${widthPct}% - 8px)`,
                          }}
                        >
                          <div className="absolute left-0 top-0 h-full w-1 bg-primary/70" />
                          <div className="flex h-full items-start gap-1.5 pl-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-primary">{(b.time || "").slice(0, 5)}</span>
                                <span className="text-[10px] text-muted-foreground">{dur}min</span>
                              </div>
                              <div className="mt-0.5 truncate text-xs font-semibold">
                                {(b as any).client_name_snapshot || b.client_name}
                              </div>
                              {!compact && (
                                <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                  {b.service_name}
                                </div>
                              )}
                              {!compact && b.professional_name && (
                                <div className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted-foreground/80">
                                  <User2 size={10} /> {b.professional_name}
                                </div>
                              )}
                              {!compact && (b as any).client_address_full && (
                                <div
                                  className="mt-0.5 flex items-start gap-1 text-[10px] text-muted-foreground/80"
                                  title={(b as any).client_address_full}
                                >
                                  <MapPin size={10} className="mt-px shrink-0" />
                                  <span className="truncate">{(b as any).client_address_full}</span>
                                </div>
                              )}
                            </div>
                            {isDay && (
                              <button
                                onClick={() => setConfirmId(b.id)}
                                className="shrink-0 rounded-full p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                                aria-label="Cancelar"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <ConfirmCancelDialog
        open={!!confirmId}
        onOpenChange={(v) => !v && setConfirmId(null)}
        onConfirm={doCancel}
        loading={cancelling}
        description="Você realmente deseja cancelar este agendamento?"
        confirmText="Sim, cancelar"
        cancelText="Não"
      />
    </div>
  );
}

function toMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(d.getDate() + n);
  return x;
}

function buildDays(v: View, cursor: Date): Date[] {
  if (v === "dia") return [cursor];
  if (v === "semana") return Array.from({ length: 7 }, (_, i) => addDays(cursor, i));
  // mês: do cursor até o fim do mês; garante mínimo de 28 dias p/ scroll suave passar dos 14 visíveis
  const endOfMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const startDay = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
  const remaining = Math.round((endOfMonth.getTime() - startDay.getTime()) / 86400000) + 1;
  const total = Math.max(28, remaining);
  return Array.from({ length: total }, (_, i) => addDays(startDay, i));
}


type LaidOut = { b: Booking; start: number; end: number; dur: number; col: number; cols: number };
function layoutItems(items: Booking[], openMin: number, closeMin: number): LaidOut[] {
  const prepared = items
    .map((b) => {
      const start = toMin((b.time || "00:00").slice(0, 5));
      const dur = Math.max(20, b.duration_min || 30);
      return { b, start, end: start + dur, dur };
    })
    .filter((x) => !(x.end < openMin || x.start > closeMin))
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const result: LaidOut[] = [];
  let cluster: LaidOut[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const cols = Math.max(...cluster.map((c) => c.col)) + 1;
    cluster.forEach((c) => { c.cols = cols; });
    cluster = [];
    clusterEnd = -1;
  };
  for (const s of prepared) {
    if (cluster.length && s.start >= clusterEnd) flush();
    const used = new Set(cluster.filter((c) => c.end > s.start).map((c) => c.col));
    let col = 0;
    while (used.has(col)) col++;
    const item: LaidOut = { ...s, col, cols: 1 };
    cluster.push(item);
    result.push(item);
    clusterEnd = Math.max(clusterEnd, s.end);
  }
  if (cluster.length) flush();
  return result;
}
function minToLabel(m: number) {
  const h = Math.floor(m / 60).toString().padStart(2, "0");
  const mm = (m % 60).toString().padStart(2, "0");
  return `${h}:${mm}`;
}
function isoLocal(d: Date) {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function rangeFor(v: View, d: Date) {
  if (v === "dia") return { from: isoLocal(d), to: isoLocal(d) };
  if (v === "semana") {
    const end = addDays(d, 6);
    return { from: isoLocal(d), to: isoLocal(end) };
  }
  const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const startDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const remaining = Math.round((endOfMonth.getTime() - startDay.getTime()) / 86400000) + 1;
  const total = Math.max(28, remaining);
  return { from: isoLocal(startDay), to: isoLocal(addDays(startDay, total - 1)) };
}
function labelFor(v: View, d: Date) {
  if (v === "dia") return d.toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"long" });
  if (v === "mes") {
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const startDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const remaining = Math.round((endOfMonth.getTime() - startDay.getTime()) / 86400000) + 1;
    const end = addDays(startDay, Math.max(28, remaining) - 1);
    return `${startDay.getDate()}/${startDay.getMonth() + 1} – ${end.getDate()}/${end.getMonth() + 1}`;
  }
  const end = addDays(d, 6);
  return `${d.getDate()} – ${end.getDate()} ${end.toLocaleDateString("pt-BR",{ month:"short" })}`;
}

