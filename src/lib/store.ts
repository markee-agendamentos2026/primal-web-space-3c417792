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

const MY_KEY = "rh_my_whatsapp";
const MY_LIST_KEY = "rh_my_whatsapps";
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

export function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}
export function isValidPhone(v: string) { return v.replace(/\D/g, "").length === 11; }
export function normalizePhone(v: string) { return (v || "").replace(/\D/g, ""); }

export async function fetchAvailability(): Promise<Availability> {
  const { data } = await supabase.from("availability").select("*").maybeSingle();
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

export async function isClientActive(whatsapp: string): Promise<boolean> {
  const wa = normalizePhone(whatsapp);
  if (wa.length < 10) return true;
  // Usando query direta enquanto a RPC é sincronizada
  const { data } = await (supabase as any).rpc("is_client_active", {
    _whatsapp: wa,
  });
  if (!data) return true;
  return (data as any) !== false;
}
