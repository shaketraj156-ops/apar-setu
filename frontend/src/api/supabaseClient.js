import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://bxsiwlxjjgjnoxuxegah.supabase.co'
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_OT2EF5bUxacRmQu1ACs2pw_2P78W1Y6'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
