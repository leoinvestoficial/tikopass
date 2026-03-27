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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      buyer_access: {
        Row: {
          buyer_id: string
          created_at: string
          expires_at: string
          id: string
          invalidated_at: string | null
          ticket_id: string
          token: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          expires_at: string
          id?: string
          invalidated_at?: string | null
          ticket_id: string
          token: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          invalidated_at?: string | null
          ticket_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_access_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string
          city: string
          created_at: string
          date: string
          external_id: string | null
          id: string
          image_url: string | null
          name: string
          source: string | null
          time: string
          updated_at: string
          venue: string
        }
        Insert: {
          category: string
          city: string
          created_at?: string
          date: string
          external_id?: string | null
          id?: string
          image_url?: string | null
          name: string
          source?: string | null
          time: string
          updated_at?: string
          venue: string
        }
        Update: {
          category?: string
          city?: string
          created_at?: string
          date?: string
          external_id?: string | null
          id?: string
          image_url?: string | null
          name?: string
          source?: string | null
          time?: string
          updated_at?: string
          venue?: string
        }
        Relationships: []
      }
      negotiation_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          negotiation_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          negotiation_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          negotiation_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_messages_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiations: {
        Row: {
          buyer_id: string
          checkout_session_id: string | null
          counter_offer_price: number | null
          created_at: string
          id: string
          offer_price: number
          payment_intent_id: string | null
          payment_status: string | null
          platform_fee: number | null
          seller_id: string
          status: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          checkout_session_id?: string | null
          counter_offer_price?: number | null
          created_at?: string
          id?: string
          offer_price: number
          payment_intent_id?: string | null
          payment_status?: string | null
          platform_fee?: number | null
          seller_id: string
          status?: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          checkout_session_id?: string | null
          counter_offer_price?: number | null
          created_at?: string
          id?: string
          offer_price?: number
          payment_intent_id?: string | null
          payment_status?: string | null
          platform_fee?: number | null
          seller_id?: string
          status?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_cep: string | null
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          cpf: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          pix_key: string | null
          pix_key_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seller_ratings: {
        Row: {
          buyer_id: string
          comment: string | null
          created_at: string
          id: string
          negotiation_id: string
          rating: number
          seller_id: string
        }
        Insert: {
          buyer_id: string
          comment?: string | null
          created_at?: string
          id?: string
          negotiation_id: string
          rating: number
          seller_id: string
        }
        Update: {
          buyer_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          negotiation_id?: string
          rating?: number
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_ratings_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_hashes: {
        Row: {
          created_at: string
          hash: string
          id: string
          status: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          hash: string
          id?: string
          status?: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          hash?: string
          id?: string
          status?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_hashes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string
          event_id: string
          extracted_code: string | null
          id: string
          order_id: string | null
          original_price: number | null
          price: number
          rejection_reason: string | null
          row: string | null
          seat: string | null
          sector: string
          seller_id: string
          status: string
          storage_path: string | null
          updated_at: string
          validated_at: string | null
          validation_checks: Json | null
        }
        Insert: {
          created_at?: string
          event_id: string
          extracted_code?: string | null
          id?: string
          order_id?: string | null
          original_price?: number | null
          price: number
          rejection_reason?: string | null
          row?: string | null
          seat?: string | null
          sector: string
          seller_id: string
          status?: string
          storage_path?: string | null
          updated_at?: string
          validated_at?: string | null
          validation_checks?: Json | null
        }
        Update: {
          created_at?: string
          event_id?: string
          extracted_code?: string | null
          id?: string
          order_id?: string | null
          original_price?: number | null
          price?: number
          rejection_reason?: string | null
          row?: string | null
          seat?: string | null
          sector?: string
          seller_id?: string
          status?: string
          storage_path?: string | null
          updated_at?: string
          validated_at?: string | null
          validation_checks?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          negotiation_id: string | null
          released_at: string | null
          status: string
          type: string
          user_id: string
          withdrawn_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          negotiation_id?: string | null
          released_at?: string | null
          status?: string
          type: string
          user_id: string
          withdrawn_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          negotiation_id?: string | null
          released_at?: string | null
          status?: string
          type?: string
          user_id?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
