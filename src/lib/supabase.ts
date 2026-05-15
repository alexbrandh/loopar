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

const SUPABASE_FETCH_TIMEOUT = 15_000; // 15 seconds

function fetchWithTimeout(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUPABASE_FETCH_TIMEOUT);

  const mergedSignal = init?.signal
    ? init.signal
    : controller.signal;

  return globalThis.fetch(url, { ...init, signal: mergedSignal })
    .finally(() => clearTimeout(timeout));
}

// Client-side/browser factory
export function createBrowserClient() {
  const url = getSupabaseUrl();
  const key = getAnonKey();

  if (!url || !key) {
    console.error('❌ [SUPABASE] Missing env vars:', { hasUrl: !!url, hasKey: !!key });
    throw new Error('Missing Supabase configuration (URL or ANON_KEY)');
  }

  return createClient<Database>(url, key, {
    global: {
      fetch: fetchWithTimeout,
    },
  })
}

// Server-side factory (service role)
export function createServerClient() {
  const url = getSupabaseUrl();
  const key = getServiceRoleKey();

  if (!url || !key) {
    console.error('❌ [SUPABASE] Missing env vars:', { hasUrl: !!url, hasKey: !!key });
    throw new Error('Missing Supabase configuration (URL or SERVICE_ROLE_KEY)');
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: fetchWithTimeout,
    },
  })
}