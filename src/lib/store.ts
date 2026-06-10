// Domain types + helpers backed by Supabase. Replaces the old localStorage store.
import { supabase } from "@/integrations/supabase/client";
import { getCurrentTenantId } from "@/lib/tenant";

export type Service = {
  id: string; name: string; duration_min: number; price: number;
  emoji: string | null; photo_url: string | null; active: boolean;
  sort_order: number; promo_pct: number | null;
  promo_starts_at: string | null; promo_ends_at: string | null;
};

export type Professional = {
  id: string; name: string; role: string | null; photo_url: string | null;
  active: boolean; user_id: string | null;
};

export type Booking = {
  id: string; client_name: string; whatsapp: string; email: string | null;
  professional_id: string | null; service_id: string | null;
  service_name: string; professional_name: string | null;
  date: string; time: string; duration_min: number; price: number;
  status: "pending" | "confirmed" | "cancelled" | "done"; created_at: string;
};

export type Availability = {
  open_time: string; close_time: string; days_enabled: boolean[];
  lunch_enabled: boolean;
  lunch_start: string | null; lunch_end: string | null;
  min_lead_min: number; max_future_days: number;
  cancel_min_lead_enabled: boolean; cancel_min_lead_min: number;
  require_pro_selection: boolean;
  business_name: string | null; address: string | null;
  maps_url: string | null; whatsapp_url: string | null;
  instagram_url: string | null; facebook_url: string | null;
  logo_url: string | null;
};

// Booking draft stored in localStorage for UX continuity
const DRAFT_KEY = "rh_draft";
export type Draft = Partial<{
  name: string; whatsapp: string; email: string; terms: boolean;
  proId: string; serviceId: string; date: string; time: string;
  cep: string; street: string; number: string; complement: string;
  neighborhood: string; city: string; state: string;
}>;
export function getDraft(): Draft {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}"); } catch { return {}; }
}
export function setDraft(d: Draft) {
  const cur = getDraft();
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...cur, ...d }));
}
export function clearDraft() { localStorage.removeItem(DRAFT_KEY); }

// "My bookings" identity (whatsapp) saved locally for /meus-agendamentos
// Keeps a LIST of every whatsapp used on this device so a person can see all
// bookings made from this phone, even if they used different numbers.
const MY_KEY = "rh_my_whatsapp";       // last used (back-compat)
const MY_LIST_KEY = "rh_my_whatsapps"; // full history
export function rememberMyWhatsapp(w: string) {
  const wa = normalizePhone(w);
  if (!wa) return;
  localStorage.setItem(MY_KEY, wa);
  try {
    const list: string[] = JSON.parse(localStorage.getItem(MY_LIST_KEY) || "[]");
    if (!list.includes(wa)) {
      list.push(wa);
      localStorage.setItem(MY_LIST_KEY, JSON.stringify(list));
    }
  } catch {
    localStorage.setItem(MY_LIST_KEY, JSON.stringify([wa]));
  }
}
export function getMyWhatsapp() { return typeof window !== "undefined" ? localStorage.getItem(MY_KEY) || "" : ""; }
export function getMyWhatsapps(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const list: string[] = JSON.parse(localStorage.getItem(MY_LIST_KEY) || "[]");
    const last = localStorage.getItem(MY_KEY);
    if (last && !list.includes(last)) list.push(last);
    return list.filter(Boolean);
  } catch {
    const last = localStorage.getItem(MY_KEY);
    return last ? [last] : [];
  }
}

// Phone mask BR
export function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}
export function isValidPhone(v: string) { return v.replace(/\D/g, "").length === 11; }
export function normalizePhone(v: string) { return (v || "").replace(/\D/g, ""); }

// Availability fetch (per tenant)
export async function fetchAvailability(): Promise<Availability> {
  const tenantId = getCurrentTenantId();
  const { data } = await supabase.from("availability").select("*").eq("tenant_id", tenantId).maybeSingle();
  return (data as any) ?? {
    open_time: "08:00", close_time: "20:00",
    days_enabled: [false,true,true,true,true,true,true],
    lunch_enabled: false,
    lunch_start: null, lunch_end: null,
    min_lead_min: 30, max_future_days: 60,
    cancel_min_lead_enabled: true, cancel_min_lead_min: 60,
    require_pro_selection: true,
    business_name: null, address: null, maps_url: null,
    whatsapp_url: null, instagram_url: null, facebook_url: null,
    logo_url: null,
  };
}

