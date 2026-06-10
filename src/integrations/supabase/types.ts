export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; name: string | null; whatsapp: string | null; email: string | null; active: boolean; created_at: string }
        Insert: { id: string; name?: string | null; whatsapp?: string | null; email?: string | null; active?: boolean; created_at?: string }
        Update: { id?: string; name?: string | null; whatsapp?: string | null; email?: string | null; active?: boolean; created_at?: string }
        Relationships: []
      }
      services: {
        Row: { id: string; name: string; duration_min: number; price: number; emoji: string | null; photo_url: string | null; active: boolean; sort_order: number; promo_pct: number | null; promo_starts_at: string | null; promo_ends_at: string | null; description: string | null; created_at: string }
        Insert: { id?: string; name: string; duration_min: number; price?: number; emoji?: string | null; photo_url?: string | null; active?: boolean; sort_order?: number; promo_pct?: number | null; promo_starts_at?: string | null; promo_ends_at?: string | null; description?: string | null; created_at?: string }
        Update: { id?: string; name?: string; duration_min?: number; price?: number; emoji?: string | null; photo_url?: string | null; active?: boolean; sort_order?: number; promo_pct?: number | null; promo_starts_at?: string | null; promo_ends_at?: string | null; description?: string | null; created_at?: string }
        Relationships: []
      }
      professionals: {
        Row: { id: string; user_id: string | null; name: string; role: string | null; photo_url: string | null; active: boolean; sort_order: number; created_at: string }
        Insert: { id?: string; user_id?: string | null; name: string; role?: string | null; photo_url?: string | null; active?: boolean; sort_order?: number; created_at?: string }
        Update: { id?: string; user_id?: string | null; name?: string; role?: string | null; photo_url?: string | null; active?: boolean; sort_order?: number; created_at?: string }
        Relationships: []
      }
      bookings: {
        Row: { id: string; client_name: string; whatsapp: string; email: string | null; professional_id: string | null; service_id: string | null; service_name: string; professional_name: string | null; date: string; time: string; duration_min: number; price: number; status: Database["public"]["Enums"]["booking_status"]; user_id: string | null; client_name_snapshot: string | null; created_at: string }
        Insert: { id?: string; client_name: string; whatsapp: string; email?: string | null; professional_id?: string | null; service_id?: string | null; service_name: string; professional_name?: string | null; date: string; time: string; duration_min: number; price?: number; status?: Database["public"]["Enums"]["booking_status"]; user_id?: string | null; client_name_snapshot?: string | null; created_at?: string }
        Update: { id?: string; client_name?: string; whatsapp?: string; email?: string | null; professional_id?: string | null; service_id?: string | null; service_name?: string; professional_name?: string | null; date?: string; time?: string; duration_min?: number; price?: number; status?: Database["public"]["Enums"]["booking_status"]; user_id?: string | null; client_name_snapshot?: string | null; created_at?: string }
        Relationships: []
      }
      availability: {
        Row: { id: number; open_time: string; close_time: string; days_enabled: boolean[]; lunch_start: string | null; lunch_end: string | null; min_lead_min: number; max_future_days: number; require_pro_selection: boolean; business_name: string | null; address: string | null; maps_url: string | null; whatsapp_url: string | null; instagram_url: string | null; updated_at: string }
        Insert: { id?: number; open_time?: string; close_time?: string; days_enabled?: boolean[]; lunch_start?: string | null; lunch_end?: string | null; min_lead_min?: number; max_future_days?: number; require_pro_selection?: boolean; business_name?: string | null; address?: string | null; maps_url?: string | null; whatsapp_url?: string | null; instagram_url?: string | null; updated_at?: string }
        Update: { id?: number; open_time?: string; close_time?: string; days_enabled?: boolean[]; lunch_start?: string | null; lunch_end?: string | null; min_lead_min?: number; max_future_days?: number; require_pro_selection?: boolean; business_name?: string | null; address?: string | null; maps_url?: string | null; whatsapp_url?: string | null; instagram_url?: string | null; updated_at?: string }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      cancel_booking: { Args: { _id: string; _whatsapp: string }; Returns: boolean }
      ensure_client_profile: { Args: { _whatsapp: string; _name: string; _email: string }; Returns: string }
      get_bookings_by_whatsapp: { Args: { _whatsapp: string }; Returns: Database["public"]["Tables"]["bookings"]["Row"][] }
      get_taken_slots: { Args: { _date: string; _professional_id?: string }; Returns: { time: string; duration_min: number; professional_id: string }[] }
      has_role: { Args: { _user_id: string; _role: Database["public"]["Enums"]["app_role"] }; Returns: boolean }
      normalize_phone: { Args: { p: string }; Returns: string }
    }
    Enums: {
      app_role: "owner" | "professional" | "client"
      booking_status: "pending" | "confirmed" | "cancelled" | "done"
      campaign_channel: "whatsapp" | "email"
      plan_tier: "basic" | "intermediate" | "premium"
    }
  }
}
