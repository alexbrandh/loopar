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
      postcards: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          image_url: string
          video_url: string
          nft_descriptors: Json | null
          processing_status: 'processing' | 'ready' | 'error' | 'needs_better_image'
          error_message: string | null
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          image_url: string
          video_url: string
          nft_descriptors?: Json | null
          processing_status?: 'processing' | 'ready' | 'error' | 'needs_better_image'
          error_message?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          image_url?: string
          video_url?: string
          nft_descriptors?: Json | null
          processing_status?: 'processing' | 'ready' | 'error' | 'needs_better_image'
          error_message?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      processing_status: 'processing' | 'ready' | 'error' | 'needs_better_image'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Postcard = Database['public']['Tables']['postcards']['Row']
export type PostcardInsert = Database['public']['Tables']['postcards']['Insert']
export type PostcardUpdate = Database['public']['Tables']['postcards']['Update']
export type ProcessingStatus = Database['public']['Enums']['processing_status']