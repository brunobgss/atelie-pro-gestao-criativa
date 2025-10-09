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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      asaas_payments: {
        Row: {
          asaas_payment_id: string
          bank_slip_url: string | null
          billing_type: string
          created_at: string | null
          description: string | null
          due_date: string
          empresa_id: string | null
          external_reference: string | null
          id: string
          invoice_url: string | null
          net_value: number | null
          payment_date: string | null
          pix_transaction_id: string | null
          status: string
          transaction_receipt_url: string | null
          updated_at: string | null
          value: number
        }
        Insert: {
          asaas_payment_id: string
          bank_slip_url?: string | null
          billing_type: string
          created_at?: string | null
          description?: string | null
          due_date: string
          empresa_id?: string | null
          external_reference?: string | null
          id?: string
          invoice_url?: string | null
          net_value?: number | null
          payment_date?: string | null
          pix_transaction_id?: string | null
          status: string
          transaction_receipt_url?: string | null
          updated_at?: string | null
          value: number
        }
        Update: {
          asaas_payment_id?: string
          bank_slip_url?: string | null
          billing_type?: string
          created_at?: string | null
          description?: string | null
          due_date?: string
          empresa_id?: string | null
          external_reference?: string | null
          id?: string
          invoice_url?: string | null
          net_value?: number | null
          payment_date?: string | null
          pix_transaction_id?: string | null
          status?: string
          transaction_receipt_url?: string | null
          updated_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "asaas_payments_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_subscriptions: {
        Row: {
          asaas_customer_id: string
          asaas_subscription_id: string
          billing_type: string
          created_at: string | null
          cycle: string
          description: string | null
          empresa_id: string | null
          end_date: string | null
          external_reference: string | null
          id: string
          max_payments: number | null
          net_value: number | null
          next_due_date: string
          status: string
          updated_at: string | null
          value: number
        }
        Insert: {
          asaas_customer_id: string
          asaas_subscription_id: string
          billing_type: string
          created_at?: string | null
          cycle: string
          description?: string | null
          empresa_id?: string | null
          end_date?: string | null
          external_reference?: string | null
          id?: string
          max_payments?: number | null
          net_value?: number | null
          next_due_date: string
          status: string
          updated_at?: string | null
          value: number
        }
        Update: {
          asaas_customer_id?: string
          asaas_subscription_id?: string
          billing_type?: string
          created_at?: string | null
          cycle?: string
          description?: string | null
          empresa_id?: string | null
          end_date?: string | null
          external_reference?: string | null
          id?: string
          max_payments?: number | null
          net_value?: number | null
          next_due_date?: string
          status?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "asaas_subscriptions_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      cars_in_service: {
        Row: {
          car_model: string
          created_at: string
          created_by: string
          customer_name: string
          empresa_id: string | null
          id: string
          license_plate: string
          service_description: string
          service_value: number
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          car_model: string
          created_at?: string
          created_by: string
          customer_name: string
          empresa_id?: string | null
          id?: string
          license_plate: string
          service_description: string
          service_value?: number
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          car_model?: string
          created_at?: string
          created_by?: string
          customer_name?: string
          empresa_id?: string | null
          id?: string
          license_plate?: string
          service_description?: string
          service_value?: number
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cars_in_service_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cars_in_service_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          empresa_id: string | null
          id: string
          name: string
          phone: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          id?: string
          name: string
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          id?: string
          name?: string
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_settings: {
        Row: {
          created_at: string | null
          default_commission_rate: number | null
          empresa_id: string | null
          id: string
          notifications_enabled: boolean | null
          updated_at: string | null
          whatsapp_enabled: boolean | null
          whatsapp_number: string | null
          working_days: string[] | null
          working_hours_end: string | null
          working_hours_start: string | null
        }
        Insert: {
          created_at?: string | null
          default_commission_rate?: number | null
          empresa_id?: string | null
          id?: string
          notifications_enabled?: boolean | null
          updated_at?: string | null
          whatsapp_enabled?: boolean | null
          whatsapp_number?: string | null
          working_days?: string[] | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Update: {
          created_at?: string | null
          default_commission_rate?: number | null
          empresa_id?: string | null
          id?: string
          notifications_enabled?: boolean | null
          updated_at?: string | null
          whatsapp_enabled?: boolean | null
          whatsapp_number?: string | null
          working_days?: string[] | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresa_settings_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          created_at: string | null
          current_period_end: string | null
          endereco: string | null
          id: string
          is_premium: boolean | null
          logo_url: string | null
          nome: string
          plan_type: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          telefone: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          created_at?: string | null
          current_period_end?: string | null
          endereco?: string | null
          id?: string
          is_premium?: boolean | null
          logo_url?: string | null
          nome: string
          plan_type?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          telefone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          created_at?: string | null
          current_period_end?: string | null
          endereco?: string | null
          id?: string
          is_premium?: boolean | null
          logo_url?: string | null
          nome?: string
          plan_type?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          telefone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          description: string
          empresa_id: string | null
          expense_date: string
          id: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by: string
          description: string
          empresa_id?: string | null
          expense_date?: string
          id?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          empresa_id?: string | null
          expense_date?: string
          id?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      global_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          setting_key: string
          setting_type: string | null
          setting_value: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          setting_key: string
          setting_type?: string | null
          setting_value?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          setting_key?: string | null
          setting_type?: string | null
          setting_value?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          category: string | null
          created_at: string | null
          current_stock: number | null
          description: string | null
          empresa_id: string | null
          id: string
          location: string | null
          min_stock: number | null
          name: string
          part_number: string | null
          supplier: string | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          empresa_id?: string | null
          id?: string
          location?: string | null
          min_stock?: number | null
          name: string
          part_number?: string | null
          supplier?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          empresa_id?: string | null
          id?: string
          location?: string | null
          min_stock?: number | null
          name?: string
          part_number?: string | null
          supplier?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string | null
          id: string
          inventory_item_id: string | null
          movement_type: string | null
          new_stock: number
          previous_stock: number
          quantity: number
          reason: string | null
          related_quote_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          inventory_item_id?: string | null
          movement_type?: string | null
          new_stock: number
          previous_stock: number
          quantity: number
          reason?: string | null
          related_quote_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          inventory_item_id?: string | null
          movement_type?: string | null
          new_stock?: number
          previous_stock?: number
          quantity?: number
          reason?: string | null
          related_quote_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_related_quote_id_fkey"
            columns: ["related_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      mecanico_earnings: {
        Row: {
          commission_rate: number
          created_at: string | null
          earnings: number
          id: string
          quote_id: string | null
          service_value: number
          user_empresa_id: string | null
        }
        Insert: {
          commission_rate: number
          created_at?: string | null
          earnings: number
          id?: string
          quote_id?: string | null
          service_value: number
          user_empresa_id?: string | null
        }
        Update: {
          commission_rate?: number
          created_at?: string | null
          earnings?: number
          id?: string
          quote_id?: string | null
          service_value?: number
          user_empresa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mecanico_earnings_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mecanico_earnings_user_empresa_id_fkey"
            columns: ["user_empresa_id"]
            isOneToOne: false
            referencedRelation: "user_empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string | null
          email_notifications: boolean | null
          empresa_id: string | null
          id: string
          notification_types: Json | null
          push_notifications: boolean | null
          updated_at: string | null
          user_id: string | null
          whatsapp_notifications: boolean | null
        }
        Insert: {
          created_at?: string | null
          email_notifications?: boolean | null
          empresa_id?: string | null
          id?: string
          notification_types?: Json | null
          push_notifications?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          whatsapp_notifications?: boolean | null
        }
        Update: {
          created_at?: string | null
          email_notifications?: boolean | null
          empresa_id?: string | null
          id?: string
          notification_types?: Json | null
          push_notifications?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          whatsapp_notifications?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          empresa_id: string | null
          id: string
          is_read: boolean | null
          message: string
          related_id: string | null
          related_table: string | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          related_id?: string | null
          related_table?: string | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          related_id?: string | null
          related_table?: string | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          assigned_to: string | null
          assignment_date: string | null
          car_model: string
          completion_date: string | null
          created_at: string
          created_by: string
          customer_name: string
          empresa_id: string | null
          id: string
          labor_cost: number
          license_plate: string
          parts_cost: number
          service_description: string
          status: string
          tenant_id: string | null
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          assignment_date?: string | null
          car_model: string
          completion_date?: string | null
          created_at?: string
          created_by: string
          customer_name: string
          empresa_id?: string | null
          id?: string
          labor_cost?: number
          license_plate: string
          parts_cost?: number
          service_description: string
          status?: string
          tenant_id?: string | null
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          assignment_date?: string | null
          car_model?: string
          completion_date?: string | null
          created_at?: string
          created_by?: string
          customer_name?: string
          empresa_id?: string | null
          id?: string
          labor_cost?: number
          license_plate?: string
          parts_cost?: number
          service_description?: string
          status?: string
          tenant_id?: string | null
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string
          created_at: string
          description: string | null
          duration: number
          empresa_id: string | null
          id: string
          name: string
          price: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          duration?: number
          empresa_id?: string | null
          id?: string
          name: string
          price?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          duration?: number
          empresa_id?: string | null
          id?: string
          name?: string
          price?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          category: string
          created_at: string | null
          empresa_id: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          empresa_id: string
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          empresa_id?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          id: string
          logo_url: string | null
          nome: string
          plan_type: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          plan_type?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          logo_url?: string | null
          nome?: string | null
          plan_type?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_empresas: {
        Row: {
          can_create_quotes: boolean | null
          can_edit_quotes: boolean | null
          commission_rate: number | null
          created_at: string | null
          empresa_id: string | null
          id: string
          is_active: boolean | null
          is_owner: boolean | null
          role: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          can_create_quotes?: boolean | null
          can_edit_quotes?: boolean | null
          commission_rate?: number | null
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          is_active?: boolean | null
          is_owner?: boolean | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          can_create_quotes?: boolean | null
          can_edit_quotes?: boolean | null
          commission_rate?: number | null
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          is_active?: boolean | null
          is_owner?: boolean | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invites: {
        Row: {
          commission_rate: number | null
          created_at: string | null
          email: string
          empresa_id: string | null
          expires_at: string
          id: string
          invited_by: string | null
          is_used: boolean | null
          role: string | null
          token: string
        }
        Insert: {
          commission_rate?: number | null
          created_at?: string | null
          email: string
          empresa_id?: string | null
          expires_at: string
          id?: string
          invited_by?: string | null
          is_used?: boolean | null
          role?: string | null
          token: string
        }
        Update: {
          commission_rate?: number | null
          created_at?: string | null
          email?: string
          empresa_id?: string | null
          expires_at?: string
          id?: string
          invited_by?: string | null
          is_used?: boolean | null
          role?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invites_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          created_at: string | null
          customer_name: string | null
          delivered_at: string | null
          empresa_id: string | null
          error_message: string | null
          id: string
          message: string
          message_type: string | null
          quote_id: string | null
          sent_at: string | null
          status: string | null
          to_number: string
        }
        Insert: {
          created_at?: string | null
          customer_name?: string | null
          delivered_at?: string | null
          empresa_id?: string | null
          error_message?: string | null
          id?: string
          message: string
          message_type?: string | null
          quote_id?: string | null
          sent_at?: string | null
          status?: string | null
          to_number: string
        }
        Update: {
          created_at?: string | null
          customer_name?: string | null
          delivered_at?: string | null
          empresa_id?: string | null
          error_message?: string | null
          id?: string
          message?: string
          message_type?: string | null
          quote_id?: string | null
          sent_at?: string | null
          status?: string | null
          to_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_settings: {
        Row: {
          auto_send_payments: boolean | null
          auto_send_quotes: boolean | null
          created_at: string | null
          empresa_id: string | null
          id: string
          is_active: boolean | null
          message_templates: Json | null
          updated_at: string | null
          whatsapp_number: string | null
          whatsapp_token: string | null
        }
        Insert: {
          auto_send_payments?: boolean | null
          auto_send_quotes?: boolean | null
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          is_active?: boolean | null
          message_templates?: Json | null
          updated_at?: string | null
          whatsapp_number?: string | null
          whatsapp_token?: string | null
        }
        Update: {
          auto_send_payments?: boolean | null
          auto_send_quotes?: boolean | null
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          is_active?: boolean | null
          message_templates?: Json | null
          updated_at?: string | null
          whatsapp_number?: string | null
          whatsapp_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_settings_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_quote_to_mecanico: {
        Args: { p_mecanico_id: string; p_quote_id: string }
        Returns: Json
      }
      calculate_mecanico_earnings: {
        Args: { p_quote_id: string }
        Returns: undefined
      }
      check_user_confirmation_status: {
        Args: { user_email: string }
        Returns: {
          confirmation_sent_at: string
          created_at: string
          email: string
          email_confirmed: boolean
          last_sign_in_at: string
          user_id: string
        }[]
      }
      create_empresa_with_user: {
        Args:
          | {
              empresa_endereco?: string
              empresa_logo_url?: string
              empresa_nome: string
              empresa_telefone?: string
              user_id: string
            }
          | {
              p_endereco?: string
              p_logo_url?: string
              p_nome: string
              p_telefone?: string
              p_user_email?: string
              p_user_full_name?: string
              p_user_id?: string
              p_user_password?: string
            }
        Returns: Json
      }
      create_notification: {
        Args: {
          p_empresa_id: string
          p_message: string
          p_related_id?: string
          p_related_table?: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: string
      }
      get_asaas_payment_stats: {
        Args: { p_empresa_id: string; p_end_date: string; p_start_date: string }
        Returns: {
          boleto_payments: number
          card_payments: number
          confirmed_payments: number
          overdue_payments: number
          pending_payments: number
          pix_payments: number
          total_net_value: number
          total_payments: number
          total_value: number
        }[]
      }
      get_user_by_email: {
        Args: { user_email: string }
        Returns: {
          email: string
          email_confirmed: boolean
          full_name: string
          user_id: string
        }[]
      }
      get_user_data: {
        Args: { user_ids: string[] }
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      get_user_empresa_id: {
        Args: { p_user_id: string }
        Returns: string
      }
      insert_default_settings: {
        Args: { p_empresa_id: string }
        Returns: undefined
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
