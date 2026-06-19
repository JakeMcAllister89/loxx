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
      cylinders: {
        Row: {
          created_at: string
          cylinder_type: string | null
          differ_number: number
          finish: string | null
          id: string
          node_id: string | null
          quantity: number
          room_label: string | null
          system_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          cylinder_type?: string | null
          differ_number: number
          finish?: string | null
          id?: string
          node_id?: string | null
          quantity?: number
          room_label?: string | null
          system_id: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          cylinder_type?: string | null
          differ_number?: number
          finish?: string | null
          id?: string
          node_id?: string | null
          quantity?: number
          room_label?: string | null
          system_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "cylinders_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cylinders_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "key_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      key_systems: {
        Row: {
          created_at: string
          door_count: number
          id: string
          name: string
          next_differ: number
          reference: string | null
          tree_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          door_count?: number
          id?: string
          name: string
          next_differ?: number
          reference?: string | null
          tree_data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          door_count?: number
          id?: string
          name?: string
          next_differ?: number
          reference?: string | null
          tree_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      keys: {
        Row: {
          created_at: string
          id: string
          key_reference: string | null
          node_id: string | null
          quantity: number
          system_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          key_reference?: string | null
          node_id?: string | null
          quantity?: number
          system_id: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          key_reference?: string | null
          node_id?: string | null
          quantity?: number
          system_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "keys_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keys_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "key_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      nodes: {
        Row: {
          created_at: string
          id: string
          label: string | null
          meta: string | null
          node_type: string
          parent_id: string | null
          sort_order: number
          system_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          meta?: string | null
          node_type: string
          parent_id?: string | null
          sort_order?: number
          system_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          meta?: string | null
          node_type?: string
          parent_id?: string | null
          sort_order?: number
          system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nodes_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "key_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          cylinder_type: string | null
          differ_ref: string | null
          finish: string | null
          id: string
          item_type: string
          line_total: number
          order_id: string
          product_code: string | null
          quantity: number
          room_label: string | null
          unit_price: number
        }
        Insert: {
          cylinder_type?: string | null
          differ_ref?: string | null
          finish?: string | null
          id?: string
          item_type: string
          line_total?: number
          order_id: string
          product_code?: string | null
          quantity?: number
          room_label?: string | null
          unit_price?: number
        }
        Update: {
          cylinder_type?: string | null
          differ_ref?: string | null
          finish?: string | null
          id?: string
          item_type?: string
          line_total?: number
          order_id?: string
          product_code?: string | null
          quantity?: number
          room_label?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          company: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          delivery_address: Json | null
          id: string
          notes: string | null
          purchase_order_ref: string | null
          status: string
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          subtotal: number
          system_id: string | null
          total: number
          tree_snapshot: Json | null
          user_id: string
          vat: number
        }
        Insert: {
          company?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          delivery_address?: Json | null
          id?: string
          notes?: string | null
          purchase_order_ref?: string | null
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          subtotal?: number
          system_id?: string | null
          total?: number
          tree_snapshot?: Json | null
          user_id: string
          vat?: number
        }
        Update: {
          company?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          delivery_address?: Json | null
          id?: string
          notes?: string | null
          purchase_order_ref?: string | null
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          subtotal?: number
          system_id?: string | null
          total?: number
          tree_snapshot?: Json | null
          user_id?: string
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "key_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          bs_en_1303: boolean
          code: string
          created_at: string
          cylinder_type: string
          description: string | null
          finish: string | null
          id: string
          image_url: string | null
          name: string
          pin_count: number
          price_gbp: number
          security_rating: string | null
          size: string | null
        }
        Insert: {
          bs_en_1303?: boolean
          code: string
          created_at?: string
          cylinder_type: string
          description?: string | null
          finish?: string | null
          id?: string
          image_url?: string | null
          name: string
          pin_count?: number
          price_gbp: number
          security_rating?: string | null
          size?: string | null
        }
        Update: {
          bs_en_1303?: boolean
          code?: string
          created_at?: string
          cylinder_type?: string
          description?: string | null
          finish?: string | null
          id?: string
          image_url?: string | null
          name?: string
          pin_count?: number
          price_gbp?: number
          security_rating?: string | null
          size?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
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
