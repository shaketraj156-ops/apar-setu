import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client configured to route via same-origin (/supabase).
 *
 * Dev:   Vite dev server proxies /supabase/* → https://bxsiwlxjjgjnoxuxegah.supabase.co/*
 * Prod:  Vercel rewrites /supabase/*       → https://bxsiwlxjjgjnoxuxegah.supabase.co/*
 *
 * This completely avoids browser antivirus / ad-blockers (McAfee WebAdvisor, Brave Shields,
 * uBlock Origin) blocking calls to *.supabase.co, which causes "TypeError: Failed to fetch".
 */
const getSupabaseUrl = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/supabase`
  }
  return import.meta.env.VITE_SUPABASE_URL || 'https://bxsiwlxjjgjnoxuxegah.supabase.co'
}

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_OT2EF5bUxacRmQu1ACs2pw_2P78W1Y6'

export const supabase = createClient(getSupabaseUrl(), supabaseAnonKey, {
  auth: {
    storageKey: 'sb-bxsiwlxjjgjnoxuxegah-auth-token',
    persistSession: true,
    autoRefreshToken: true,
  },
})
