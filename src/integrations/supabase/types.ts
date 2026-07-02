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
      admin_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_name: string | null
          created_at: string
          id: string
          metadata: Json | null
          new_value: string | null
          node_label: string | null
          node_type: string | null
          old_value: string | null
          system_id: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          action: string
          actor_name?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          node_label?: string | null
          node_type?: string | null
          old_value?: string | null
          system_id?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          action?: string
          actor_name?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          node_label?: string | null
          node_type?: string | null
          old_value?: string | null
          system_id?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "key_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cylinder_types: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
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
      impersonation_log: {
        Row: {
          admin_id: string
          ended_at: string | null
          id: string
          started_at: string
          target_email: string | null
          target_user_id: string
        }
        Insert: {
          admin_id: string
          ended_at?: string | null
          id?: string
          started_at?: string
          target_email?: string | null
          target_user_id: string
        }
        Update: {
          admin_id?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          target_email?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      key_holders: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          archived_reason: string | null
          created_at: string
          created_by: string | null
          department: string | null
          email: string | null
          external_reference: string | null
          holder_type: string
          id: string
          name: string
          notes: string | null
          org_id: string
          phone: string | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          archived_reason?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          external_reference?: string | null
          holder_type?: string
          id?: string
          name: string
          notes?: string | null
          org_id: string
          phone?: string | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          archived_reason?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          external_reference?: string | null
          holder_type?: string
          id?: string
          name?: string
          notes?: string | null
          org_id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "key_holders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      key_issues: {
        Row: {
          created_at: string
          expected_return_date: string | null
          holder_id: string
          id: string
          issued_at: string
          issued_by: string | null
          lost_reported_at: string | null
          lost_reported_by: string | null
          node_id: string
          notes: string | null
          quantity: number
          replacement_order_id: string | null
          resolution_notes: string | null
          resolution_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          returned_at: string | null
          returned_by: string | null
          status: string
          system_id: string
        }
        Insert: {
          created_at?: string
          expected_return_date?: string | null
          holder_id: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          lost_reported_at?: string | null
          lost_reported_by?: string | null
          node_id: string
          notes?: string | null
          quantity?: number
          replacement_order_id?: string | null
          resolution_notes?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          returned_at?: string | null
          returned_by?: string | null
          status?: string
          system_id: string
        }
        Update: {
          created_at?: string
          expected_return_date?: string | null
          holder_id?: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          lost_reported_at?: string | null
          lost_reported_by?: string | null
          node_id?: string
          notes?: string | null
          quantity?: number
          replacement_order_id?: string | null
          resolution_notes?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          returned_at?: string | null
          returned_by?: string | null
          status?: string
          system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "key_issues_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "key_holders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_issues_replacement_order_id_fkey"
            columns: ["replacement_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_issues_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "key_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      key_systems: {
        Row: {
          commission_pct: number | null
          created_at: string
          door_count: number
          id: string
          is_fulfilled: boolean | null
          name: string
          next_differ: number
          org_id: string | null
          partner_id: string | null
          reference: string | null
          tree_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          commission_pct?: number | null
          created_at?: string
          door_count?: number
          id?: string
          is_fulfilled?: boolean | null
          name: string
          next_differ?: number
          org_id?: string | null
          partner_id?: string | null
          reference?: string | null
          tree_data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          commission_pct?: number | null
          created_at?: string
          door_count?: number
          id?: string
          is_fulfilled?: boolean | null
          name?: string
          next_differ?: number
          org_id?: string | null
          partner_id?: string | null
          reference?: string | null
          tree_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "key_systems_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_systems_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
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
          commission_amount: number | null
          commission_pct: number | null
          cylinder_type: string | null
          differ_ref: string | null
          finish: string | null
          id: string
          item_type: string
          key_reference: string | null
          line_total: number
          order_id: string
          product_code: string | null
          quantity: number
          room_label: string | null
          unit_price: number
        }
        Insert: {
          commission_amount?: number | null
          commission_pct?: number | null
          cylinder_type?: string | null
          differ_ref?: string | null
          finish?: string | null
          id?: string
          item_type: string
          key_reference?: string | null
          line_total?: number
          order_id: string
          product_code?: string | null
          quantity?: number
          room_label?: string | null
          unit_price?: number
        }
        Update: {
          commission_amount?: number | null
          commission_pct?: number | null
          cylinder_type?: string | null
          differ_ref?: string | null
          finish?: string | null
          id?: string
          item_type?: string
          key_reference?: string | null
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
          customer_po_ref: string | null
          delivery_address: Json | null
          delivery_charge: number
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string
          payment_status: string
          po_number: string | null
          po_sent_at: string | null
          po_sent_to: string | null
          project_name: string | null
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
          customer_po_ref?: string | null
          delivery_address?: Json | null
          delivery_charge?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string
          payment_status?: string
          po_number?: string | null
          po_sent_at?: string | null
          po_sent_to?: string | null
          project_name?: string | null
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
          customer_po_ref?: string | null
          delivery_address?: Json | null
          delivery_charge?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string
          payment_status?: string
          po_number?: string | null
          po_sent_at?: string | null
          po_sent_to?: string | null
          project_name?: string | null
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
      org_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          first_name: string
          id: string
          invited_by: string
          last_name: string
          org_id: string
          org_role: string
          system_ids: string[] | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          first_name: string
          id?: string
          invited_by: string
          last_name: string
          org_id: string
          org_role: string
          system_ids?: string[] | null
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          first_name?: string
          id?: string
          invited_by?: string
          last_name?: string
          org_id?: string
          org_role?: string
          system_ids?: string[] | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          invited_by: string | null
          last_name: string
          org_id: string
          org_role: string
          removed_at: string | null
          removed_by: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          invited_by?: string | null
          last_name: string
          org_id: string
          org_role?: string
          removed_at?: string | null
          removed_by?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          invited_by?: string | null
          last_name?: string
          org_id?: string
          org_role?: string
          removed_at?: string | null
          removed_by?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_ownership_transfers: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          initiated_by: string
          org_id: string
          reason: string | null
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          initiated_by: string
          org_id: string
          reason?: string | null
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          initiated_by?: string
          org_id?: string
          reason?: string | null
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_ownership_transfers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          created_at: string
          id: string
          is_approved: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_approved?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_approved?: boolean | null
          name?: string
        }
        Relationships: []
      }
      partner_logins: {
        Row: {
          created_at: string
          email: string
          id: string
          last_login_at: string | null
          partner_id: string
          password_hash: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_login_at?: string | null
          partner_id: string
          password_hash: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_login_at?: string | null
          partner_id?: string
          password_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_logins_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_payments: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          partner_id: string
          period_end: string
          period_start: string
          status: string
          total_commission: number
          total_revenue: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          partner_id: string
          period_end: string
          period_start: string
          status?: string
          total_commission?: number
          total_revenue?: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          partner_id?: string
          period_end?: string
          period_start?: string
          status?: string
          total_commission?: number
          total_revenue?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_payments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          company: string
          created_at: string
          default_commission_pct: number
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          partner_type: string
          phone: string | null
        }
        Insert: {
          company: string
          created_at?: string
          default_commission_pct?: number
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          partner_type?: string
          phone?: string | null
        }
        Update: {
          company?: string
          created_at?: string
          default_commission_pct?: number
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          partner_type?: string
          phone?: string | null
        }
        Relationships: []
      }
      platform_invites: {
        Row: {
          accepted_at: string | null
          company: string
          created_at: string
          email: string
          expires_at: string
          first_name: string
          id: string
          invited_by: string
          last_name: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company: string
          created_at?: string
          email: string
          expires_at?: string
          first_name: string
          id?: string
          invited_by: string
          last_name: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          company?: string
          created_at?: string
          email?: string
          expires_at?: string
          first_name?: string
          id?: string
          invited_by?: string
          last_name?: string
          token?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          bs_en_1303: boolean
          code: string
          cost_price: number | null
          created_at: string
          cylinder_profile: string | null
          cylinder_type: string
          description: string | null
          finish: string | null
          finish_colour: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          pin_count: number
          price_gbp: number
          product_description: string | null
          product_features: string | null
          security_rating: string | null
          size: string | null
        }
        Insert: {
          bs_en_1303?: boolean
          code: string
          cost_price?: number | null
          created_at?: string
          cylinder_profile?: string | null
          cylinder_type: string
          description?: string | null
          finish?: string | null
          finish_colour?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          pin_count?: number
          price_gbp: number
          product_description?: string | null
          product_features?: string | null
          security_rating?: string | null
          size?: string | null
        }
        Update: {
          bs_en_1303?: boolean
          code?: string
          cost_price?: number | null
          created_at?: string
          cylinder_profile?: string | null
          cylinder_type?: string
          description?: string | null
          finish?: string | null
          finish_colour?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          pin_count?: number
          price_gbp?: number
          product_description?: string | null
          product_features?: string | null
          security_rating?: string | null
          size?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          default_address: Json | null
          default_invoice_address: Json | null
          email: string | null
          first_name: string | null
          id: string
          is_admin: boolean
          last_name: string | null
          name: string | null
          org_id: string | null
          phone: string | null
          referred_by_partner_id: string | null
          role: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          default_address?: Json | null
          default_invoice_address?: Json | null
          email?: string | null
          first_name?: string | null
          id: string
          is_admin?: boolean
          last_name?: string | null
          name?: string | null
          org_id?: string | null
          phone?: string | null
          referred_by_partner_id?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          default_address?: Json | null
          default_invoice_address?: Json | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_admin?: boolean
          last_name?: string | null
          name?: string | null
          org_id?: string | null
          phone?: string | null
          referred_by_partner_id?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_partner_id_fkey"
            columns: ["referred_by_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          company: string | null
          converted_order_id: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_po_ref: string | null
          delivery_address: Json | null
          id: string
          items: Json | null
          notes: string | null
          project_name: string | null
          quote_number: string | null
          sent_at: string | null
          sent_to: string | null
          status: string
          subtotal: number | null
          system_id: string | null
          total: number | null
          tree_snapshot: Json | null
          updated_at: string
          user_id: string
          valid_until: string | null
          vat: number | null
        }
        Insert: {
          company?: string | null
          converted_order_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_po_ref?: string | null
          delivery_address?: Json | null
          id?: string
          items?: Json | null
          notes?: string | null
          project_name?: string | null
          quote_number?: string | null
          sent_at?: string | null
          sent_to?: string | null
          status?: string
          subtotal?: number | null
          system_id?: string | null
          total?: number | null
          tree_snapshot?: Json | null
          updated_at?: string
          user_id: string
          valid_until?: string | null
          vat?: number | null
        }
        Update: {
          company?: string | null
          converted_order_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_po_ref?: string | null
          delivery_address?: Json | null
          id?: string
          items?: Json | null
          notes?: string | null
          project_name?: string | null
          quote_number?: string | null
          sent_at?: string | null
          sent_to?: string | null
          status?: string
          subtotal?: number | null
          system_id?: string | null
          total?: number | null
          tree_snapshot?: Json | null
          updated_at?: string
          user_id?: string
          valid_until?: string | null
          vat?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "key_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      system_access: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          system_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          system_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          system_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_access_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "key_systems"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_po_number: { Args: never; Returns: string }
      assign_quote_number: { Args: never; Returns: string }
      check_is_admin: { Args: never; Returns: boolean }
      current_user_org_approved: { Args: never; Returns: boolean }
      current_user_org_id: { Args: never; Returns: string }
      current_user_org_role: { Args: never; Returns: string }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_org_master_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      transfer_org_master_admin: {
        Args: {
          _from_user_id: string
          _initiated_by: string
          _org_id: string
          _reason?: string
          _to_user_id: string
        }
        Returns: undefined
      }
      user_in_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
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
