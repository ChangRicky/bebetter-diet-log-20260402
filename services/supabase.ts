import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL ?? ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

// null when env vars are not set — app works offline via IndexedDB
export const supabase = url && key ? createClient(url, key) : null

export interface WeekScore {
  week_num: number
  total: number | null
  comment: string | null
  created_at: string
}

/** Fetch nutritionist week scores for the bound student (via security-definer RPC) */
export async function fetchMyWeekScores(lineUserId: string): Promise<WeekScore[]> {
  if (!supabase) return []
  const { data } = await supabase.rpc('get_my_week_scores', { p_line_user_id: lineUserId })
  return (data as WeekScore[]) ?? []
}
