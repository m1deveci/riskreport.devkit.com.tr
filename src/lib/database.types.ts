export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      locations: {
        Row: {
          id: string
          name: string
          description: string
          main_email: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          main_email: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          main_email?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      regions: {
        Row: {
          id: string
          location_id: string
          name: string
          description: string
          qr_code_token: string
          qr_code_url: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          location_id: string
          name: string
          description?: string
          qr_code_token: string
          qr_code_url: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          location_id?: string
          name?: string
          description?: string
          qr_code_token?: string
          qr_code_url?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      isg_experts: {
        Row: {
          id: string
          location_id: string
          full_name: string
          email: string
          phone: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          location_id: string
          full_name: string
          email: string
          phone: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          location_id?: string
          full_name?: string
          email?: string
          phone?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      near_miss_reports: {
        Row: {
          id: string
          incident_number: string
          location_id: string
          region_id: string
          full_name: string
          phone: string
          category: string
          description: string
          status: string
          internal_notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          incident_number?: string
          location_id: string
          region_id: string
          full_name: string
          phone: string
          category: string
          description?: string
          status?: string
          internal_notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          incident_number?: string
          location_id?: string
          region_id?: string
          full_name?: string
          phone?: string
          category?: string
          description?: string
          status?: string
          internal_notes?: string
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          full_name: string
          email: string
          role: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          role?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          role?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      system_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          details: Json
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          details?: Json
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          details?: Json
          ip_address?: string | null
          created_at?: string
        }
      }
      system_settings: {
        Row: {
          id: string
          site_title: string
          smtp_host: string
          smtp_port: number
          smtp_username: string
          smtp_password: string
          smtp_from_email: string
          backup_target_path: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          site_title?: string
          smtp_host?: string
          smtp_port?: number
          smtp_username?: string
          smtp_password?: string
          smtp_from_email?: string
          backup_target_path?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          site_title?: string
          smtp_host?: string
          smtp_port?: number
          smtp_username?: string
          smtp_password?: string
          smtp_from_email?: string
          backup_target_path?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
