import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL ?? ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

// null when env vars are not set — app works offline via IndexedDB
export const supabase = url && key ? createClient(url, key) : null
