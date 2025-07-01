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
      album_access_logs: {
        Row: {
          action: string
          album_id: string
          created_at: string
          details: Json | null
          device_id: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
        }
        Insert: {
          action: string
          album_id: string
          created_at?: string
          details?: Json | null
          device_id: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          album_id?: string
          created_at?: string
          details?: Json | null
          device_id?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "album_access_logs_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
        ]
      }
      albums: {
        Row: {
          album_code: string
          bride_name: string
          created_at: string
          description: string | null
          groom_name: string
          id: string
          is_active: boolean
          new_album_code: string | null
          photo_limit: number
          user_id: string
          wedding_date: string
        }
        Insert: {
          album_code: string
          bride_name: string
          created_at?: string
          description?: string | null
          groom_name: string
          id?: string
          is_active?: boolean
          new_album_code?: string | null
          photo_limit?: number
          user_id: string
          wedding_date: string
        }
        Update: {
          album_code?: string
          bride_name?: string
          created_at?: string
          description?: string | null
          groom_name?: string
          id?: string
          is_active?: boolean
          new_album_code?: string | null
          photo_limit?: number
          user_id?: string
          wedding_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "albums_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      device_sessions: {
        Row: {
          album_id: string
          created_at: string
          device_id: string
          expires_at: string
          id: string
          ip_address: unknown | null
          is_active: boolean
          last_activity: string
          session_token: string
          user_agent: string | null
        }
        Insert: {
          album_id: string
          created_at?: string
          device_id: string
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          last_activity?: string
          session_token: string
          user_agent?: string | null
        }
        Update: {
          album_id?: string
          created_at?: string
          device_id?: string
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          last_activity?: string
          session_token?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_sessions_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          album_id: string
          device_id: string
          duration: number | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          storage_path: string | null
          thumbnail_url: string | null
          uploaded_at: string
        }
        Insert: {
          album_id: string
          device_id: string
          duration?: number | null
          file_name: string
          file_size: number
          file_type?: string
          id?: string
          storage_path?: string | null
          thumbnail_url?: string | null
          uploaded_at?: string
        }
        Update: {
          album_id?: string
          device_id?: string
          duration?: number | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          storage_path?: string | null
          thumbnail_url?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          attempt_count: number
          blocked_until: string | null
          created_at: string
          id: string
          identifier: string
          window_start: string
        }
        Insert: {
          action: string
          attempt_count?: number
          blocked_until?: string | null
          created_at?: string
          id?: string
          identifier: string
          window_start?: string
        }
        Update: {
          action?: string
          attempt_count?: number
          blocked_until?: string | null
          created_at?: string
          id?: string
          identifier?: string
          window_start?: string
        }
        Relationships: []
      }
      upload_limits: {
        Row: {
          album_id: string
          device_id: string
          id: string
          last_upload: string | null
          upload_count: number
        }
        Insert: {
          album_id: string
          device_id: string
          id?: string
          last_upload?: string | null
          upload_count?: number
        }
        Update: {
          album_id?: string
          device_id?: string
          id?: string
          last_upload?: string | null
          upload_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "upload_limits_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_device_session: {
        Args: {
          p_device_id: string
          p_album_id: string
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: string
      }
      generate_secure_album_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      validate_device_session: {
        Args: {
          p_session_token: string
          p_device_id: string
          p_album_id: string
        }
        Returns: boolean
      }
      validate_media_upload: {
        Args: {
          file_size_bytes: number
          file_type: string
          file_extension: string
        }
        Returns: boolean
      }
      validate_media_upload_enhanced: {
        Args: {
          file_size_bytes: number
          file_type: string
          file_extension: string
          device_id: string
          album_id: string
        }
        Returns: Json
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
