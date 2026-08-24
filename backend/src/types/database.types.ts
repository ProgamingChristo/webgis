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
  public: {
    Tables: {
      ad_campaign_targets: {
        Row: {
          campaign_id: string
          center_geometry: unknown
          created_at: string
          id: string
          radius_meters: number | null
          study_area_id: string | null
          target_type: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          center_geometry?: unknown
          created_at?: string
          id?: string
          radius_meters?: number | null
          study_area_id?: string | null
          target_type: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          center_geometry?: unknown
          created_at?: string
          id?: string
          radius_meters?: number | null
          study_area_id?: string | null
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaign_targets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_campaign_targets_study_area_id_fkey"
            columns: ["study_area_id"]
            isOneToOne: false
            referencedRelation: "study_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_campaigns: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_at: string | null
          id: string
          merchant_id: string
          name: string
          start_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_at?: string | null
          id?: string
          merchant_id: string
          name: string
          start_at?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_at?: string | null
          id?: string
          merchant_id?: string
          name?: string
          start_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_campaigns_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_creatives: {
        Row: {
          campaign_id: string
          created_at: string
          creative_type: string
          cta_type: string
          description: string | null
          headline: string
          id: string
          image_path: string | null
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          creative_type: string
          cta_type: string
          description?: string | null
          headline: string
          id?: string
          image_path?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          creative_type?: string
          cta_type?: string
          description?: string | null
          headline?: string
          id?: string
          image_path?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_creatives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_processing_runs: {
        Row: {
          analysis_run_id: string | null
          created_at: string
          id: string
          input_references: Json
          model: string
          output: Json
          prompt_version: string | null
          provider: string
          purpose: string
          validation_state: string
        }
        Insert: {
          analysis_run_id?: string | null
          created_at?: string
          id?: string
          input_references?: Json
          model: string
          output?: Json
          prompt_version?: string | null
          provider: string
          purpose: string
          validation_state?: string
        }
        Update: {
          analysis_run_id?: string | null
          created_at?: string
          id?: string
          input_references?: Json
          model?: string
          output?: Json
          prompt_version?: string | null
          provider?: string
          purpose?: string
          validation_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_processing_runs_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "analysis_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_runs: {
        Row: {
          analysis_type: string
          created_at: string
          finished_at: string | null
          id: string
          input_references: Json
          limitations: Json
          method_version: string
          parameters: Json
          result_summary: Json
          started_at: string
          status: Database["public"]["Enums"]["pipeline_run_status"]
          study_area_id: string | null
        }
        Insert: {
          analysis_type: string
          created_at?: string
          finished_at?: string | null
          id?: string
          input_references?: Json
          limitations?: Json
          method_version: string
          parameters?: Json
          result_summary?: Json
          started_at?: string
          status?: Database["public"]["Enums"]["pipeline_run_status"]
          study_area_id?: string | null
        }
        Update: {
          analysis_type?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          input_references?: Json
          limitations?: Json
          method_version?: string
          parameters?: Json
          result_summary?: Json
          started_at?: string
          status?: Database["public"]["Enums"]["pipeline_run_status"]
          study_area_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_runs_study_area_id_fkey"
            columns: ["study_area_id"]
            isOneToOne: false
            referencedRelation: "study_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
          request_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          request_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          category_group: string
          created_at: string
          icon_key: string | null
          id: string
          is_active: boolean
          metadata: Json
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_group?: string
          created_at?: string
          icon_key?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_group?: string
          created_at?: string
          icon_key?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_aliases: {
        Row: {
          category_id: string
          created_at: string
          id: string
          metadata: Json
          source_label: string
          source_scope: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          metadata?: Json
          source_label: string
          source_scope?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          source_label?: string
          source_scope?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_aliases_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      community_activities: {
        Row: {
          description: string | null
          geometry: unknown
          id: string
          images: string | null
          ingested_at: string
          ingestion_run_id: string | null
          latitude: number | null
          longitude: number | null
          medias: string | null
          raw_payload: Json
          source_id: string | null
          source_record_id: string | null
          title: string | null
          validation_status: Database["public"]["Enums"]["validation_status"]
          videos: string | null
        }
        Insert: {
          description?: string | null
          geometry?: unknown
          id?: string
          images?: string | null
          ingested_at?: string
          ingestion_run_id?: string | null
          latitude?: number | null
          longitude?: number | null
          medias?: string | null
          raw_payload?: Json
          source_id?: string | null
          source_record_id?: string | null
          title?: string | null
          validation_status?: Database["public"]["Enums"]["validation_status"]
          videos?: string | null
        }
        Update: {
          description?: string | null
          geometry?: unknown
          id?: string
          images?: string | null
          ingested_at?: string
          ingestion_run_id?: string | null
          latitude?: number | null
          longitude?: number | null
          medias?: string | null
          raw_payload?: Json
          source_id?: string | null
          source_record_id?: string | null
          title?: string | null
          validation_status?: Database["public"]["Enums"]["validation_status"]
          videos?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_activities_ingestion_run_id_fkey"
            columns: ["ingestion_run_id"]
            isOneToOne: false
            referencedRelation: "dataset_ingestion_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_activities_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "spatial_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          depth: number
          id: string
          parent_comment_id: string | null
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          depth: number
          id?: string
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          depth?: number
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_media: {
        Row: {
          created_at: string
          height: number
          id: string
          media_type: string
          mime_type: string
          post_id: string
          size_bytes: number
          storage_bucket: string
          storage_path: string
          uploader_id: string
          width: number
        }
        Insert: {
          created_at?: string
          height: number
          id?: string
          media_type?: string
          mime_type: string
          post_id: string
          size_bytes: number
          storage_bucket?: string
          storage_path: string
          uploader_id: string
          width: number
        }
        Update: {
          created_at?: string
          height?: number
          id?: string
          media_type?: string
          mime_type?: string
          post_id?: string
          size_bytes?: number
          storage_bucket?: string
          storage_path?: string
          uploader_id?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_media_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          category: string | null
          content: string
          created_at: string
          id: string
          location: unknown
          location_accuracy_m: number | null
          location_visibility: string | null
          post_type: string
          updated_at: string
        }
        Insert: {
          author_id: string
          category?: string | null
          content: string
          created_at?: string
          id?: string
          location?: unknown
          location_accuracy_m?: number | null
          location_visibility?: string | null
          post_type?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          location?: unknown
          location_accuracy_m?: number | null
          location_visibility?: string | null
          post_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commuter_request_cluster_members: {
        Row: {
          cluster_id: string
          created_at: string
          request_id: string
        }
        Insert: {
          cluster_id: string
          created_at?: string
          request_id: string
        }
        Update: {
          cluster_id?: string
          created_at?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commuter_request_cluster_members_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "commuter_request_clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commuter_request_cluster_members_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "commuter_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      commuter_request_clusters: {
        Row: {
          aggregation_key: string
          budget_bucket: number
          category: string
          center_location: unknown
          cluster_radius_meters: number
          created_at: string
          grid_latitude: number
          grid_longitude: number
          id: string
          status: string
          updated_at: string
          window_days: number
        }
        Insert: {
          aggregation_key: string
          budget_bucket: number
          category: string
          center_location: unknown
          cluster_radius_meters?: number
          created_at?: string
          grid_latitude: number
          grid_longitude: number
          id?: string
          status?: string
          updated_at?: string
          window_days?: number
        }
        Update: {
          aggregation_key?: string
          budget_bucket?: number
          category?: string
          center_location?: unknown
          cluster_radius_meters?: number
          created_at?: string
          grid_latitude?: number
          grid_longitude?: number
          id?: string
          status?: string
          updated_at?: string
          window_days?: number
        }
        Relationships: []
      }
      commuter_requests: {
        Row: {
          author_id: string
          category: string
          created_at: string
          description: string
          expires_at: string
          id: string
          location: unknown
          location_accuracy_m: number | null
          location_visibility: string
          max_budget: number
          radius_meters: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          category: string
          created_at?: string
          description: string
          expires_at: string
          id?: string
          location: unknown
          location_accuracy_m?: number | null
          location_visibility?: string
          max_budget: number
          radius_meters: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          category?: string
          created_at?: string
          description?: string
          expires_at?: string
          id?: string
          location?: unknown
          location_accuracy_m?: number | null
          location_visibility?: string
          max_budget?: number
          radius_meters?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commuter_requests_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      dataset_ingestion_runs: {
        Row: {
          dataset_kind: string
          duplicate_count: number
          error_count: number
          error_summary: string | null
          finished_at: string | null
          id: string
          inserted_count: number
          metadata: Json
          received_count: number
          rejected_count: number
          source_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["pipeline_run_status"]
          updated_count: number
        }
        Insert: {
          dataset_kind: string
          duplicate_count?: number
          error_count?: number
          error_summary?: string | null
          finished_at?: string | null
          id?: string
          inserted_count?: number
          metadata?: Json
          received_count?: number
          rejected_count?: number
          source_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["pipeline_run_status"]
          updated_count?: number
        }
        Update: {
          dataset_kind?: string
          duplicate_count?: number
          error_count?: number
          error_summary?: string | null
          finished_at?: string | null
          id?: string
          inserted_count?: number
          metadata?: Json
          received_count?: number
          rejected_count?: number
          source_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["pipeline_run_status"]
          updated_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "dataset_ingestion_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "spatial_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      dataset_versions: {
        Row: {
          activated_at: string | null
          code: string
          created_at: string
          description: string | null
          environment: Database["public"]["Enums"]["data_environment"]
          id: string
          manifest: Json
          status: Database["public"]["Enums"]["dataset_version_status"]
          updated_at: string
          validated_at: string | null
          version: string
        }
        Insert: {
          activated_at?: string | null
          code: string
          created_at?: string
          description?: string | null
          environment: Database["public"]["Enums"]["data_environment"]
          id?: string
          manifest?: Json
          status?: Database["public"]["Enums"]["dataset_version_status"]
          updated_at?: string
          validated_at?: string | null
          version: string
        }
        Update: {
          activated_at?: string | null
          code?: string
          created_at?: string
          description?: string | null
          environment?: Database["public"]["Enums"]["data_environment"]
          id?: string
          manifest?: Json
          status?: Database["public"]["Enums"]["dataset_version_status"]
          updated_at?: string
          validated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      entity_network_access: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          environment: string
          id: string
          pedestrian_node_id: string
          snap_distance_meters: number
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          environment?: string
          id?: string
          pedestrian_node_id: string
          snap_distance_meters: number
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          environment?: string
          id?: string
          pedestrian_node_id?: string
          snap_distance_meters?: number
        }
        Relationships: [
          {
            foreignKeyName: "entity_network_access_pedestrian_node_id_fkey"
            columns: ["pedestrian_node_id"]
            isOneToOne: false
            referencedRelation: "pedestrian_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_registry: {
        Row: {
          description: string | null
          feature_key: string
          is_public: boolean
          metadata: Json
          status: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          feature_key: string
          is_public?: boolean
          metadata?: Json
          status: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          feature_key?: string
          is_public?: boolean
          metadata?: Json
          status?: string
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
      merchant_categories: {
        Row: {
          category_id: string
          created_at: string
          is_primary: boolean
          merchant_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          is_primary?: boolean
          merchant_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          is_primary?: boolean
          merchant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_categories_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_claims: {
        Row: {
          created_at: string
          evidence: Json
          id: string
          merchant_id: string
          note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["merchant_claim_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          evidence?: Json
          id?: string
          merchant_id: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["merchant_claim_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          evidence?: Json
          id?: string
          merchant_id?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["merchant_claim_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_claims_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_claims_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_source_links: {
        Row: {
          confidence: number | null
          created_at: string
          evidence_type: string | null
          first_seen_at: string | null
          id: string
          last_seen_at: string | null
          merchant_id: string
          metadata: Json
          source_id: string
          source_record_id: string
          source_table: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          evidence_type?: string | null
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          merchant_id: string
          metadata?: Json
          source_id: string
          source_record_id: string
          source_table: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          evidence_type?: string | null
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          merchant_id?: string
          metadata?: Json
          source_id?: string
          source_record_id?: string
          source_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_source_links_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_source_links_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "spatial_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          data_quality_score: number | null
          description: string | null
          id: string
          is_mobile: boolean
          location: unknown
          metadata: Json
          name: string
          opening_hours: Json
          owner_id: string | null
          price_level: string | null
          primary_category_id: string | null
          publish_status: Database["public"]["Enums"]["publish_status"]
          slug: string | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["data_quality_status"]
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          data_quality_score?: number | null
          description?: string | null
          id?: string
          is_mobile?: boolean
          location: unknown
          metadata?: Json
          name: string
          opening_hours?: Json
          owner_id?: string | null
          price_level?: string | null
          primary_category_id?: string | null
          publish_status?: Database["public"]["Enums"]["publish_status"]
          slug?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["data_quality_status"]
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          data_quality_score?: number | null
          description?: string | null
          id?: string
          is_mobile?: boolean
          location?: unknown
          metadata?: Json
          name?: string
          opening_hours?: Json
          owner_id?: string | null
          price_level?: string | null
          primary_category_id?: string | null
          publish_status?: Database["public"]["Enums"]["publish_status"]
          slug?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["data_quality_status"]
        }
        Relationships: [
          {
            foreignKeyName: "merchants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchants_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchants_primary_category_id_fkey"
            columns: ["primary_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_menu_records: {
        Row: {
          average_price: number | null
          buyer_condition: string | null
          digital_menu_url: string | null
          geometry: unknown
          id: string
          ingested_at: string
          ingestion_run_id: string | null
          latitude: number | null
          longitude: number | null
          main_menu: string | null
          menu_photo_1_url: string | null
          menu_photo_2_url: string | null
          mobility: string | null
          place_name: string | null
          place_photo_url: string | null
          place_type: string | null
          raw_payload: Json
          recorded_date: string | null
          recorded_time: string | null
          source_id: string | null
          source_record_id: string | null
          validation_status: Database["public"]["Enums"]["validation_status"]
        }
        Insert: {
          average_price?: number | null
          buyer_condition?: string | null
          digital_menu_url?: string | null
          geometry?: unknown
          id?: string
          ingested_at?: string
          ingestion_run_id?: string | null
          latitude?: number | null
          longitude?: number | null
          main_menu?: string | null
          menu_photo_1_url?: string | null
          menu_photo_2_url?: string | null
          mobility?: string | null
          place_name?: string | null
          place_photo_url?: string | null
          place_type?: string | null
          raw_payload?: Json
          recorded_date?: string | null
          recorded_time?: string | null
          source_id?: string | null
          source_record_id?: string | null
          validation_status?: Database["public"]["Enums"]["validation_status"]
        }
        Update: {
          average_price?: number | null
          buyer_condition?: string | null
          digital_menu_url?: string | null
          geometry?: unknown
          id?: string
          ingested_at?: string
          ingestion_run_id?: string | null
          latitude?: number | null
          longitude?: number | null
          main_menu?: string | null
          menu_photo_1_url?: string | null
          menu_photo_2_url?: string | null
          mobility?: string | null
          place_name?: string | null
          place_photo_url?: string | null
          place_type?: string | null
          raw_payload?: Json
          recorded_date?: string | null
          recorded_time?: string | null
          source_id?: string | null
          source_record_id?: string | null
          validation_status?: Database["public"]["Enums"]["validation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "mission_menu_records_ingestion_run_id_fkey"
            columns: ["ingestion_run_id"]
            isOneToOne: false
            referencedRelation: "dataset_ingestion_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_menu_records_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "spatial_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_property_records: {
        Row: {
          address: string | null
          front_photo_url: string | null
          geometry: unknown
          id: string
          ingested_at: string
          ingestion_run_id: string | null
          latitude: number | null
          longitude: number | null
          promotion_photo_url: string | null
          property_category: string | null
          property_listing_type: string | null
          raw_payload: Json
          recorded_date: string | null
          source_id: string | null
          source_record_id: string | null
          validation_status: Database["public"]["Enums"]["validation_status"]
        }
        Insert: {
          address?: string | null
          front_photo_url?: string | null
          geometry?: unknown
          id?: string
          ingested_at?: string
          ingestion_run_id?: string | null
          latitude?: number | null
          longitude?: number | null
          promotion_photo_url?: string | null
          property_category?: string | null
          property_listing_type?: string | null
          raw_payload?: Json
          recorded_date?: string | null
          source_id?: string | null
          source_record_id?: string | null
          validation_status?: Database["public"]["Enums"]["validation_status"]
        }
        Update: {
          address?: string | null
          front_photo_url?: string | null
          geometry?: unknown
          id?: string
          ingested_at?: string
          ingestion_run_id?: string | null
          latitude?: number | null
          longitude?: number | null
          promotion_photo_url?: string | null
          property_category?: string | null
          property_listing_type?: string | null
          raw_payload?: Json
          recorded_date?: string | null
          source_id?: string | null
          source_record_id?: string | null
          validation_status?: Database["public"]["Enums"]["validation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "mission_property_records_ingestion_run_id_fkey"
            columns: ["ingestion_run_id"]
            isOneToOne: false
            referencedRelation: "dataset_ingestion_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_property_records_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "spatial_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_receipt_records: {
        Row: {
          geometry: unknown
          id: string
          ingested_at: string
          ingestion_run_id: string | null
          latitude_raw: string | null
          longitude_raw: string | null
          merchant_name: string | null
          payment_method: string | null
          place_category: string | null
          privacy_status: Database["public"]["Enums"]["privacy_status"]
          raw_payload: Json
          receipt_photo_url: string | null
          source_id: string | null
          source_record_id: string | null
          transaction_date: string | null
          transaction_time: string | null
          validation_status: Database["public"]["Enums"]["validation_status"]
        }
        Insert: {
          geometry?: unknown
          id?: string
          ingested_at?: string
          ingestion_run_id?: string | null
          latitude_raw?: string | null
          longitude_raw?: string | null
          merchant_name?: string | null
          payment_method?: string | null
          place_category?: string | null
          privacy_status?: Database["public"]["Enums"]["privacy_status"]
          raw_payload?: Json
          receipt_photo_url?: string | null
          source_id?: string | null
          source_record_id?: string | null
          transaction_date?: string | null
          transaction_time?: string | null
          validation_status?: Database["public"]["Enums"]["validation_status"]
        }
        Update: {
          geometry?: unknown
          id?: string
          ingested_at?: string
          ingestion_run_id?: string | null
          latitude_raw?: string | null
          longitude_raw?: string | null
          merchant_name?: string | null
          payment_method?: string | null
          place_category?: string | null
          privacy_status?: Database["public"]["Enums"]["privacy_status"]
          raw_payload?: Json
          receipt_photo_url?: string | null
          source_id?: string | null
          source_record_id?: string | null
          transaction_date?: string | null
          transaction_time?: string | null
          validation_status?: Database["public"]["Enums"]["validation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "mission_receipt_records_ingestion_run_id_fkey"
            columns: ["ingestion_run_id"]
            isOneToOne: false
            referencedRelation: "dataset_ingestion_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_receipt_records_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "spatial_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_events: {
        Row: {
          action: string
          after_status: string | null
          before_status: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
          moderator_id: string | null
          note: string | null
        }
        Insert: {
          action: string
          after_status?: string | null
          before_status?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json
          moderator_id?: string | null
          note?: string | null
        }
        Update: {
          action?: string
          after_status?: string | null
          before_status?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json
          moderator_id?: string | null
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_events_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pedestrian_edges: {
        Row: {
          code: string
          cost: number
          created_at: string
          data_version: string
          environment: string
          geometry: unknown
          id: string
          length_meters: number
          metadata: Json
          reverse_cost: number
          routing_id: number
          source: number
          source_id: string
          source_record_id: string | null
          study_area_id: string
          target: number
          updated_at: string
          validated_at: string | null
          validation_status: string
          walkable: boolean
        }
        Insert: {
          code: string
          cost: number
          created_at?: string
          data_version?: string
          environment?: string
          geometry: unknown
          id?: string
          length_meters: number
          metadata?: Json
          reverse_cost: number
          routing_id?: number
          source: number
          source_id: string
          source_record_id?: string | null
          study_area_id: string
          target: number
          updated_at?: string
          validated_at?: string | null
          validation_status?: string
          walkable?: boolean
        }
        Update: {
          code?: string
          cost?: number
          created_at?: string
          data_version?: string
          environment?: string
          geometry?: unknown
          id?: string
          length_meters?: number
          metadata?: Json
          reverse_cost?: number
          routing_id?: number
          source?: number
          source_id?: string
          source_record_id?: string | null
          study_area_id?: string
          target?: number
          updated_at?: string
          validated_at?: string | null
          validation_status?: string
          walkable?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pedestrian_edges_source_fkey"
            columns: ["source"]
            isOneToOne: false
            referencedRelation: "pedestrian_nodes"
            referencedColumns: ["routing_id"]
          },
          {
            foreignKeyName: "pedestrian_edges_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "spatial_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedestrian_edges_study_area_id_fkey"
            columns: ["study_area_id"]
            isOneToOne: false
            referencedRelation: "study_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedestrian_edges_target_fkey"
            columns: ["target"]
            isOneToOne: false
            referencedRelation: "pedestrian_nodes"
            referencedColumns: ["routing_id"]
          },
        ]
      }
      pedestrian_nodes: {
        Row: {
          code: string
          created_at: string
          data_version: string
          environment: string
          geometry: unknown
          id: string
          metadata: Json
          routing_id: number
          source_id: string
          source_record_id: string | null
          study_area_id: string
          updated_at: string
          validated_at: string | null
          validation_status: string
        }
        Insert: {
          code: string
          created_at?: string
          data_version?: string
          environment?: string
          geometry: unknown
          id?: string
          metadata?: Json
          routing_id?: number
          source_id: string
          source_record_id?: string | null
          study_area_id: string
          updated_at?: string
          validated_at?: string | null
          validation_status?: string
        }
        Update: {
          code?: string
          created_at?: string
          data_version?: string
          environment?: string
          geometry?: unknown
          id?: string
          metadata?: Json
          routing_id?: number
          source_id?: string
          source_record_id?: string | null
          study_area_id?: string
          updated_at?: string
          validated_at?: string | null
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedestrian_nodes_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "spatial_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedestrian_nodes_study_area_id_fkey"
            columns: ["study_area_id"]
            isOneToOne: false
            referencedRelation: "study_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      pois: {
        Row: {
          category: string
          code: string
          created_at: string
          data_version: string
          environment: string
          geometry: unknown
          id: string
          metadata: Json
          name: string
          source_id: string
          source_record_id: string | null
          study_area_id: string
          updated_at: string
          validated_at: string | null
          validation_status: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          data_version?: string
          environment?: string
          geometry: unknown
          id?: string
          metadata?: Json
          name: string
          source_id: string
          source_record_id?: string | null
          study_area_id: string
          updated_at?: string
          validated_at?: string | null
          validation_status?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          data_version?: string
          environment?: string
          geometry?: unknown
          id?: string
          metadata?: Json
          name?: string
          source_id?: string
          source_record_id?: string | null
          study_area_id?: string
          updated_at?: string
          validated_at?: string | null
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pois_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "spatial_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pois_study_area_id_fkey"
            columns: ["study_area_id"]
            isOneToOne: false
            referencedRelation: "study_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_role: Database["public"]["Enums"]["account_role"]
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          onboarding_complete: boolean
          phone_number: string | null
          trust_score: number
          updated_at: string
          username: string | null
        }
        Insert: {
          account_role?: Database["public"]["Enums"]["account_role"]
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          onboarding_complete?: boolean
          phone_number?: string | null
          trust_score?: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          account_role?: Database["public"]["Enums"]["account_role"]
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          onboarding_complete?: boolean
          phone_number?: string | null
          trust_score?: number
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      quality_check_results: {
        Row: {
          affected_records: number | null
          category: string
          check_code: string
          created_at: string
          details: Json | null
          id: string
          is_critical: boolean
          message: string
          quality_run_id: string
          status: string
          total_records: number | null
        }
        Insert: {
          affected_records?: number | null
          category: string
          check_code: string
          created_at?: string
          details?: Json | null
          id?: string
          is_critical?: boolean
          message: string
          quality_run_id: string
          status: string
          total_records?: number | null
        }
        Update: {
          affected_records?: number | null
          category?: string
          check_code?: string
          created_at?: string
          details?: Json | null
          id?: string
          is_critical?: boolean
          message?: string
          quality_run_id?: string
          status?: string
          total_records?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_check_results_quality_run_id_fkey"
            columns: ["quality_run_id"]
            isOneToOne: false
            referencedRelation: "quality_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_runs: {
        Row: {
          critical_failures: number
          dataset_version_id: string
          environment: Database["public"]["Enums"]["data_environment"]
          failed_checks: number
          finished_at: string | null
          id: string
          passed_checks: number
          started_at: string
          status: Database["public"]["Enums"]["quality_run_status"]
          total_checks: number
          warning_checks: number
        }
        Insert: {
          critical_failures?: number
          dataset_version_id: string
          environment: Database["public"]["Enums"]["data_environment"]
          failed_checks?: number
          finished_at?: string | null
          id?: string
          passed_checks?: number
          started_at?: string
          status?: Database["public"]["Enums"]["quality_run_status"]
          total_checks?: number
          warning_checks?: number
        }
        Update: {
          critical_failures?: number
          dataset_version_id?: string
          environment?: Database["public"]["Enums"]["data_environment"]
          failed_checks?: number
          finished_at?: string | null
          id?: string
          passed_checks?: number
          started_at?: string
          status?: Database["public"]["Enums"]["quality_run_status"]
          total_checks?: number
          warning_checks?: number
        }
        Relationships: [
          {
            foreignKeyName: "quality_runs_dataset_version_id_fkey"
            columns: ["dataset_version_id"]
            isOneToOne: false
            referencedRelation: "dataset_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_mapid_evidence: {
        Row: {
          activity_type: string
          created_at: string
          external_record_id: string
          id: string
          import_job_id: string | null
          provider_timestamp: string | null
          raw_payload: Json
          retrieved_at: string
          updated_at: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          external_record_id: string
          id?: string
          import_job_id?: string | null
          provider_timestamp?: string | null
          raw_payload: Json
          retrieved_at?: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          external_record_id?: string
          id?: string
          import_job_id?: string | null
          provider_timestamp?: string | null
          raw_payload?: Json
          retrieved_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_mapid_evidence_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_sources: {
        Row: {
          access_scope: string | null
          attribution_text: string | null
          created_at: string
          description: string | null
          freshness_policy_days: number | null
          id: string
          is_active: boolean
          is_public: boolean
          metadata: Json
          provider: string | null
          redistribution_allowed: boolean
          source_code: string | null
          source_name: string
          source_type: string
          source_url: string | null
          terms_confirmed: boolean
          terms_url: string | null
          updated_at: string
        }
        Insert: {
          access_scope?: string | null
          attribution_text?: string | null
          created_at?: string
          description?: string | null
          freshness_policy_days?: number | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          metadata?: Json
          provider?: string | null
          redistribution_allowed?: boolean
          source_code?: string | null
          source_name: string
          source_type: string
          source_url?: string | null
          terms_confirmed?: boolean
          terms_url?: string | null
          updated_at?: string
        }
        Update: {
          access_scope?: string | null
          attribution_text?: string | null
          created_at?: string
          description?: string | null
          freshness_policy_days?: number | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          metadata?: Json
          provider?: string | null
          redistribution_allowed?: boolean
          source_code?: string | null
          source_name?: string
          source_type?: string
          source_url?: string | null
          terms_confirmed?: boolean
          terms_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      staging_mapid_activities: {
        Row: {
          created_at: string
          id: string
          normalized_geometry: unknown
          normalized_metadata: Json
          raw_evidence_id: string
          updated_at: string
          validation_status: string
        }
        Insert: {
          created_at?: string
          id?: string
          normalized_geometry?: unknown
          normalized_metadata?: Json
          raw_evidence_id: string
          updated_at?: string
          validation_status?: string
        }
        Update: {
          created_at?: string
          id?: string
          normalized_geometry?: unknown
          normalized_metadata?: Json
          raw_evidence_id?: string
          updated_at?: string
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "staging_mapid_activities_raw_evidence_id_fkey"
            columns: ["raw_evidence_id"]
            isOneToOne: true
            referencedRelation: "raw_mapid_evidence"
            referencedColumns: ["id"]
          },
        ]
      }
      study_areas: {
        Row: {
          created_at: string
          data_version: string
          description: string | null
          environment: string
          geometry: unknown
          id: string
          is_public: boolean
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
          environment?: string
          geometry: unknown
          id?: string
          is_public?: boolean
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
          environment?: string
          geometry?: unknown
          id?: string
          is_public?: boolean
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
      survey_media: {
        Row: {
          created_at: string
          external_url: string | null
          id: string
          media_type: string
          metadata: Json
          privacy_status: Database["public"]["Enums"]["privacy_status"]
          storage_path: string | null
          submission_id: string
        }
        Insert: {
          created_at?: string
          external_url?: string | null
          id?: string
          media_type: string
          metadata?: Json
          privacy_status?: Database["public"]["Enums"]["privacy_status"]
          storage_path?: string | null
          submission_id: string
        }
        Update: {
          created_at?: string
          external_url?: string | null
          id?: string
          media_type?: string
          metadata?: Json
          privacy_status?: Database["public"]["Enums"]["privacy_status"]
          storage_path?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_media_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "survey_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          created_at: string
          id: string
          options: Json | null
          question_code: string
          question_type: string
          required: boolean
          sequence: number
          survey_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          options?: Json | null
          question_code: string
          question_type: string
          required?: boolean
          sequence?: number
          survey_id: string
        }
        Update: {
          created_at?: string
          id?: string
          options?: Json | null
          question_code?: string
          question_type?: string
          required?: boolean
          sequence?: number
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          answers: Json
          created_at: string
          destination_geometry: unknown
          environment: string
          id: string
          origin_geometry: unknown
          response_code: string
          source_id: string | null
          study_area_id: string | null
          submitted_at: string
          survey_id: string
          validation_status: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          destination_geometry?: unknown
          environment?: string
          id?: string
          origin_geometry?: unknown
          response_code: string
          source_id?: string | null
          study_area_id?: string | null
          submitted_at?: string
          survey_id: string
          validation_status?: string
        }
        Update: {
          answers?: Json
          created_at?: string
          destination_geometry?: unknown
          environment?: string
          id?: string
          origin_geometry?: unknown
          response_code?: string
          source_id?: string | null
          study_area_id?: string | null
          submitted_at?: string
          survey_id?: string
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "spatial_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_study_area_id_fkey"
            columns: ["study_area_id"]
            isOneToOne: false
            referencedRelation: "study_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_submissions: {
        Row: {
          attributes: Json
          contributor_id: string
          geometry: unknown
          id: string
          notes: string | null
          observed_at: string | null
          privacy_status: Database["public"]["Enums"]["privacy_status"]
          source_id: string | null
          source_record_id: string | null
          study_area_id: string | null
          submitted_at: string
          survey_type: string
          title: string | null
          updated_at: string
          validation_status: Database["public"]["Enums"]["validation_status"]
        }
        Insert: {
          attributes?: Json
          contributor_id: string
          geometry: unknown
          id?: string
          notes?: string | null
          observed_at?: string | null
          privacy_status?: Database["public"]["Enums"]["privacy_status"]
          source_id?: string | null
          source_record_id?: string | null
          study_area_id?: string | null
          submitted_at?: string
          survey_type: string
          title?: string | null
          updated_at?: string
          validation_status?: Database["public"]["Enums"]["validation_status"]
        }
        Update: {
          attributes?: Json
          contributor_id?: string
          geometry?: unknown
          id?: string
          notes?: string | null
          observed_at?: string | null
          privacy_status?: Database["public"]["Enums"]["privacy_status"]
          source_id?: string | null
          source_record_id?: string | null
          study_area_id?: string | null
          submitted_at?: string
          survey_type?: string
          title?: string | null
          updated_at?: string
          validation_status?: Database["public"]["Enums"]["validation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "survey_submissions_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_submissions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "spatial_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_submissions_study_area_id_fkey"
            columns: ["study_area_id"]
            isOneToOne: false
            referencedRelation: "study_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          code: string
          created_at: string
          environment: string
          id: string
          name: string
          source_id: string | null
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          code: string
          created_at?: string
          environment?: string
          id?: string
          name: string
          source_id?: string | null
          status?: string
          updated_at?: string
          version: string
        }
        Update: {
          code?: string
          created_at?: string
          environment?: string
          id?: string
          name?: string
          source_id?: string | null
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "surveys_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "spatial_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_access_links: {
        Row: {
          created_at: string
          distance_meters: number
          environment: string
          id: string
          pedestrian_node_id: string
          transport_node_id: string
        }
        Insert: {
          created_at?: string
          distance_meters: number
          environment?: string
          id?: string
          pedestrian_node_id: string
          transport_node_id: string
        }
        Update: {
          created_at?: string
          distance_meters?: number
          environment?: string
          id?: string
          pedestrian_node_id?: string
          transport_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_access_links_pedestrian_node_id_fkey"
            columns: ["pedestrian_node_id"]
            isOneToOne: false
            referencedRelation: "pedestrian_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_access_links_transport_node_id_fkey"
            columns: ["transport_node_id"]
            isOneToOne: false
            referencedRelation: "transport_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_corridors: {
        Row: {
          created_at: string
          data_version: string
          description: string | null
          environment: string
          geometry: unknown
          id: string
          is_public: boolean
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
          environment?: string
          geometry: unknown
          id?: string
          is_public?: boolean
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
          environment?: string
          geometry?: unknown
          id?: string
          is_public?: boolean
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
          environment: string
          geometry: unknown
          id: string
          is_public: boolean
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
          environment?: string
          geometry: unknown
          id?: string
          is_public?: boolean
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
          environment?: string
          geometry?: unknown
          id?: string
          is_public?: boolean
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
      transport_route_stops: {
        Row: {
          corridor_id: string
          created_at: string
          id: string
          node_id: string
          stop_sequence: number
          updated_at: string
        }
        Insert: {
          corridor_id: string
          created_at?: string
          id?: string
          node_id: string
          stop_sequence: number
          updated_at?: string
        }
        Update: {
          corridor_id?: string
          created_at?: string
          id?: string
          node_id?: string
          stop_sequence?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_route_stops_corridor_id_fkey"
            columns: ["corridor_id"]
            isOneToOne: false
            referencedRelation: "transport_corridors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_route_stops_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "transport_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      umkm: {
        Row: {
          category: string
          code: string
          created_at: string
          data_version: string
          description: string | null
          environment: string
          geometry: unknown
          id: string
          metadata: Json
          name: string
          source_id: string
          source_record_id: string | null
          study_area_id: string
          updated_at: string
          validated_at: string | null
          validation_status: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          data_version?: string
          description?: string | null
          environment?: string
          geometry: unknown
          id?: string
          metadata?: Json
          name: string
          source_id: string
          source_record_id?: string | null
          study_area_id: string
          updated_at?: string
          validated_at?: string | null
          validation_status?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          data_version?: string
          description?: string | null
          environment?: string
          geometry?: unknown
          id?: string
          metadata?: Json
          name?: string
          source_id?: string
          source_record_id?: string | null
          study_area_id?: string
          updated_at?: string
          validated_at?: string | null
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "umkm_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "spatial_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "umkm_study_area_id_fkey"
            columns: ["study_area_id"]
            isOneToOne: false
            referencedRelation: "study_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      umkm_profiles: {
        Row: {
          address: string | null
          business_name: string
          category: string
          category_id: string | null
          created_at: string
          data_version: string
          description: string | null
          geometry: unknown
          id: string
          merchant_id: string | null
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
          category_id?: string | null
          created_at?: string
          data_version?: string
          description?: string | null
          geometry: unknown
          id?: string
          merchant_id?: string | null
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
          category_id?: string | null
          created_at?: string
          data_version?: string
          description?: string | null
          geometry?: unknown
          id?: string
          merchant_id?: string | null
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
            foreignKeyName: "umkm_profiles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "umkm_profiles_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
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
      umkm_request_responses: {
        Row: {
          created_at: string
          id: string
          merchant_id: string
          message: string | null
          responder_user_id: string
          signal_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id: string
          message?: string | null
          responder_user_id: string
          signal_id: string
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string
          message?: string | null
          responder_user_id?: string
          signal_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "umkm_request_responses_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "umkm_request_responses_responder_user_id_fkey"
            columns: ["responder_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "umkm_request_responses_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "commuter_request_clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          default_stakeholder_mode:
            | Database["public"]["Enums"]["stakeholder_mode"]
            | null
          ui_preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_stakeholder_mode?:
            | Database["public"]["Enums"]["stakeholder_mode"]
            | null
          ui_preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_stakeholder_mode?:
            | Database["public"]["Enums"]["stakeholder_mode"]
            | null
          ui_preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stakeholder_modes: {
        Row: {
          created_at: string
          mode: Database["public"]["Enums"]["stakeholder_mode"]
          user_id: string
        }
        Insert: {
          created_at?: string
          mode: Database["public"]["Enums"]["stakeholder_mode"]
          user_id: string
        }
        Update: {
          created_at?: string
          mode?: Database["public"]["Enums"]["stakeholder_mode"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stakeholder_modes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _pgr_articulationpoints: {
        Args: { edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_astar:
        | {
            Args: {
              combinations_sql: string
              directed?: boolean
              edges_sql: string
              epsilon?: number
              factor?: number
              heuristic?: number
              only_cost?: boolean
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              directed?: boolean
              edges_sql: string
              end_vids: unknown
              epsilon?: number
              factor?: number
              heuristic?: number
              normal?: boolean
              only_cost?: boolean
              start_vids: unknown
            }
            Returns: Record<string, unknown>[]
          }
      _pgr_bellmanford:
        | {
            Args: {
              combinations_sql: string
              directed: boolean
              edges_sql: string
              only_cost: boolean
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              directed: boolean
              edges_sql: string
              from_vids: unknown
              only_cost: boolean
              to_vids: unknown
            }
            Returns: Record<string, unknown>[]
          }
      _pgr_biconnectedcomponents: {
        Args: { edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_binarybreadthfirstsearch:
        | {
            Args: {
              combinations_sql: string
              directed?: boolean
              edges_sql: string
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              directed?: boolean
              edges_sql: string
              from_vids: unknown
              to_vids: unknown
            }
            Returns: Record<string, unknown>[]
          }
      _pgr_bipartite: {
        Args: { edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_boost_version: { Args: never; Returns: string }
      _pgr_breadthfirstsearch: {
        Args: {
          directed: boolean
          edges_sql: string
          from_vids: unknown
          max_depth: number
        }
        Returns: Record<string, unknown>[]
      }
      _pgr_bridges: {
        Args: { edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_build_type: { Args: never; Returns: string }
      _pgr_checkquery: { Args: { "": string }; Returns: string }
      _pgr_checkverttab: {
        Args: {
          columnsarr: string[]
          fnname?: string
          reporterrs?: number
          vertname: string
        }
        Returns: Record<string, unknown>
      }
      _pgr_chinesepostman: {
        Args: { edges_sql: string; only_cost: boolean }
        Returns: Record<string, unknown>[]
      }
      _pgr_compilation_date: { Args: never; Returns: string }
      _pgr_compiler_version: { Args: never; Returns: string }
      _pgr_connectedcomponents: {
        Args: { edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_contraction: {
        Args: {
          contraction_order: number[]
          directed?: boolean
          edges_sql: string
          forbidden_vertices?: number[]
          max_cycles?: number
        }
        Returns: Record<string, unknown>[]
      }
      _pgr_createindex:
        | {
            Args: {
              colname: string
              fnname?: string
              indext: string
              reporterrs?: number
              sname: string
              tname: string
            }
            Returns: undefined
          }
        | {
            Args: {
              colname: string
              fnname?: string
              indext: string
              reporterrs?: number
              tabname: string
            }
            Returns: undefined
          }
      _pgr_cuthillmckeeordering: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      _pgr_depthfirstsearch: {
        Args: {
          directed: boolean
          edges_sql: string
          max_depth: number
          root_vids: unknown
        }
        Returns: Record<string, unknown>[]
      }
      _pgr_dijkstra:
        | {
            Args: {
              combinations_sql: string
              directed?: boolean
              edges_sql: string
              normal?: boolean
              only_cost?: boolean
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              combinations_sql: string
              directed: boolean
              edges_sql: string
              global: boolean
              n_goals: number
              only_cost: boolean
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              directed?: boolean
              edges_sql: string
              end_vids: unknown
              n_goals?: number
              normal?: boolean
              only_cost?: boolean
              start_vids: unknown
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              directed: boolean
              edges_sql: string
              end_vids: unknown
              global: boolean
              n_goals: number
              normal: boolean
              only_cost: boolean
              start_vids: unknown
            }
            Returns: Record<string, unknown>[]
          }
      _pgr_dijkstravia: {
        Args: {
          directed: boolean
          edges_sql: string
          strict: boolean
          u_turn_on_edge: boolean
          via_vids: unknown
        }
        Returns: Record<string, unknown>[]
      }
      _pgr_drivingdistance: {
        Args: {
          directed?: boolean
          distance: number
          edges_sql: string
          equicost?: boolean
          start_vids: unknown
        }
        Returns: Record<string, unknown>[]
      }
      _pgr_edgecoloring: {
        Args: { edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_edwardmoore:
        | {
            Args: {
              combinations_sql: string
              directed?: boolean
              edges_sql: string
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              directed?: boolean
              edges_sql: string
              from_vids: unknown
              to_vids: unknown
            }
            Returns: Record<string, unknown>[]
          }
      _pgr_endpoint: { Args: { g: unknown }; Returns: unknown }
      _pgr_floydwarshall: {
        Args: { directed: boolean; edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_get_statement: { Args: { o_sql: string }; Returns: string }
      _pgr_getcolumnname:
        | {
            Args: {
              col: string
              fnname?: string
              reporterrs?: number
              sname: string
              tname: string
            }
            Returns: string
          }
        | {
            Args: {
              col: string
              fnname?: string
              reporterrs?: number
              tab: string
            }
            Returns: string
          }
      _pgr_getcolumntype:
        | {
            Args: {
              cname: string
              fnname?: string
              reporterrs?: number
              sname: string
              tname: string
            }
            Returns: string
          }
        | {
            Args: {
              col: string
              fnname?: string
              reporterrs?: number
              tab: string
            }
            Returns: string
          }
      _pgr_gettablename: {
        Args: { fnname?: string; reporterrs?: number; tab: string }
        Returns: Record<string, unknown>
      }
      _pgr_git_hash: { Args: never; Returns: string }
      _pgr_hawickcircuits: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      _pgr_iscolumnindexed:
        | {
            Args: {
              cname: string
              fnname?: string
              reporterrs?: number
              sname: string
              tname: string
            }
            Returns: boolean
          }
        | {
            Args: {
              col: string
              fnname?: string
              reporterrs?: number
              tab: string
            }
            Returns: boolean
          }
      _pgr_iscolumnintable: {
        Args: { col: string; tab: string }
        Returns: boolean
      }
      _pgr_isplanar: { Args: { "": string }; Returns: boolean }
      _pgr_johnson: {
        Args: { directed: boolean; edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_ksp: {
        Args: {
          directed: boolean
          edges_sql: string
          end_vid: number
          heap_paths: boolean
          k: number
          start_vid: number
        }
        Returns: Record<string, unknown>[]
      }
      _pgr_lengauertarjandominatortree: {
        Args: { edges_sql: string; root_vid: number }
        Returns: Record<string, unknown>[]
      }
      _pgr_lib_version: { Args: never; Returns: string }
      _pgr_linegraphfull: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      _pgr_makeconnected: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      _pgr_maxcardinalitymatch: {
        Args: { directed: boolean; edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_maxflow:
        | {
            Args: {
              algorithm?: number
              combinations_sql: string
              edges_sql: string
              only_flow?: boolean
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              algorithm?: number
              edges_sql: string
              only_flow?: boolean
              sources: unknown
              targets: unknown
            }
            Returns: Record<string, unknown>[]
          }
      _pgr_maxflowmincost:
        | {
            Args: {
              combinations_sql: string
              edges_sql: string
              only_cost?: boolean
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              edges_sql: string
              only_cost?: boolean
              sources: unknown
              targets: unknown
            }
            Returns: Record<string, unknown>[]
          }
      _pgr_msg: {
        Args: { fnname: string; msg?: string; msgkind: number }
        Returns: undefined
      }
      _pgr_onerror: {
        Args: {
          errcond: boolean
          fnname: string
          hinto?: string
          msgerr: string
          msgok?: string
          reporterrs: number
        }
        Returns: undefined
      }
      _pgr_operating_system: { Args: never; Returns: string }
      _pgr_parameter_check: {
        Args: { big?: boolean; fn: string; sql: string }
        Returns: boolean
      }
      _pgr_pgsql_version: { Args: never; Returns: string }
      _pgr_pointtoid: {
        Args: {
          point: unknown
          srid: number
          tolerance: number
          vertname: string
        }
        Returns: number
      }
      _pgr_quote_ident: { Args: { idname: string }; Returns: string }
      _pgr_sequentialvertexcoloring: {
        Args: { edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_startpoint: { Args: { g: unknown }; Returns: unknown }
      _pgr_stoerwagner: {
        Args: { edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_strongcomponents: {
        Args: { edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_topologicalsort: {
        Args: { edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_transitiveclosure: {
        Args: { edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_trsp: {
        Args: {
          directed: boolean
          has_reverse_cost: boolean
          source_eid: number
          source_pos: number
          sql: string
          target_eid: number
          target_pos: number
          turn_restrict_sql?: string
        }
        Returns: Record<string, unknown>[]
      }
      _pgr_trspviavertices: {
        Args: {
          directed: boolean
          has_rcost: boolean
          sql: string
          turn_restrict_sql?: string
          vids: number[]
        }
        Returns: Record<string, unknown>[]
      }
      _pgr_tsp: {
        Args: {
          cooling_factor?: number
          end_id?: number
          final_temperature?: number
          initial_temperature?: number
          matrix_row_sql: string
          max_changes_per_temperature?: number
          max_consecutive_non_changes?: number
          max_processing_time?: number
          randomize?: boolean
          start_id?: number
          tries_per_temperature?: number
        }
        Returns: Record<string, unknown>[]
      }
      _pgr_tspeuclidean: {
        Args: {
          cooling_factor?: number
          coordinates_sql: string
          end_id?: number
          final_temperature?: number
          initial_temperature?: number
          max_changes_per_temperature?: number
          max_consecutive_non_changes?: number
          max_processing_time?: number
          randomize?: boolean
          start_id?: number
          tries_per_temperature?: number
        }
        Returns: Record<string, unknown>[]
      }
      _pgr_versionless: { Args: { v1: string; v2: string }; Returns: boolean }
      _pgr_withpoints:
        | {
            Args: {
              combinations_sql: string
              details: boolean
              directed: boolean
              driving_side: string
              edges_sql: string
              only_cost?: boolean
              points_sql: string
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              details: boolean
              directed: boolean
              driving_side: string
              edges_sql: string
              end_pids: unknown
              normal?: boolean
              only_cost?: boolean
              points_sql: string
              start_pids: unknown
            }
            Returns: Record<string, unknown>[]
          }
      _pgr_withpointsdd: {
        Args: {
          details?: boolean
          directed?: boolean
          distance: number
          driving_side?: string
          edges_sql: string
          equicost?: boolean
          points_sql: string
          start_pid: unknown
        }
        Returns: Record<string, unknown>[]
      }
      _pgr_withpointsksp: {
        Args: {
          details: boolean
          directed: boolean
          driving_side: string
          edges_sql: string
          end_pid: number
          heap_paths: boolean
          k: number
          points_sql: string
          start_pid: number
        }
        Returns: Record<string, unknown>[]
      }
      _pgr_withpointsvia: {
        Args: {
          directed?: boolean
          fraction: number[]
          sql: string
          via_edges: number[]
        }
        Returns: Record<string, unknown>[]
      }
      add_community_reaction_v1: {
        Args: { p_post_id: string; p_reaction_type: string }
        Returns: {
          confirmed_count: number
          helpful_count: number
          interesting_count: number
          viewer_reactions: string[]
        }[]
      }
      approve_merchant_claim: {
        Args: { claim_id: string; review_note?: string }
        Returns: string
      }
      calculate_walking_route: {
        Args: {
          p_destination_id: number
          p_environment?: string
          p_origin_id: number
        }
        Returns: Json
      }
      community_reaction_summary: {
        Args: { p_post_id: string }
        Returns: {
          confirmed_count: number
          helpful_count: number
          interesting_count: number
          viewer_reactions: string[]
        }[]
      }
      complete_onboarding: {
        Args: { selected_modes: string[] }
        Returns: undefined
      }
      create_community_comment_v1: {
        Args: {
          p_content: string
          p_parent_comment_id?: string
          p_post_id: string
        }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          content: string
          created_at: string
          depth: number
          id: string
          parent_comment_id: string
          post_id: string
          total_root_count: number
          updated_at: string
        }[]
      }
      create_community_post: {
        Args: {
          p_content: string
          p_latitude?: number
          p_location_accuracy_m?: number
          p_location_visibility?: string
          p_longitude?: number
        }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          content: string
          created_at: string
          id: string
          location_latitude: number
          location_longitude: number
          location_visibility: string
          updated_at: string
        }[]
      }
      create_community_post_v4: {
        Args: {
          p_category?: string
          p_content: string
          p_latitude?: number
          p_location_accuracy_m?: number
          p_location_visibility?: string
          p_longitude?: number
          p_media_height?: number
          p_media_id?: string
          p_media_mime_type?: string
          p_media_size_bytes?: number
          p_media_storage_path?: string
          p_media_width?: number
          p_post_id: string
          p_post_type?: string
        }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          category: string
          confirmed_count: number
          content: string
          created_at: string
          helpful_count: number
          id: string
          interesting_count: number
          location_latitude: number
          location_longitude: number
          location_visibility: string
          media_height: number
          media_id: string
          media_mime_type: string
          media_size_bytes: number
          media_storage_path: string
          media_width: number
          post_type: string
          reply_count: number
          total_count: number
          updated_at: string
          viewer_reactions: string[]
        }[]
      }
      create_community_post_with_media: {
        Args: {
          p_content: string
          p_latitude?: number
          p_location_accuracy_m?: number
          p_location_visibility?: string
          p_longitude?: number
          p_media_height?: number
          p_media_id?: string
          p_media_mime_type?: string
          p_media_size_bytes?: number
          p_media_storage_path?: string
          p_media_width?: number
          p_post_id: string
        }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          content: string
          created_at: string
          id: string
          location_latitude: number
          location_longitude: number
          location_visibility: string
          media_height: number
          media_id: string
          media_mime_type: string
          media_size_bytes: number
          media_storage_path: string
          media_width: number
          updated_at: string
        }[]
      }
      create_commuter_request_v1: {
        Args: {
          p_category: string
          p_description: string
          p_expires_in_days?: number
          p_latitude: number
          p_location_accuracy_m?: number
          p_location_visibility?: string
          p_longitude: number
          p_max_budget: number
          p_radius_meters?: number
          p_request_id: string
          p_title: string
        }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          category: string
          created_at: string
          description: string
          distance_meters: number
          expires_at: string
          id: string
          location_latitude: number
          location_longitude: number
          location_visibility: string
          max_budget: number
          radius_meters: number
          status: string
          title: string
          total_count: number
          updated_at: string
        }[]
      }
      find_merchants_near: {
        Args: { origin: unknown; radius_meters: number }
        Returns: {
          address: string | null
          created_at: string
          created_by: string | null
          data_quality_score: number | null
          description: string | null
          id: string
          is_mobile: boolean
          location: unknown
          metadata: Json
          name: string
          opening_hours: Json
          owner_id: string | null
          price_level: string | null
          primary_category_id: string | null
          publish_status: Database["public"]["Enums"]["publish_status"]
          slug: string | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["data_quality_status"]
        }[]
        SetofOptions: {
          from: "*"
          to: "merchants"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      find_merchants_within_bbox: {
        Args: {
          max_lat: number
          max_lng: number
          min_lat: number
          min_lng: number
        }
        Returns: {
          address: string | null
          created_at: string
          created_by: string | null
          data_quality_score: number | null
          description: string | null
          id: string
          is_mobile: boolean
          location: unknown
          metadata: Json
          name: string
          opening_hours: Json
          owner_id: string | null
          price_level: string | null
          primary_category_id: string | null
          publish_status: Database["public"]["Enums"]["publish_status"]
          slug: string | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["data_quality_status"]
        }[]
        SetofOptions: {
          from: "*"
          to: "merchants"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      find_nearest_pedestrian_node: {
        Args: {
          p_environment?: string
          p_lat: number
          p_lng: number
          p_radius_meters: number
        }
        Returns: {
          code: string
          distance_meters: number
          id: string
          routing_id: number
        }[]
      }
      find_pois_nearby: {
        Args: {
          p_category?: string
          p_environment?: string
          p_lat: number
          p_limit?: number
          p_lng: number
          p_radius_meters: number
        }
        Returns: {
          category: string
          code: string
          created_at: string
          data_version: string
          distance_meters: number
          environment: string
          geometry: unknown
          id: string
          metadata: Json
          name: string
          source_id: string
          source_record_id: string
          study_area_id: string
          updated_at: string
          validated_at: string
          validation_status: string
        }[]
      }
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
          environment: string
          geometry: unknown
          id: string
          is_public: boolean
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
          environment: string
          geometry: unknown
          id: string
          is_public: boolean
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
          environment: string
          geometry: unknown
          id: string
          is_public: boolean
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
          environment: string
          geometry: unknown
          id: string
          is_public: boolean
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
      find_umkm_nearby: {
        Args: {
          p_category?: string
          p_environment?: string
          p_lat: number
          p_limit?: number
          p_lng: number
          p_radius_meters: number
        }
        Returns: {
          category: string
          code: string
          created_at: string
          data_version: string
          description: string
          distance_meters: number
          environment: string
          geometry: unknown
          id: string
          metadata: Json
          name: string
          source_id: string
          source_record_id: string
          study_area_id: string
          updated_at: string
          validated_at: string
          validation_status: string
        }[]
      }
      find_umkm_profiles_near: {
        Args: { origin: unknown; radius_meters: number }
        Returns: {
          address: string | null
          business_name: string
          category: string
          category_id: string | null
          created_at: string
          data_version: string
          description: string | null
          geometry: unknown
          id: string
          merchant_id: string | null
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
          category_id: string | null
          created_at: string
          data_version: string
          description: string | null
          geometry: unknown
          id: string
          merchant_id: string | null
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
      generate_radius_buffer_geojson: {
        Args: { lat: number; lng: number; radius_m: number }
        Returns: Json
      }
      get_community_demand_signal_detail_v1: {
        Args: { p_signal_id: string }
        Returns: {
          budget_max: number
          budget_median: number
          budget_min: number
          category: string
          center_latitude: number
          center_longitude: number
          cluster_radius_meters: number
          id: string
          latest_activity_at: string
          request_count: number
          status: string
          total_count: number
          window_end: string
          window_start: string
        }[]
      }
      get_community_post_detail_v1: {
        Args: { p_post_id: string }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          confirmed_count: number
          content: string
          created_at: string
          helpful_count: number
          id: string
          interesting_count: number
          location_latitude: number
          location_longitude: number
          location_visibility: string
          media_height: number
          media_id: string
          media_mime_type: string
          media_size_bytes: number
          media_storage_path: string
          media_width: number
          reply_count: number
          total_count: number
          updated_at: string
          viewer_reactions: string[]
        }[]
      }
      get_community_post_detail_v2: {
        Args: { p_post_id: string }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          category: string
          confirmed_count: number
          content: string
          created_at: string
          helpful_count: number
          id: string
          interesting_count: number
          location_latitude: number
          location_longitude: number
          location_visibility: string
          media_height: number
          media_id: string
          media_mime_type: string
          media_size_bytes: number
          media_storage_path: string
          media_width: number
          post_type: string
          reply_count: number
          total_count: number
          updated_at: string
          viewer_reactions: string[]
        }[]
      }
      get_commuter_request_detail_v1: {
        Args: { p_request_id: string }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          category: string
          created_at: string
          description: string
          distance_meters: number
          expires_at: string
          id: string
          location_latitude: number
          location_longitude: number
          location_visibility: string
          max_budget: number
          radius_meters: number
          status: string
          title: string
          total_count: number
          updated_at: string
        }[]
      }
      get_merchant_network_access: {
        Args: { target_merchant_id: string }
        Returns: {
          environment: string
          pedestrian_node_id: string
          snap_distance_meters: number
        }[]
      }
      getra_database_health: { Args: never; Returns: string }
      is_valid_wgs84_geometry: {
        Args: { allowed_types: string[]; input_geometry: unknown }
        Returns: boolean
      }
      list_community_comments_v1: {
        Args: { p_limit?: number; p_offset?: number; p_post_id: string }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          content: string
          created_at: string
          depth: number
          id: string
          parent_comment_id: string
          post_id: string
          total_root_count: number
          updated_at: string
        }[]
      }
      list_community_cultural_map_v1: {
        Args: {
          p_categories?: string[]
          p_east: number
          p_limit?: number
          p_north: number
          p_south: number
          p_west: number
        }
        Returns: {
          author_display_name: string
          author_id: string
          category: string
          confirmed_count: number
          content: string
          created_at: string
          id: string
          location_latitude: number
          location_longitude: number
          location_visibility: string
          post_type: string
          reply_count: number
        }[]
      }
      list_community_demand_signal_responses_v1: {
        Args: { p_signal_id: string }
        Returns: {
          created_at: string
          id: string
          merchant_display_name: string
          merchant_id: string
          message: string
          signal_id: string
          status: string
          updated_at: string
        }[]
      }
      list_community_demand_signals_v1: {
        Args: { p_category?: string; p_limit?: number; p_offset?: number }
        Returns: {
          budget_max: number
          budget_median: number
          budget_min: number
          category: string
          center_latitude: number
          center_longitude: number
          cluster_radius_meters: number
          id: string
          latest_activity_at: string
          request_count: number
          status: string
          total_count: number
          window_end: string
          window_start: string
        }[]
      }
      list_community_feed: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          content: string
          created_at: string
          id: string
          location_latitude: number
          location_longitude: number
          location_visibility: string
          total_count: number
          updated_at: string
        }[]
      }
      list_community_feed_v2: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          content: string
          created_at: string
          id: string
          location_latitude: number
          location_longitude: number
          location_visibility: string
          media_height: number
          media_id: string
          media_mime_type: string
          media_size_bytes: number
          media_storage_path: string
          media_width: number
          total_count: number
          updated_at: string
        }[]
      }
      list_community_feed_v3: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          confirmed_count: number
          content: string
          created_at: string
          helpful_count: number
          id: string
          interesting_count: number
          location_latitude: number
          location_longitude: number
          location_visibility: string
          media_height: number
          media_id: string
          media_mime_type: string
          media_size_bytes: number
          media_storage_path: string
          media_width: number
          reply_count: number
          total_count: number
          updated_at: string
          viewer_reactions: string[]
        }[]
      }
      list_community_feed_v4: {
        Args: {
          p_category?: string
          p_limit?: number
          p_offset?: number
          p_post_type?: string
        }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          category: string
          confirmed_count: number
          content: string
          created_at: string
          helpful_count: number
          id: string
          interesting_count: number
          location_latitude: number
          location_longitude: number
          location_visibility: string
          media_height: number
          media_id: string
          media_mime_type: string
          media_size_bytes: number
          media_storage_path: string
          media_width: number
          post_type: string
          reply_count: number
          total_count: number
          updated_at: string
          viewer_reactions: string[]
        }[]
      }
      list_community_response_merchants_v1: {
        Args: never
        Returns: {
          display_name: string
          id: string
        }[]
      }
      list_commuter_requests_v1: {
        Args: {
          p_category?: string
          p_latitude?: number
          p_limit?: number
          p_longitude?: number
          p_offset?: number
          p_radius_meters?: number
        }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          category: string
          created_at: string
          description: string
          distance_meters: number
          expires_at: string
          id: string
          location_latitude: number
          location_longitude: number
          location_visibility: string
          max_budget: number
          radius_meters: number
          status: string
          title: string
          total_count: number
          updated_at: string
        }[]
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
      pgr_articulationpoints: { Args: { "": string }; Returns: number[] }
      pgr_biconnectedcomponents: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_bipartite: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_bridges: { Args: { "": string }; Returns: number[] }
      pgr_chinesepostman: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_chinesepostmancost: { Args: { "": string }; Returns: number }
      pgr_connectedcomponents: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_cuthillmckeeordering: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_edgecoloring: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_full_version: { Args: never; Returns: Record<string, unknown> }
      pgr_hawickcircuits: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_isplanar: { Args: { "": string }; Returns: boolean }
      pgr_kruskal: { Args: { "": string }; Returns: Record<string, unknown>[] }
      pgr_linegraphfull: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_makeconnected: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_maxcardinalitymatch: { Args: { "": string }; Returns: number[] }
      pgr_prim: { Args: { "": string }; Returns: Record<string, unknown>[] }
      pgr_sequentialvertexcoloring: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_stoerwagner: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_strongcomponents: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_topologicalsort: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_transitiveclosure: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_version: { Args: never; Returns: string }
      refresh_community_demand_signals_v1: { Args: never; Returns: undefined }
      reject_merchant_claim: {
        Args: { claim_id: string; review_note?: string }
        Returns: string
      }
      remove_community_reaction_v1: {
        Args: { p_post_id: string; p_reaction_type: string }
        Returns: {
          confirmed_count: number
          helpful_count: number
          interesting_count: number
          viewer_reactions: string[]
        }[]
      }
      search_merchants_nearby: {
        Args: {
          p_category_id?: string
          p_lat: number
          p_limit?: number
          p_lng: number
          p_radius_meters: number
        }
        Returns: {
          address: string
          category_name: string
          category_slug: string
          description: string
          distance_meters: number
          id: string
          is_mobile: boolean
          location: unknown
          name: string
          opening_hours: Json
          price_level: string
          primary_category_id: string
          slug: string
        }[]
      }
      search_merchants_within_bbox: {
        Args: {
          p_category_id?: string
          p_max_lat: number
          p_max_lng: number
          p_min_lat: number
          p_min_lng: number
        }
        Returns: {
          address: string
          category_name: string
          category_slug: string
          description: string
          id: string
          is_mobile: boolean
          location: unknown
          name: string
          opening_hours: Json
          price_level: string
          primary_category_id: string
          slug: string
        }[]
      }
      snap_transport_node_to_pedestrian_network: {
        Args: {
          p_environment?: string
          p_max_distance_meters?: number
          p_transport_node_id: string
        }
        Returns: Json
      }
      upsert_community_demand_signal_response_v1: {
        Args: {
          p_merchant_id: string
          p_message?: string
          p_signal_id: string
          p_status: string
        }
        Returns: {
          created_at: string
          id: string
          merchant_display_name: string
          merchant_id: string
          message: string
          signal_id: string
          status: string
          updated_at: string
        }[]
      }
      wgs84_distance_meters: {
        Args: { destination: unknown; origin: unknown }
        Returns: number
      }
    }
    Enums: {
      account_role: "USER" | "ADMIN"
      data_environment: "PRODUCTION" | "DUMMY" | "FIXTURE" | "TEST" | "DEV"
      data_quality_status:
        | "UNVERIFIED"
        | "SURVEYED"
        | "VERIFIED"
        | "STALE"
        | "REJECTED"
        | "SYNTHETIC"
      dataset_version_status:
        | "DRAFT"
        | "VALIDATING"
        | "READY"
        | "ACTIVE"
        | "ARCHIVED"
        | "VALIDATION_FAILED"
      import_job_status:
        | "PENDING"
        | "RUNNING"
        | "VALIDATING"
        | "COMPLETED"
        | "FAILED"
        | "PARTIAL"
        | "CANCELLED"
      merchant_claim_status: "PENDING" | "APPROVED" | "REJECTED"
      pipeline_run_status:
        | "PENDING"
        | "RUNNING"
        | "SUCCEEDED"
        | "PARTIAL"
        | "FAILED"
      privacy_status: "PUBLIC" | "INTERNAL" | "RESTRICTED" | "REDACTED"
      publish_status: "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED"
      quality_run_status: "RUNNING" | "PASS" | "WARN" | "FAIL"
      stakeholder_mode: "COMMUTER" | "UMKM" | "INVESTOR" | "GOVERNMENT"
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
  public: {
    Enums: {
      account_role: ["USER", "ADMIN"],
      data_environment: ["PRODUCTION", "DUMMY", "FIXTURE", "TEST", "DEV"],
      data_quality_status: [
        "UNVERIFIED",
        "SURVEYED",
        "VERIFIED",
        "STALE",
        "REJECTED",
        "SYNTHETIC",
      ],
      dataset_version_status: [
        "DRAFT",
        "VALIDATING",
        "READY",
        "ACTIVE",
        "ARCHIVED",
        "VALIDATION_FAILED",
      ],
      import_job_status: [
        "PENDING",
        "RUNNING",
        "VALIDATING",
        "COMPLETED",
        "FAILED",
        "PARTIAL",
        "CANCELLED",
      ],
      merchant_claim_status: ["PENDING", "APPROVED", "REJECTED"],
      pipeline_run_status: [
        "PENDING",
        "RUNNING",
        "SUCCEEDED",
        "PARTIAL",
        "FAILED",
      ],
      privacy_status: ["PUBLIC", "INTERNAL", "RESTRICTED", "REDACTED"],
      publish_status: ["DRAFT", "PUBLISHED", "HIDDEN", "ARCHIVED"],
      quality_run_status: ["RUNNING", "PASS", "WARN", "FAIL"],
      stakeholder_mode: ["COMMUTER", "UMKM", "INVESTOR", "GOVERNMENT"],
      validation_status: ["PENDING", "VALIDATED", "REJECTED", "ARCHIVED"],
    },
  },
} as const

