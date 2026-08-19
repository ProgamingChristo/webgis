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
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
  public: {
    Tables: {
      data_sources: {
        Row: {
          code: string
          created_at: string
          description: string | null
          environment: Database["public"]["Enums"]["data_environment"]
          id: string
          is_active: boolean
          metadata: Json
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          environment?: Database["public"]["Enums"]["data_environment"]
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          environment?: Database["public"]["Enums"]["data_environment"]
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      import_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          data_source_id: string
          environment: Database["public"]["Enums"]["data_environment"]
          error_log: Json | null
          failed_records: number
          id: string
          inserted_records: number
          is_dry_run: boolean
          metadata: Json
          processed_records: number
          started_at: string | null
          status: Database["public"]["Enums"]["import_job_status"]
          total_records: number
          updated_at: string
          updated_records: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          data_source_id: string
          environment: Database["public"]["Enums"]["data_environment"]
          error_log?: Json | null
          failed_records?: number
          id?: string
          inserted_records?: number
          is_dry_run?: boolean
          metadata?: Json
          processed_records?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["import_job_status"]
          total_records?: number
          updated_at?: string
          updated_records?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          data_source_id?: string
          environment?: Database["public"]["Enums"]["data_environment"]
          error_log?: Json | null
          failed_records?: number
          id?: string
          inserted_records?: number
          is_dry_run?: boolean
          metadata?: Json
          processed_records?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["import_job_status"]
          total_records?: number
          updated_at?: string
          updated_records?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      spatial_sources: {
        Row: {
          created_at: string
          description: string | null
          id: string
          metadata: Json
          source_name: string
          source_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          source_name: string
          source_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          source_name?: string
          source_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      study_areas: {
        Row: {
          created_at: string
          data_version: string
          description: string | null
          geometry: unknown
          id: string
          metadata: Json
          name: string
          retrieved_at: string
          source_id: string | null
          source_record_id: string | null
          updated_at: string
          validated_at: string | null
          validation_status: Database["public"]["Enums"]["validation_status"]
        }
        Insert: {
          created_at?: string
          data_version?: string
          description?: string | null
          geometry: unknown
          id?: string
          metadata?: Json
          name: string
          retrieved_at?: string
          source_id?: string | null
          source_record_id?: string | null
          updated_at?: string
          validated_at?: string | null
          validation_status?: Database["public"]["Enums"]["validation_status"]
        }
        Update: {
          created_at?: string
          data_version?: string
          description?: string | null
          geometry?: unknown
          id?: string
          metadata?: Json
          name?: string
          retrieved_at?: string
          source_id?: string | null
          source_record_id?: string | null
          updated_at?: string
          validated_at?: string | null
          validation_status?: Database["public"]["Enums"]["validation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "study_areas_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "spatial_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_corridors: {
        Row: {
          created_at: string
          data_version: string
          description: string | null
          geometry: unknown
          id: string
          metadata: Json
          name: string
          retrieved_at: string
          source_id: string | null
          source_record_id: string | null
          transport_mode: string
          updated_at: string
          validated_at: string | null
          validation_status: Database["public"]["Enums"]["validation_status"]
        }
        Insert: {
          created_at?: string
          data_version?: string
          description?: string | null
          geometry: unknown
          id?: string
          metadata?: Json
          name: string
          retrieved_at?: string
          source_id?: string | null
          source_record_id?: string | null
          transport_mode: string
          updated_at?: string
          validated_at?: string | null
          validation_status?: Database["public"]["Enums"]["validation_status"]
        }
        Update: {
          created_at?: string
          data_version?: string
          description?: string | null
          geometry?: unknown
          id?: string
          metadata?: Json
          name?: string
          retrieved_at?: string
          source_id?: string | null
          source_record_id?: string | null
          transport_mode?: string
          updated_at?: string
          validated_at?: string | null
          validation_status?: Database["public"]["Enums"]["validation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "transport_corridors_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "spatial_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_nodes: {
        Row: {
          corridor_id: string | null
          created_at: string
          data_version: string
          geometry: unknown
          id: string
          metadata: Json
          name: string
          node_type: string
          retrieved_at: string
          source_id: string | null
          source_record_id: string | null
          transport_mode: string
          updated_at: string
          validated_at: string | null
          validation_status: Database["public"]["Enums"]["validation_status"]
        }
        Insert: {
          corridor_id?: string | null
          created_at?: string
          data_version?: string
          geometry: unknown
          id?: string
          metadata?: Json
          name: string
          node_type: string
          retrieved_at?: string
          source_id?: string | null
          source_record_id?: string | null
          transport_mode: string
          updated_at?: string
          validated_at?: string | null
          validation_status?: Database["public"]["Enums"]["validation_status"]
        }
        Update: {
          corridor_id?: string | null
          created_at?: string
          data_version?: string
          geometry?: unknown
          id?: string
          metadata?: Json
          name?: string
          node_type?: string
          retrieved_at?: string
          source_id?: string | null
          source_record_id?: string | null
          transport_mode?: string
          updated_at?: string
          validated_at?: string | null
          validation_status?: Database["public"]["Enums"]["validation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "transport_nodes_corridor_id_fkey"
            columns: ["corridor_id"]
            isOneToOne: false
            referencedRelation: "transport_corridors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_nodes_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "spatial_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      umkm_profiles: {
        Row: {
          address: string | null
          business_name: string
          category: string
          created_at: string
          data_version: string
          description: string | null
          geometry: unknown
          id: string
          metadata: Json
          owner_id: string
          retrieved_at: string
          source_id: string | null
          source_record_id: string | null
          updated_at: string
          validated_at: string | null
          validation_status: Database["public"]["Enums"]["validation_status"]
        }
        Insert: {
          address?: string | null
          business_name: string
          category: string
          created_at?: string
          data_version?: string
          description?: string | null
          geometry: unknown
          id?: string
          metadata?: Json
          owner_id: string
          retrieved_at?: string
          source_id?: string | null
          source_record_id?: string | null
          updated_at?: string
          validated_at?: string | null
          validation_status?: Database["public"]["Enums"]["validation_status"]
        }
        Update: {
          address?: string | null
          business_name?: string
          category?: string
          created_at?: string
          data_version?: string
          description?: string | null
          geometry?: unknown
          id?: string
          metadata?: Json
          owner_id?: string
          retrieved_at?: string
          source_id?: string | null
          source_record_id?: string | null
          updated_at?: string
          validated_at?: string | null
          validation_status?: Database["public"]["Enums"]["validation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "umkm_profiles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "umkm_profiles_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "spatial_sources"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_study_areas_within_bbox: {
        Args: {
          max_lat: number
          max_lng: number
          min_lat: number
          min_lng: number
        }
        Returns: {
          created_at: string
          data_version: string
          description: string | null
          geometry: unknown
          id: string
          metadata: Json
          name: string
          retrieved_at: string
          source_id: string | null
          source_record_id: string | null
          updated_at: string
          validated_at: string | null
          validation_status: Database["public"]["Enums"]["validation_status"]
        }[]
        SetofOptions: {
          from: "*"
          to: "study_areas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      find_transport_corridors_within_bbox: {
        Args: {
          max_lat: number
          max_lng: number
          min_lat: number
          min_lng: number
        }
        Returns: {
          created_at: string
          data_version: string
          description: string | null
          geometry: unknown
          id: string
          metadata: Json
          name: string
          retrieved_at: string
          source_id: string | null
          source_record_id: string | null
          transport_mode: string
          updated_at: string
          validated_at: string | null
          validation_status: Database["public"]["Enums"]["validation_status"]
        }[]
        SetofOptions: {
          from: "*"
          to: "transport_corridors"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      find_transport_nodes_near: {
        Args: { origin: unknown; radius_meters: number }
        Returns: {
          corridor_id: string | null
          created_at: string
          data_version: string
          geometry: unknown
          id: string
          metadata: Json
          name: string
          node_type: string
          retrieved_at: string
          source_id: string | null
          source_record_id: string | null
          transport_mode: string
          updated_at: string
          validated_at: string | null
          validation_status: Database["public"]["Enums"]["validation_status"]
        }[]
        SetofOptions: {
          from: "*"
          to: "transport_nodes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      find_transport_nodes_within_bbox: {
        Args: {
          max_lat: number
          max_lng: number
          min_lat: number
          min_lng: number
        }
        Returns: {
          corridor_id: string | null
          created_at: string
          data_version: string
          geometry: unknown
          id: string
          metadata: Json
          name: string
          node_type: string
          retrieved_at: string
          source_id: string | null
          source_record_id: string | null
          transport_mode: string
          updated_at: string
          validated_at: string | null
          validation_status: Database["public"]["Enums"]["validation_status"]
        }[]
        SetofOptions: {
          from: "*"
          to: "transport_nodes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      find_umkm_profiles_near: {
        Args: { origin: unknown; radius_meters: number }
        Returns: {
          address: string | null
          business_name: string
          category: string
          created_at: string
          data_version: string
          description: string | null
          geometry: unknown
          id: string
          metadata: Json
          owner_id: string
          retrieved_at: string
          source_id: string | null
          source_record_id: string | null
          updated_at: string
          validated_at: string | null
          validation_status: Database["public"]["Enums"]["validation_status"]
        }[]
        SetofOptions: {
          from: "*"
          to: "umkm_profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      find_umkm_profiles_within_bbox: {
        Args: {
          max_lat: number
          max_lng: number
          min_lat: number
          min_lng: number
        }
        Returns: {
          address: string | null
          business_name: string
          category: string
          created_at: string
          data_version: string
          description: string | null
          geometry: unknown
          id: string
          metadata: Json
          owner_id: string
          retrieved_at: string
          source_id: string | null
          source_record_id: string | null
          updated_at: string
          validated_at: string | null
          validation_status: Database["public"]["Enums"]["validation_status"]
        }[]
        SetofOptions: {
          from: "*"
          to: "umkm_profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      getra_database_health: { Args: never; Returns: string }
      is_valid_wgs84_geometry: {
        Args: { allowed_types: string[]; input_geometry: unknown }
        Returns: boolean
      }
      make_wgs84_bbox: {
        Args: {
          max_lat: number
          max_lng: number
          min_lat: number
          min_lng: number
        }
        Returns: unknown
      }
      wgs84_distance_meters: {
        Args: { destination: unknown; origin: unknown }
        Returns: number
      }
    }
    Enums: {
      data_environment: "PRODUCTION" | "DUMMY" | "FIXTURE" | "TEST" | "DEV"
      import_job_status:
        | "PENDING"
        | "RUNNING"
        | "VALIDATING"
        | "COMPLETED"
        | "FAILED"
        | "PARTIAL"
        | "CANCELLED"
      user_role: "COMMUTER" | "UMKM" | "COMMUNITY" | "ADMIN"
      validation_status: "PENDING" | "VALIDATED" | "REJECTED" | "ARCHIVED"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      data_environment: ["PRODUCTION", "DUMMY", "FIXTURE", "TEST", "DEV"],
      import_job_status: [
        "PENDING",
        "RUNNING",
        "VALIDATING",
        "COMPLETED",
        "FAILED",
        "PARTIAL",
        "CANCELLED",
      ],
      user_role: ["COMMUTER", "UMKM", "COMMUNITY", "ADMIN"],
      validation_status: ["PENDING", "VALIDATED", "REJECTED", "ARCHIVED"],
    },
  },
} as const