// Build slot list every 30min, taking into account availability + bookings + blocks
export function generateSlots(open: string, close: string, lunchStart?: string | null, lunchEnd?: string | null) {
  const slots: string[] = [];
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h*60+m; };
  const fmt = (m: number) => `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
  const o = toMin(open), c = toMin(close);
  const ls = lunchStart ? toMin(lunchStart) : null;
  const le = lunchEnd ? toMin(lunchEnd) : null;
  for (let m = o; m + 30 <= c; m += 30) {
    if (ls !== null && le !== null && m >= ls && m < le) continue;
    slots.push(fmt(m));
  }
  return slots;
}

export function roundDuration(min: number) { return Math.ceil(min / 30) * 30; }

// Get available slots for a date+service+pro?
export async function getAvailableSlots(opts: { date: string; serviceDurationMin: number; professionalId?: string | null }) {
  const av = await fetchAvailability();
  // Day-of-week disabled by owner?
  const d0 = new Date(opts.date + "T12:00:00");
  if (!av.days_enabled?.[d0.getDay()]) return [];
  // Lunch only applied when enabled
  const lunchStart = av.lunch_enabled ? av.lunch_start : null;
  const lunchEnd = av.lunch_enabled ? av.lunch_end : null;
  const allSlots = generateSlots(av.open_time, av.close_time, lunchStart, lunchEnd);
  const dur = roundDuration(opts.serviceDurationMin);
  const slotsNeeded = dur / 30;

  const { data: bookings } = await supabase.rpc("get_taken_slots", {
    _date: opts.date,
    _professional_id: opts.professionalId ?? undefined,
    _tenant_id: getCurrentTenantId(),
  });

  const taken = new Set<string>();
  (bookings ?? []).forEach((b: any) => {
    const start = b.time.slice(0,5);
    const idx = allSlots.indexOf(start);
    if (idx === -1) return;
    const blocks = roundDuration(b.duration_min) / 30;
    for (let i = 0; i < blocks; i++) if (allSlots[idx+i]) taken.add(allSlots[idx+i]);
  });

  // also prevent past-time slots today (Brasil timezone)
  const tz = "America/Sao_Paulo";
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now); // YYYY-MM-DD em SP
  const nowHHMM = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(now); // HH:MM em SP
  const [nh, nm] = nowHHMM.split(":").map(Number);
  const nowMin = nh * 60 + nm;
  const minLead = Math.max(0, av.min_lead_min || 0);

  return allSlots.map((time) => {
    const idx = allSlots.indexOf(time);
    let available = true;
    if (idx + slotsNeeded > allSlots.length) available = false;
    for (let i = 0; i < slotsNeeded; i++) {
      if (!allSlots[idx+i]) { available = false; break; }
      if (taken.has(allSlots[idx+i])) { available = false; break; }
    }
    if (opts.date === today) {
      const [h,m] = time.split(":").map(Number);
      const slotMin = h * 60 + m;
      if (slotMin - nowMin < minLead) available = false;
    }
    return { time, available };
  });
}

// Atomic-ish booking creation: relies on the unique partial index
export async function createBooking(input: {
  client_name: string; whatsapp: string; email?: string;
  professional_id: string | null; service_id: string;
  date: string; time: string;
  address?: {
    cep: string; street: string; number: string; complement?: string;
    neighborhood: string; city: string; state: string;
  } | null;
}) {
  const whatsapp = normalizePhone(input.whatsapp);
  if (whatsapp.length < 10) return { error: "WhatsApp inválido." };
  const tenantId = getCurrentTenantId();

  // Ensure client profile exists (creates if missing, never overwrites)
  const { data: pid, error: pErr } = await supabase.rpc("ensure_client_profile", {
    _whatsapp: whatsapp,
    _name: input.client_name,
    _email: input.email ?? "",
    _tenant_id: tenantId,
  });
  if (pErr) return { error: pErr.message };

  // Fetch canonical profile data + active flag (scoped to tenant)
  const { data: prof } = await supabase
    .from("profiles")
    .select("name,email,active")
    .eq("id", pid as string)
    .maybeSingle();
  if (prof && prof.active === false) return { error: "BLOCKED" };

  // Look up service + pro snapshot (scoped to tenant)
  const { data: svc } = await supabase.from("services").select("*").eq("id", input.service_id).eq("tenant_id", tenantId).single();
  if (!svc) return { error: "Serviço inválido." };
  let proName: string | null = null;
  if (input.professional_id) {
    const { data: pro } = await supabase.from("professionals").select("name,active").eq("id", input.professional_id).eq("tenant_id", tenantId).maybeSingle();
    if (!pro || !pro.active) return { error: "Profissional indisponível." };
    proName = pro.name;
  }

  // Canonical name/email come from profile (preserves original data)
  const clientName = prof?.name || input.client_name;
  const clientEmail = prof?.email || input.email || null;

  // Rounded duration
  const duration = roundDuration(svc.duration_min);
  const price = svc.promo_pct && svc.promo_starts_at && svc.promo_ends_at
    && new Date(svc.promo_starts_at) <= new Date() && new Date(svc.promo_ends_at) >= new Date()
    ? Number((svc.price * (1 - svc.promo_pct / 100)).toFixed(2))
    : svc.price;

  const newId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const addr = input.address;
  const addressFull = addr
    ? `${addr.street}, ${addr.number}${addr.complement ? ` - ${addr.complement}` : ""} - ${addr.neighborhood}, ${addr.city}/${addr.state} - CEP ${addr.cep}`
    : null;

  const { error } = await supabase.from("bookings").insert({
    id: newId,
    tenant_id: tenantId,
    client_name: clientName,
    client_name_snapshot: input.client_name?.trim() || clientName,
    whatsapp,
    email: clientEmail,
    professional_id: input.professional_id,
    service_id: input.service_id,
    service_name: svc.name,
    professional_name: proName,
    date: input.date,
    time: input.time,
    duration_min: duration,
    price,
    status: "confirmed",
    client_cep: addr?.cep ?? null,
    client_street: addr?.street ?? null,
    client_number: addr?.number ?? null,
    client_complement: addr?.complement ?? null,
    client_neighborhood: addr?.neighborhood ?? null,
    client_city: addr?.city ?? null,
    client_state: addr?.state ?? null,
    client_address_full: addressFull,
  });

  if (error) {
    const msg = String(error.message || "").toLowerCase();
    if (msg.includes("duplicate") || (error as any).code === "23505") {
      return { error: "Esse horário acabou de ser reservado." };
    }
    if (msg.includes("row-level security") || msg.includes("violates row-level")) {
      return { error: "Não foi possível confirmar agora. Tente novamente." };
    }
    return { error: error.message };
  }
  rememberMyWhatsapp(whatsapp);
  return { id: newId };
}

export async function cancelBooking(id: string, whatsapp: string) {
  const { data, error } = await supabase.rpc("cancel_booking", {
    _id: id,
    _whatsapp: normalizePhone(whatsapp),
  });
  if (error) {
    if (String(error.message || "").includes("CANCEL_TOO_LATE")) {
      return "Prazo de cancelamento expirado. Entre em contato com o estabelecimento.";
    }
    return error.message;
  }
  if (!data) return "Não foi possível cancelar.";
  return undefined;
}

// Check if a client (by whatsapp) is allowed to book in the current tenant.
// Returns true when active or unknown (no profile yet); false only when explicitly inactive.
export async function isClientActive(whatsapp: string): Promise<boolean> {
  const wa = normalizePhone(whatsapp);
  if (wa.length < 10) return true;
  const { data, error } = await supabase.rpc("is_client_active", {
    _whatsapp: wa,
    _tenant_id: getCurrentTenantId(),
  });
  if (error) return true; // fail-open on transient errors; server still blocks on insert
  return data !== false;
}

