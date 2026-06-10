export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      availability: {
        Row: {
          address: string | null
          business_name: string | null
          close_time: string
          days_enabled: boolean[]
          id: number
          instagram_url: string | null
          lunch_end: string | null
          lunch_start: string | null
          maps_url: string | null
          max_future_days: number
          min_lead_min: number
          open_time: string
          require_pro_selection: boolean
          updated_at: string
          whatsapp_url: string | null
        }
        Insert: {
          address?: string | null
          business_name?: string | null
          close_time?: string
          days_enabled?: boolean[]
          id?: number
          instagram_url?: string | null
          lunch_end?: string | null
          lunch_start?: string | null
          maps_url?: string | null
          max_future_days?: number
          min_lead_min?: number
          open_time?: string
          require_pro_selection?: boolean
          updated_at?: string
          whatsapp_url?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string | null
          close_time?: string
          days_enabled?: boolean[]
          id?: number
          instagram_url?: string | null
          lunch_end?: string | null
          lunch_start?: string | null
          maps_url?: string | null
          max_future_days?: number
          min_lead_min?: number
          open_time?: string
          require_pro_selection?: boolean
          updated_at?: string
          whatsapp_url?: string | null
        }
        Relationships: []
      }
      blocked_dates: {
        Row: {
          date: string
          id: string
          reason: string | null
        }
        Insert: {
          date: string
          id?: string
          reason?: string | null
        }
        Update: {
          date?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          business_id: string | null
          client_name: string
          client_name_snapshot: string | null
          created_at: string
          date: string
          duration_min: number
          email: string | null
          id: string
          price: number
          professional_id: string | null
          professional_name: string | null
          service_id: string | null
          service_name: string
          status: Database["public"]["Enums"]["booking_status"]
          time: string
          user_id: string | null
          whatsapp: string
        }
        Insert: {
          business_id?: string | null
          client_name: string
          client_name_snapshot?: string | null
          created_at?: string
          date: string
          duration_min: number
          email?: string | null
          id?: string
          price?: number
          professional_id?: string | null
          professional_name?: string | null
          service_id?: string | null
          service_name: string
          status?: Database["public"]["Enums"]["booking_status"]
          time: string
          user_id?: string | null
          whatsapp: string
        }
        Update: {
          business_id?: string | null
          client_name?: string
          client_name_snapshot?: string | null
          created_at?: string
          date?: string
          duration_min?: number
          email?: string | null
          id?: string
          price?: number
          professional_id?: string | null
          professional_name?: string | null
          service_id?: string | null
          service_name?: string
          status?: Database["public"]["Enums"]["booking_status"]
          time?: string
          user_id?: string | null
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string
          owner_id: string | null
          primary_color: string | null
          secondary_color: string | null
          segment: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          owner_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          segment?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          segment?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      onboarding_requests: {
        Row: {
          business_name: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          metadata: Json | null
          phone: string | null
          segment: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          metadata?: Json | null
          phone?: string | null
          segment?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          metadata?: Json | null
          phone?: string | null
          segment?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      professionals: {
        Row: {
          active: boolean
          business_id: string | null
          created_at: string
          id: string
          name: string
          photo_url: string | null
          role: string | null
          sort_order: number
          user_id: string | null
        }
        Insert: {
          active?: boolean
          business_id?: string | null
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          role?: string | null
          sort_order?: number
          user_id?: string | null
        }
        Update: {
          active?: boolean
          business_id?: string | null
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          role?: string | null
          sort_order?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          business_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          business_id?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          business_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      recurrence_campaigns: {
        Row: {
          channel: Database["public"]["Enums"]["campaign_channel"]
          created_at: string
          id: string
          name: string
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          scheduled_at: string | null
          status: string
          target_filter: string
          template: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["campaign_channel"]
          created_at?: string
          id?: string
          name: string
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          scheduled_at?: string | null
          status?: string
          target_filter?: string
          template: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["campaign_channel"]
          created_at?: string
          id?: string
          name?: string
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          scheduled_at?: string | null
          status?: string
          target_filter?: string
          template?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string | null
          comment: string | null
          created_at: string
          id: string
          professional_id: string | null
          stars: number
        }
        Insert: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          professional_id?: string | null
          stars: number
        }
        Update: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          professional_id?: string | null
          stars?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          business_id: string | null
          created_at: string
          description: string | null
          duration_min: number
          emoji: string | null
          id: string
          name: string
          photo_url: string | null
          price: number
          promo_ends_at: string | null
          promo_pct: number | null
          promo_starts_at: string | null
          sort_order: number
        }
        Insert: {
          active?: boolean
          business_id?: string | null
          created_at?: string
          description?: string | null
          duration_min: number
          emoji?: string | null
          id?: string
          name: string
          photo_url?: string | null
          price?: number
          promo_ends_at?: string | null
          promo_pct?: number | null
          promo_starts_at?: string | null
          sort_order?: number
        }
        Update: {
          active?: boolean
          business_id?: string | null
          created_at?: string
          description?: string | null
          duration_min?: number
          emoji?: string | null
          id?: string
          name?: string
          photo_url?: string | null
          price?: number
          promo_ends_at?: string | null
          promo_pct?: number | null
          promo_starts_at?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_booking: {
        Args: { _id: string; _whatsapp: string }
        Returns: boolean
      }
      ensure_client_profile: {
        Args: { _email: string; _name: string; _whatsapp: string }
        Returns: string
      }
      get_bookings_by_whatsapp: {
        Args: { _whatsapp: string }
        Returns: {
          business_id: string | null
          client_name: string
          client_name_snapshot: string | null
          created_at: string
          date: string
          duration_min: number
          email: string | null
          id: string
          price: number
          professional_id: string | null
          professional_name: string | null
          service_id: string | null
          service_name: string
          status: Database["public"]["Enums"]["booking_status"]
          time: string
          user_id: string | null
          whatsapp: string
        }[]
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_taken_slots: {
        Args: { _date: string; _professional_id?: string }
        Returns: {
          duration_min: number
          professional_id: string
          time: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      normalize_phone: { Args: { p: string }; Returns: string }
    }
    Enums: {
      app_role: "owner" | "professional" | "client"
      booking_status: "pending" | "confirmed" | "cancelled" | "done"
      campaign_channel: "whatsapp" | "email"
      plan_tier: "basic" | "intermediate" | "premium"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "professional", "client"],
      booking_status: ["pending", "confirmed", "cancelled", "done"],
      campaign_channel: ["whatsapp", "email"],
      plan_tier: ["basic", "intermediate", "premium"],
    },
  },
} as const
