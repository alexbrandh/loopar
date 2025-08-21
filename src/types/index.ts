// Database Types
export interface Postcard {
  id: string
  user_id: string
  title: string
  description?: string
  target_image_url: string
  video_url: string
  nft_descriptor_url: string
  public_url: string
  status: 'processing' | 'ready' | 'error'
  created_at: string
  updated_at: string
}

// Upload Types
export interface UploadProgress {
  progress: number
  status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error'
  message?: string
}

// AR Types
export interface ARConfig {
  targetImageUrl: string
  videoUrl: string
  nftDescriptorUrl: string
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface PostcardCreateRequest {
  title: string
  description?: string
  targetImage: File
  video: File
}

export interface PostcardResponse {
  postcard: Postcard
  publicUrl: string
}