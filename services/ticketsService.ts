/**
 * Tickets service — 學生 LIFF 回報 / 查看自己的工單
 * 透過 security-definer RPC (create_ticket / get_my_tickets) 呼叫，不經 RLS。
 */
import { supabase } from './supabase'
import { getBoundLineUserId, getDeviceId } from './bindingService'

export type TicketCategory = 'bug' | 'feature' | 'account' | 'content' | 'other'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'wontfix'

export interface MyTicket {
  id: string
  title: string
  description: string
  status: TicketStatus
  category: TicketCategory | null
  created_at: string
  resolved_at: string | null
}

export const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: 'bug', label: '🐛 功能壞了 / Bug' },
  { value: 'feature', label: '✨ 希望有某功能' },
  { value: 'account', label: '🔑 帳號 / 綁定問題' },
  { value: 'content', label: '📝 內容 / 分數有疑問' },
  { value: 'other', label: '其他' },
]

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: '待處理',
  in_progress: '處理中',
  resolved: '已解決',
  wontfix: '不修',
}

export interface CreateTicketInput {
  title: string
  description: string
  category: TicketCategory | null
}

/**
 * 建立工單。成功回 { success: true, ticket_id }，失敗回 { success: false, error }。
 * 會自動帶入 userAgent + 當前 URL，給 staff 後台除錯用。
 */
export async function createTicket(
  input: CreateTicketInput,
): Promise<{ success: boolean; ticket_id?: string; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase 未設定' }

  const lineUserId = getBoundLineUserId() ?? getDeviceId()
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null
  const pageUrl = typeof window !== 'undefined' ? window.location.href : null

  const { data, error } = await supabase.rpc('create_ticket', {
    p_line_user_id: lineUserId,
    p_title: input.title.trim(),
    p_description: input.description.trim(),
    p_user_agent: userAgent,
    p_page_url: pageUrl,
    p_category: input.category,
  })

  if (error) return { success: false, error: error.message }
  return data as { success: boolean; ticket_id?: string; error?: string }
}

/** 查自己的工單歷史（最新在前）。未綁定或未設 Supabase → 回空陣列。 */
export async function fetchMyTickets(): Promise<MyTicket[]> {
  if (!supabase) return []
  const lineUserId = getBoundLineUserId()
  if (!lineUserId) return []

  const { data, error } = await supabase.rpc('get_my_tickets', {
    p_line_user_id: lineUserId,
  })
  if (error) return []
  return (data as MyTicket[]) ?? []
}
