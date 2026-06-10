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
      app_settings: {
        Row: {
          default_blocked_grace_days: number
          email_from_local: string
          email_from_name: string
          id: boolean
          pix_beneficiary_city: string | null
          pix_beneficiary_name: string | null
          pix_instructions: string | null
          pix_key: string | null
          pix_key_type: string | null
          recurrence_batch_size: number
          recurrence_min_interval_seconds: number
          uazapi_base_url: string | null
          uazapi_token: string | null
          updated_at: string
          updated_by: string | null
          whatsapp_enabled: boolean
        }
        Insert: {
          default_blocked_grace_days?: number
          email_from_local?: string
          email_from_name?: string
          id?: boolean
          pix_beneficiary_city?: string | null
          pix_beneficiary_name?: string | null
          pix_instructions?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          recurrence_batch_size?: number
          recurrence_min_interval_seconds?: number
          uazapi_base_url?: string | null
          uazapi_token?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp_enabled?: boolean
        }
        Update: {
          default_blocked_grace_days?: number
          email_from_local?: string
          email_from_name?: string
          id?: boolean
          pix_beneficiary_city?: string | null
          pix_beneficiary_name?: string | null
          pix_instructions?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          recurrence_batch_size?: number
          recurrence_min_interval_seconds?: number
          uazapi_base_url?: string | null
          uazapi_token?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp_enabled?: boolean
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      availability: {
        Row: {
          address: string | null
          business_name: string | null
          cancel_min_lead_enabled: boolean
          cancel_min_lead_min: number
          close_time: string
          days_enabled: boolean[]
          facebook_url: string | null
          id: number
          instagram_url: string | null
          logo_url: string | null
          lunch_enabled: boolean
          lunch_end: string | null
          lunch_start: string | null
          maps_url: string | null
          max_future_days: number
          min_lead_enabled: boolean
          min_lead_min: number
          open_time: string
          require_pro_selection: boolean
          tenant_id: string
          updated_at: string
          whatsapp_url: string | null
        }
        Insert: {
          address?: string | null
          business_name?: string | null
          cancel_min_lead_enabled?: boolean
          cancel_min_lead_min?: number
          close_time?: string
          days_enabled?: boolean[]
          facebook_url?: string | null
          id?: number
          instagram_url?: string | null
          logo_url?: string | null
          lunch_enabled?: boolean
          lunch_end?: string | null
          lunch_start?: string | null
          maps_url?: string | null
          max_future_days?: number
          min_lead_enabled?: boolean
          min_lead_min?: number
          open_time?: string
          require_pro_selection?: boolean
          tenant_id?: string
          updated_at?: string
          whatsapp_url?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string | null
          cancel_min_lead_enabled?: boolean
          cancel_min_lead_min?: number
          close_time?: string
          days_enabled?: boolean[]
          facebook_url?: string | null
          id?: number
          instagram_url?: string | null
          logo_url?: string | null
          lunch_enabled?: boolean
          lunch_end?: string | null
          lunch_start?: string | null
          maps_url?: string | null
          max_future_days?: number
          min_lead_enabled?: boolean
          min_lead_min?: number
          open_time?: string
          require_pro_selection?: boolean
          tenant_id?: string
          updated_at?: string
          whatsapp_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_dates: {
        Row: {
          date: string
          id: string
          reason: string | null
          tenant_id: string
        }
        Insert: {
          date: string
          id?: string
          reason?: string | null
          tenant_id?: string
        }
        Update: {
          date?: string
          id?: string
          reason?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_dates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          client_address_full: string | null
          client_cep: string | null
          client_city: string | null
          client_complement: string | null
          client_name: string
          client_name_snapshot: string | null
          client_neighborhood: string | null
          client_number: string | null
          client_state: string | null
          client_street: string | null
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
          tenant_id: string
          time: string
          user_id: string | null
          wa_free_reminder_sent_at: string | null
          whatsapp: string
        }
        Insert: {
          client_address_full?: string | null
          client_cep?: string | null
          client_city?: string | null
          client_complement?: string | null
          client_name: string
          client_name_snapshot?: string | null
          client_neighborhood?: string | null
          client_number?: string | null
          client_state?: string | null
          client_street?: string | null
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
          tenant_id?: string
          time: string
          user_id?: string | null
          wa_free_reminder_sent_at?: string | null
          whatsapp: string
        }
        Update: {
          client_address_full?: string | null
          client_cep?: string | null
          client_city?: string | null
          client_complement?: string | null
          client_name?: string
          client_name_snapshot?: string | null
          client_neighborhood?: string | null
          client_number?: string | null
          client_state?: string | null
          client_street?: string | null
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
          tenant_id?: string
          time?: string
          user_id?: string | null
          wa_free_reminder_sent_at?: string | null
          whatsapp?: string
        }
        Relationships: [
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
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      markee_lead_events: {
        Row: {
          actor_email: string | null
          actor_id: string | null
          created_at: string
          from_status: string | null
          id: string
          lead_id: string
          message: string | null
          to_status: string | null
        }
        Insert: {
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          lead_id: string
          message?: string | null
          to_status?: string | null
        }
        Update: {
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          lead_id?: string
          message?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "markee_lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "markee_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      markee_leads: {
        Row: {
          about: string | null
          business_name: string
          created_at: string
          created_tenant_id: string | null
          email: string
          id: string
          notes: string | null
          owner_name: string
          primary_color: string | null
          primary_glow_color: string | null
          secondary_color: string | null
          segment: string
          segment_other: string | null
          status: string
          ticket_number: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          about?: string | null
          business_name: string
          created_at?: string
          created_tenant_id?: string | null
          email: string
          id?: string
          notes?: string | null
          owner_name: string
          primary_color?: string | null
          primary_glow_color?: string | null
          secondary_color?: string | null
          segment: string
          segment_other?: string | null
          status?: string
          ticket_number: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          about?: string | null
          business_name?: string
          created_at?: string
          created_tenant_id?: string | null
          email?: string
          id?: string
          notes?: string | null
          owner_name?: string
          primary_color?: string | null
          primary_glow_color?: string | null
          secondary_color?: string | null
          segment?: string
          segment_other?: string | null
          status?: string
          ticket_number?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      payment_receipts: {
        Row: {
          amount: number
          created_at: string
          file_path: string
          file_url: string
          id: string
          note: string | null
          payment_id: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          file_path: string
          file_url: string
          id?: string
          note?: string | null
          payment_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          file_path?: string
          file_url?: string
          id?: string
          note?: string | null
          payment_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          method: string
          notes: string | null
          paid_at: string
          provider: string | null
          provider_ref: string | null
          reference: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string
          notes?: string | null
          paid_at?: string
          provider?: string | null
          provider_ref?: string | null
          reference?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string
          notes?: string | null
          paid_at?: string
          provider?: string | null
          provider_ref?: string | null
          reference?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          photo_url: string | null
          role: string | null
          sort_order: number
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          role?: string | null
          sort_order?: number
          tenant_id?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          role?: string | null
          sort_order?: number
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          id: string
          name: string | null
          tenant_id: string
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          tenant_id?: string
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          tenant_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      recurrence_campaign_targets: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          profile_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          profile_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurrence_campaign_targets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "recurrence_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      recurrence_campaigns: {
        Row: {
          active: boolean
          audience_mode: string
          channels: string[]
          created_at: string
          created_by: string | null
          email_subject: string | null
          id: string
          inactive_days: number
          kind: string
          last_run_at: string | null
          message_body: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          audience_mode?: string
          channels?: string[]
          created_at?: string
          created_by?: string | null
          email_subject?: string | null
          id?: string
          inactive_days?: number
          kind?: string
          last_run_at?: string | null
          message_body?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          audience_mode?: string
          channels?: string[]
          created_at?: string
          created_by?: string | null
          email_subject?: string | null
          id?: string
          inactive_days?: number
          kind?: string
          last_run_at?: string | null
          message_body?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      recurrence_queue: {
        Row: {
          attempts: number
          campaign_id: string
          channel: string
          created_at: string
          error: string | null
          id: string
          payload_snapshot: Json
          profile_id: string
          scheduled_for: string
          sent_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          attempts?: number
          campaign_id: string
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          payload_snapshot?: Json
          profile_id: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          attempts?: number
          campaign_id?: string
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          payload_snapshot?: Json
          profile_id?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurrence_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "recurrence_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      recurrence_send_log: {
        Row: {
          campaign_id: string | null
          channel: string
          created_at: string
          error: string | null
          id: string
          message_preview: string | null
          profile_id: string | null
          recipient: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          campaign_id?: string | null
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          message_preview?: string | null
          profile_id?: string | null
          recipient?: string | null
          status: string
          tenant_id: string
        }
        Update: {
          campaign_id?: string | null
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          message_preview?: string | null
          profile_id?: string | null
          recipient?: string | null
          status?: string
          tenant_id?: string
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
          tenant_id: string
        }
        Insert: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          professional_id?: string | null
          stars: number
          tenant_id?: string
        }
        Update: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          professional_id?: string | null
          stars?: number
          tenant_id?: string
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
          {
            foreignKeyName: "reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
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
          tenant_id: string
        }
        Insert: {
          active?: boolean
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
          tenant_id?: string
        }
        Update: {
          active?: boolean
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
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_features: {
        Row: {
          admin_enabled: boolean
          config: Json
          feature_key: string
          owner_enabled: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          admin_enabled?: boolean
          config?: Json
          feature_key: string
          owner_enabled?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          admin_enabled?: boolean
          config?: Json
          feature_key?: string
          owner_enabled?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          active: boolean
          blocked_grace_days: number
          created_at: string
          due_date: string | null
          email_reply_to: string | null
          id: string
          last_payment_at: string | null
          monthly_price: number
          name: string
          owner_email: string | null
          owner_name: string | null
          owner_phone: string | null
          plan: string
          primary_color: string | null
          primary_glow_color: string | null
          secondary_color: string | null
          slug: string
          status: string
          trial_ends_at: string | null
          uazapi_token: string | null
          wa_free_confirm_template: string
          wa_free_enabled: boolean
          wa_free_reminder_minutes_before: number
          wa_free_reminder_template: string
          whatsapp_enabled: boolean
          whatsapp_instance: string | null
          whatsapp_sender_number: string | null
        }
        Insert: {
          active?: boolean
          blocked_grace_days?: number
          created_at?: string
          due_date?: string | null
          email_reply_to?: string | null
          id?: string
          last_payment_at?: string | null
          monthly_price?: number
          name: string
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          plan?: string
          primary_color?: string | null
          primary_glow_color?: string | null
          secondary_color?: string | null
          slug: string
          status?: string
          trial_ends_at?: string | null
          uazapi_token?: string | null
          wa_free_confirm_template?: string
          wa_free_enabled?: boolean
          wa_free_reminder_minutes_before?: number
          wa_free_reminder_template?: string
          whatsapp_enabled?: boolean
          whatsapp_instance?: string | null
          whatsapp_sender_number?: string | null
        }
        Update: {
          active?: boolean
          blocked_grace_days?: number
          created_at?: string
          due_date?: string | null
          email_reply_to?: string | null
          id?: string
          last_payment_at?: string | null
          monthly_price?: number
          name?: string
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          plan?: string
          primary_color?: string | null
          primary_glow_color?: string | null
          secondary_color?: string | null
          slug?: string
          status?: string
          trial_ends_at?: string | null
          uazapi_token?: string | null
          wa_free_confirm_template?: string
          wa_free_enabled?: boolean
          wa_free_reminder_minutes_before?: number
          wa_free_reminder_template?: string
          whatsapp_enabled?: boolean
          whatsapp_instance?: string | null
          whatsapp_sender_number?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          client_name: string
          created_at: string
          date: string
          email: string | null
          id: string
          notes: string | null
          professional_id: string | null
          professional_name: string | null
          service_id: string | null
          service_name: string | null
          status: string
          tenant_id: string
          whatsapp: string
          window_end: string | null
          window_start: string | null
          window_type: string
        }
        Insert: {
          client_name: string
          created_at?: string
          date: string
          email?: string | null
          id?: string
          notes?: string | null
          professional_id?: string | null
          professional_name?: string | null
          service_id?: string | null
          service_name?: string | null
          status?: string
          tenant_id: string
          whatsapp: string
          window_end?: string | null
          window_start?: string | null
          window_type?: string
        }
        Update: {
          client_name?: string
          created_at?: string
          date?: string
          email?: string | null
          id?: string
          notes?: string | null
          professional_id?: string | null
          professional_name?: string | null
          service_id?: string | null
          service_name?: string | null
          status?: string
          tenant_id?: string
          whatsapp?: string
          window_end?: string | null
          window_start?: string | null
          window_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_review_receipt: {
        Args: {
          _decision: string
          _receipt_id: string
          _rejection_reason?: string
        }
        Returns: string
      }
      cancel_booking: {
        Args: { _id: string; _whatsapp: string }
        Returns: boolean
      }
      cancel_waitlist: {
        Args: { _id: string; _whatsapp: string }
        Returns: boolean
      }
      confirm_payment: {
        Args: {
          _amount: number
          _method?: string
          _notes?: string
          _reference?: string
          _tenant_id: string
        }
        Returns: string
      }
      ensure_client_profile: {
        Args: {
          _email: string
          _name: string
          _tenant_id?: string
          _whatsapp: string
        }
        Returns: string
      }
      get_booking_by_id: {
        Args: { _id: string }
        Returns: {
          client_address_full: string | null
          client_cep: string | null
          client_city: string | null
          client_complement: string | null
          client_name: string
          client_name_snapshot: string | null
          client_neighborhood: string | null
          client_number: string | null
          client_state: string | null
          client_street: string | null
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
          tenant_id: string
          time: string
          user_id: string | null
          wa_free_reminder_sent_at: string | null
          whatsapp: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_bookings_by_whatsapp: {
        Args: { _tenant_id?: string; _whatsapp: string }
        Returns: {
          client_address_full: string | null
          client_cep: string | null
          client_city: string | null
          client_complement: string | null
          client_name: string
          client_name_snapshot: string | null
          client_neighborhood: string | null
          client_number: string | null
          client_state: string | null
          client_street: string | null
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
          tenant_id: string
          time: string
          user_id: string | null
          wa_free_reminder_sent_at: string | null
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
        Args: { _date: string; _professional_id?: string; _tenant_id?: string }
        Returns: {
          duration_min: number
          professional_id: string
          time: string
        }[]
      }
      get_tenant_features_public: {
        Args: { _tenant_id: string }
        Returns: {
          config: Json
          enabled: boolean
          feature_key: string
        }[]
      }
      get_waitlist_by_whatsapp: {
        Args: { _tenant_id?: string; _whatsapp: string }
        Returns: {
          client_name: string
          created_at: string
          date: string
          email: string | null
          id: string
          notes: string | null
          professional_id: string | null
          professional_name: string | null
          service_id: string | null
          service_name: string | null
          status: string
          tenant_id: string
          whatsapp: string
          window_end: string | null
          window_start: string | null
          window_type: string
        }[]
        SetofOptions: {
          from: "*"
          to: "waitlist"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_client_active: {
        Args: { _tenant_id?: string; _whatsapp: string }
        Returns: boolean
      }
      markee_admin_update_status: {
        Args: { _lead_id: string; _message: string; _new_status: string }
        Returns: boolean
      }
      markee_convert_lead_to_tenant: {
        Args: {
          _lead_id: string
          _monthly_price?: number
          _owner_user_id: string
          _slug: string
          _trial_days?: number
        }
        Returns: {
          slug: string
          tenant_id: string
        }[]
      }
      markee_create_lead: {
        Args: {
          _about: string
          _business_name: string
          _email: string
          _owner_name: string
          _primary_color: string
          _primary_glow_color: string
          _secondary_color: string
          _segment: string
          _segment_other: string
          _whatsapp: string
        }
        Returns: {
          id: string
          ticket_number: string
        }[]
      }
      markee_get_lead_status: {
        Args: { _ticket: string; _whatsapp: string }
        Returns: {
          business_name: string
          created_at: string
          status: string
          ticket_number: string
          updated_at: string
        }[]
      }
      normalize_phone: { Args: { p: string }; Returns: string }
      recurrence_eligible_inactive_clients: {
        Args: { _days: number; _tenant_id: string }
        Returns: {
          email: string
          name: string
          profile_id: string
          whatsapp: string
        }[]
      }
      refresh_all_tenant_statuses: { Args: never; Returns: undefined }
      set_tenant_feature_admin: {
        Args: { _enabled: boolean; _feature_key: string; _tenant_id: string }
        Returns: boolean
      }
      set_tenant_feature_owner: {
        Args: { _enabled: boolean; _feature_key: string; _tenant_id: string }
        Returns: boolean
      }
      tenant_effective_status: { Args: { _tenant_id: string }; Returns: string }
      tenant_financial_status: {
        Args: { _tenant_id: string }
        Returns: {
          days_until_blocked: number
          days_until_due: number
          due_date: string
          effective_status: string
          has_pending_receipt: boolean
          has_rejected_receipt: boolean
          last_payment_at: string
          monthly_price: number
          status: string
          tenant_id: string
          trial_days_remaining: number
          trial_ends_at: string
        }[]
      }
      tenant_public_status: {
        Args: { _tenant_id: string }
        Returns: {
          due_date: string
          effective_status: string
          id: string
          monthly_price: number
          name: string
          owner_phone: string
          primary_color: string
          slug: string
          status: string
          trial_ends_at: string
        }[]
      }
      user_belongs_to_tenant: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_tenant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "professional" | "client" | "admin"
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
      app_role: ["owner", "professional", "client", "admin"],
      booking_status: ["pending", "confirmed", "cancelled", "done"],
      campaign_channel: ["whatsapp", "email"],
      plan_tier: ["basic", "intermediate", "premium"],
    },
  },
} as const
