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

export interface StudentProfile {
  name: string
  start_date: string | null   // YYYY-MM-DD
  total_weeks: number
}

/** Fetch bound student's basic profile (for 測試期/正式期 check). */
export async function fetchMyStudentProfile(lineUserId: string): Promise<StudentProfile | null> {
  if (!supabase) return null
  const { data } = await supabase.rpc('get_my_student_profile', { p_line_user_id: lineUserId })
  const rows = data as StudentProfile[] | null
  return rows && rows.length > 0 ? rows[0] : null
}

export interface PreviewResult {
  success: boolean
  student_name?: string
  nutritionist_name?: string
  start_date?: string
  error?: string
}

/** Readonly peek at who an invite code belongs to — shown to student for confirmation before bind. */
export async function previewBind(inviteCode: string, lineUserId: string): Promise<PreviewResult> {
  if (!supabase) return { success: false, error: 'Supabase 未設定' }
  const { data, error } = await supabase.rpc('preview_bind', {
    p_invite_code: inviteCode.trim().toUpperCase(),
    p_line_user_id: lineUserId,
  })
  if (error) return { success: false, error: error.message }
  return data as PreviewResult
}
