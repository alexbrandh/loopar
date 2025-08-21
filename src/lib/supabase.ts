import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// NOTE
// Avoid top-level access to environment variables to prevent build-time failures on Vercel
// when env vars are not present during the build. We expose factory functions that read envs
// lazily at call time.

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}

function getAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
}

function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

// Client-side/browser factory
export function createBrowserClient() {
  return createClient<Database>(getSupabaseUrl(), getAnonKey())
}

// Server-side factory (service role)
export function createServerClient() {
  return createClient<Database>(getSupabaseUrl(), getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}