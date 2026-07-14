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
      club_claims: {
        Row: {
          admin_note: string | null
          claimant_email: string
          claimant_name: string
          club_id: string
          club_slug: string
          created_at: string
          id: string
          message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role_at_club: string
          seen_at: string | null
          status: string
          submitted_at: string
          updated_at: string
          verification_hint: string | null
          verification_method: string | null
        }
        Insert: {
          admin_note?: string | null
          claimant_email: string
          claimant_name: string
          club_id: string
          club_slug: string
          created_at?: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_at_club: string
          seen_at?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          verification_hint?: string | null
          verification_method?: string | null
        }
        Update: {
          admin_note?: string | null
          claimant_email?: string
          claimant_name?: string
          club_id?: string
          club_slug?: string
          created_at?: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_at_club?: string
          seen_at?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          verification_hint?: string | null
          verification_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_claims_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_claims_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "public_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          affiliation_number: string | null
          claimed_at: string | null
          claimed_by: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          county: string | null
          created_at: string
          disciplines: string[]
          governing_body: string
          id: string
          is_claimed: boolean
          last_verified_at: string | null
          lat: number | null
          lng: number | null
          name: string
          norm_created_at: string | null
          norm_id: string
          postcode: string | null
          region: string | null
          slug: string
          source: string | null
          source_url: string | null
          status: string
          town: string | null
          tsv: unknown
          updated_at: string
          website_url: string | null
        }
        Insert: {
          affiliation_number?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          county?: string | null
          created_at?: string
          disciplines?: string[]
          governing_body: string
          id?: string
          is_claimed?: boolean
          last_verified_at?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          norm_created_at?: string | null
          norm_id: string
          postcode?: string | null
          region?: string | null
          slug: string
          source?: string | null
          source_url?: string | null
          status?: string
          town?: string | null
          tsv?: unknown
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          affiliation_number?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          county?: string | null
          created_at?: string
          disciplines?: string[]
          governing_body?: string
          id?: string
          is_claimed?: boolean
          last_verified_at?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          norm_created_at?: string | null
          norm_id?: string
          postcode?: string | null
          region?: string | null
          slug?: string
          source?: string | null
          source_url?: string | null
          status?: string
          town?: string | null
          tsv?: unknown
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_subscriptions: {
        Row: {
          created_at: string
          email: string
          event_id: string
          id: string
          kind: string
          reminder_sent_at: string | null
          unsubscribe_token: string
        }
        Insert: {
          created_at?: string
          email: string
          event_id: string
          id?: string
          kind?: string
          reminder_sent_at?: string | null
          unsubscribe_token?: string
        }
        Update: {
          created_at?: string
          email?: string
          event_id?: string
          id?: string
          kind?: string
          reminder_sent_at?: string | null
          unsubscribe_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_subscriptions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_subscriptions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
        ]
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      event_edits: {
        Row: {
          changes: Json
          edited_at: string
          event_id: string
          id: string
          note: string | null
        }
        Insert: {
          changes: Json
          edited_at?: string
          event_id: string
          id?: string
          note?: string | null
        }
        Update: {
          changes?: Json
          edited_at?: string
          event_id?: string
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_edits_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_edits_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          country: string | null
          county: string | null
          created_at: string
          date_from: string | null
          date_is_estimated: boolean
          date_raw: string | null
          date_to: string | null
          discipline: string | null
          distance_tags: string[]
          distances: string | null
          duplicate_of: string | null
          entry_fee: string | null
          entry_url: string | null
          governance: Database["public"]["Enums"]["event_governance"] | null
          id: string
          is_curated_tags: boolean
          is_featured: boolean
          is_recurring: boolean
          is_upcoming: boolean
          lat: number | null
          licensed: string | null
          lng: number | null
          location_raw: string | null
          name: string
          norm_created_at: string | null
          norm_id: string | null
          organiser: string | null
          organiser_club_id: string | null
          organiser_type:
            | Database["public"]["Enums"]["event_organiser_type"]
            | null
          organiser_url: string | null
          race_profile: Database["public"]["Enums"]["event_race_profile"] | null
          region: string | null
          series_key: string | null
          slug: string | null
          sort_date: string | null
          source: string | null
          source_url: string | null
          status: string
          terrain_tags: string[]
          town: string | null
          tsv: unknown
        }
        Insert: {
          country?: string | null
          county?: string | null
          created_at?: string
          date_from?: string | null
          date_is_estimated?: boolean
          date_raw?: string | null
          date_to?: string | null
          discipline?: string | null
          distance_tags?: string[]
          distances?: string | null
          duplicate_of?: string | null
          entry_fee?: string | null
          entry_url?: string | null
          governance?: Database["public"]["Enums"]["event_governance"] | null
          id?: string
          is_curated_tags?: boolean
          is_featured?: boolean
          is_recurring?: boolean
          is_upcoming?: boolean
          lat?: number | null
          licensed?: string | null
          lng?: number | null
          location_raw?: string | null
          name: string
          norm_created_at?: string | null
          norm_id?: string | null
          organiser?: string | null
          organiser_club_id?: string | null
          organiser_type?:
            | Database["public"]["Enums"]["event_organiser_type"]
            | null
          organiser_url?: string | null
          race_profile?:
            | Database["public"]["Enums"]["event_race_profile"]
            | null
          region?: string | null
          series_key?: string | null
          slug?: string | null
          sort_date?: string | null
          source?: string | null
          source_url?: string | null
          status?: string
          terrain_tags?: string[]
          town?: string | null
          tsv?: unknown
        }
        Update: {
          country?: string | null
          county?: string | null
          created_at?: string
          date_from?: string | null
          date_is_estimated?: boolean
          date_raw?: string | null
          date_to?: string | null
          discipline?: string | null
          distance_tags?: string[]
          distances?: string | null
          duplicate_of?: string | null
          entry_fee?: string | null
          entry_url?: string | null
          governance?: Database["public"]["Enums"]["event_governance"] | null
          id?: string
          is_curated_tags?: boolean
          is_featured?: boolean
          is_recurring?: boolean
          is_upcoming?: boolean
          lat?: number | null
          licensed?: string | null
          lng?: number | null
          location_raw?: string | null
          name?: string
          norm_created_at?: string | null
          norm_id?: string | null
          organiser?: string | null
          organiser_club_id?: string | null
          organiser_type?:
            | Database["public"]["Enums"]["event_organiser_type"]
            | null
          organiser_url?: string | null
          race_profile?:
            | Database["public"]["Enums"]["event_race_profile"]
            | null
          region?: string | null
          series_key?: string | null
          slug?: string | null
          sort_date?: string | null
          source?: string | null
          source_url?: string | null
          status?: string
          terrain_tags?: string[]
          town?: string | null
          tsv?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "events_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organiser_club_id_fkey"
            columns: ["organiser_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organiser_club_id_fkey"
            columns: ["organiser_club_id"]
            isOneToOne: false
            referencedRelation: "public_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      search_clicks: {
        Row: {
          clicked_slug: string
          created_at: string
          id: string
          position: number | null
          search_log_id: string
        }
        Insert: {
          clicked_slug: string
          created_at?: string
          id?: string
          position?: number | null
          search_log_id: string
        }
        Update: {
          clicked_slug?: string
          created_at?: string
          id?: string
          position?: number | null
          search_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_clicks_search_log_id_fkey"
            columns: ["search_log_id"]
            isOneToOne: false
            referencedRelation: "search_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      search_logs: {
        Row: {
          created_at: string
          id: string
          ip_hash: string | null
          query: string
          results_count: number
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          query: string
          results_count: number
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          query?: string
          results_count?: number
          user_agent?: string | null
        }
        Relationships: []
      }
      submissions: {
        Row: {
          admin_note: string | null
          claim_slug: string | null
          county: string | null
          created_event_id: string | null
          distances: string[]
          email: string
          event_details: string
          id: string
          is_reviewed: boolean
          kind: string
          organiser: string | null
          postcode: string | null
          race_date: string | null
          race_name: string | null
          reviewed_at: string | null
          seen_at: string | null
          status: string
          submitted_at: string
          submitted_entry_fee: string | null
          terrain: string | null
          town: string | null
          website_url: string | null
        }
        Insert: {
          admin_note?: string | null
          claim_slug?: string | null
          county?: string | null
          created_event_id?: string | null
          distances?: string[]
          email: string
          event_details: string
          id?: string
          is_reviewed?: boolean
          kind?: string
          organiser?: string | null
          postcode?: string | null
          race_date?: string | null
          race_name?: string | null
          reviewed_at?: string | null
          seen_at?: string | null
          status?: string
          submitted_at?: string
          submitted_entry_fee?: string | null
          terrain?: string | null
          town?: string | null
          website_url?: string | null
        }
        Update: {
          admin_note?: string | null
          claim_slug?: string | null
          county?: string | null
          created_event_id?: string | null
          distances?: string[]
          email?: string
          event_details?: string
          id?: string
          is_reviewed?: boolean
          kind?: string
          organiser?: string | null
          postcode?: string | null
          race_date?: string | null
          race_name?: string | null
          reviewed_at?: string | null
          seen_at?: string | null
          status?: string
          submitted_at?: string
          submitted_entry_fee?: string | null
          terrain?: string | null
          town?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_created_event_id_fkey"
            columns: ["created_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_created_event_id_fkey"
            columns: ["created_event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      sync_dedupe_candidates: {
        Row: {
          created_at: string
          id: string
          incoming_date: string | null
          incoming_name: string
          incoming_town: string | null
          matched_event_id: string | null
          reason: string | null
          resolved_at: string | null
          source: string
          sync_run_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          incoming_date?: string | null
          incoming_name: string
          incoming_town?: string | null
          matched_event_id?: string | null
          reason?: string | null
          resolved_at?: string | null
          source: string
          sync_run_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          incoming_date?: string | null
          incoming_name?: string
          incoming_town?: string | null
          matched_event_id?: string | null
          reason?: string | null
          resolved_at?: string | null
          source?: string
          sync_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_dedupe_candidates_matched_event_id_fkey"
            columns: ["matched_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_dedupe_candidates_matched_event_id_fkey"
            columns: ["matched_event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_dedupe_candidates_sync_run_id_fkey"
            columns: ["sync_run_id"]
            isOneToOne: false
            referencedRelation: "sync_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_runs: {
        Row: {
          active: number | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          failed_pages: number | null
          fetched: number | null
          finished_at: string | null
          id: string
          new_events: number | null
          skipped_dupes: number | null
          skipped_no_date: number | null
          source: string
          started_at: string
          status: string
          updated_existing: number | null
          written: number | null
        }
        Insert: {
          active?: number | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          failed_pages?: number | null
          fetched?: number | null
          finished_at?: string | null
          id?: string
          new_events?: number | null
          skipped_dupes?: number | null
          skipped_no_date?: number | null
          source: string
          started_at?: string
          status?: string
          updated_existing?: number | null
          written?: number | null
        }
        Update: {
          active?: number | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          failed_pages?: number | null
          fetched?: number | null
          finished_at?: string | null
          id?: string
          new_events?: number | null
          skipped_dupes?: number | null
          skipped_no_date?: number | null
          source?: string
          started_at?: string
          status?: string
          updated_existing?: number | null
          written?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      public_clubs: {
        Row: {
          affiliation_number: string | null
          claimed_at: string | null
          country: string | null
          county: string | null
          created_at: string | null
          disciplines: string[] | null
          governing_body: string | null
          id: string | null
          is_claimed: boolean | null
          last_verified_at: string | null
          lat: number | null
          lng: number | null
          name: string | null
          norm_created_at: string | null
          postcode: string | null
          region: string | null
          slug: string | null
          status: string | null
          town: string | null
          website_url: string | null
        }
        Insert: {
          affiliation_number?: string | null
          claimed_at?: string | null
          country?: string | null
          county?: string | null
          created_at?: string | null
          disciplines?: string[] | null
          governing_body?: string | null
          id?: string | null
          is_claimed?: boolean | null
          last_verified_at?: string | null
          lat?: number | null
          lng?: number | null
          name?: string | null
          norm_created_at?: string | null
          postcode?: string | null
          region?: string | null
          slug?: string | null
          status?: string | null
          town?: string | null
          website_url?: string | null
        }
        Update: {
          affiliation_number?: string | null
          claimed_at?: string | null
          country?: string | null
          county?: string | null
          created_at?: string | null
          disciplines?: string[] | null
          governing_body?: string | null
          id?: string | null
          is_claimed?: boolean | null
          last_verified_at?: string | null
          lat?: number | null
          lng?: number | null
          name?: string | null
          norm_created_at?: string | null
          postcode?: string | null
          region?: string | null
          slug?: string | null
          status?: string | null
          town?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      public_events: {
        Row: {
          country: string | null
          county: string | null
          created_at: string | null
          date_from: string | null
          date_is_estimated: boolean | null
          date_raw: string | null
          date_to: string | null
          discipline: string | null
          distance_tags: string[] | null
          distances: string | null
          entry_fee: string | null
          entry_url: string | null
          id: string | null
          is_featured: boolean | null
          is_recurring: boolean | null
          is_upcoming: boolean | null
          lat: number | null
          licensed: string | null
          lng: number | null
          location_raw: string | null
          name: string | null
          norm_created_at: string | null
          norm_id: string | null
          organiser: string | null
          organiser_url: string | null
          region: string | null
          series_key: string | null
          slug: string | null
          sort_date: string | null
          status: string | null
          terrain_tags: string[] | null
          town: string | null
        }
        Insert: {
          country?: string | null
          county?: string | null
          created_at?: string | null
          date_from?: string | null
          date_is_estimated?: boolean | null
          date_raw?: string | null
          date_to?: string | null
          discipline?: string | null
          distance_tags?: string[] | null
          distances?: string | null
          entry_fee?: string | null
          entry_url?: string | null
          id?: string | null
          is_featured?: boolean | null
          is_recurring?: boolean | null
          is_upcoming?: boolean | null
          lat?: number | null
          licensed?: string | null
          lng?: number | null
          location_raw?: string | null
          name?: string | null
          norm_created_at?: string | null
          norm_id?: string | null
          organiser?: string | null
          organiser_url?: string | null
          region?: string | null
          series_key?: string | null
          slug?: string | null
          sort_date?: string | null
          status?: string | null
          terrain_tags?: string[] | null
          town?: string | null
        }
        Update: {
          country?: string | null
          county?: string | null
          created_at?: string | null
          date_from?: string | null
          date_is_estimated?: boolean | null
          date_raw?: string | null
          date_to?: string | null
          discipline?: string | null
          distance_tags?: string[] | null
          distances?: string | null
          entry_fee?: string | null
          entry_url?: string | null
          id?: string | null
          is_featured?: boolean | null
          is_recurring?: boolean | null
          is_upcoming?: boolean | null
          lat?: number | null
          licensed?: string | null
          lng?: number | null
          location_raw?: string | null
          name?: string | null
          norm_created_at?: string | null
          norm_id?: string | null
          organiser?: string | null
          organiser_url?: string | null
          region?: string | null
          series_key?: string | null
          slug?: string | null
          sort_date?: string | null
          status?: string | null
          terrain_tags?: string[] | null
          town?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      events_within_radius: {
        Args: {
          p_lat: number
          p_lng: number
          p_max_results?: number
          p_radius_miles: number
        }
        Returns: {
          county: string
          date_is_estimated: boolean
          date_raw: string
          distance_miles: number
          distance_type: string
          entry_fee: string
          entry_url: string
          id: string
          is_featured: boolean
          name: string
          organiser_url: string
          slug: string
          town: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      run_england_athletics_chunked: { Args: never; Returns: Json }
      search_clubs_v1: {
        Args: { lim?: number; q: string }
        Returns: {
          county: string
          governing_body: string
          id: string
          is_claimed: boolean
          name: string
          region: string
          slug: string
          town: string
        }[]
      }
      search_events_v1: {
        Args: { lim?: number; q: string }
        Returns: {
          county: string
          date_is_estimated: boolean
          distances: string
          id: string
          is_featured: boolean
          is_past: boolean
          name: string
          slug: string
          sort_date: string
          town: string
        }[]
      }
      set_import_secret: { Args: { p_value: string }; Returns: undefined }
      slugify: { Args: { input: string }; Returns: string }
    }
    Enums: {
      event_governance:
        | "england_athletics"
        | "scottish_athletics"
        | "welsh_athletics"
        | "athletics_ni"
        | "tra"
        | "arc"
        | "fra"
        | "wfra"
        | "sha"
        | "parkrun"
        | "unlicensed"
        | "unknown"
      event_organiser_type:
        | "club"
        | "commercial"
        | "charity"
        | "parkrun"
        | "community"
        | "governing_body"
        | "unknown"
      event_race_profile:
        | "road_race"
        | "trail_race"
        | "fell_race"
        | "ultra"
        | "multi_terrain"
        | "track"
        | "cross_country"
        | "parkrun"
        | "virtual"
        | "other"
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
      event_governance: [
        "england_athletics",
        "scottish_athletics",
        "welsh_athletics",
        "athletics_ni",
        "tra",
        "arc",
        "fra",
        "wfra",
        "sha",
        "parkrun",
        "unlicensed",
        "unknown",
      ],
      event_organiser_type: [
        "club",
        "commercial",
        "charity",
        "parkrun",
        "community",
        "governing_body",
        "unknown",
      ],
      event_race_profile: [
        "road_race",
        "trail_race",
        "fell_race",
        "ultra",
        "multi_terrain",
        "track",
        "cross_country",
        "parkrun",
        "virtual",
        "other",
      ],
    },
  },
} as const
