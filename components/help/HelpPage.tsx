/**
 * HelpPage — 學生求救 / 回報工單頁
 * 呼叫 create_ticket RPC 回報問題；呼叫 get_my_tickets 看自己回報過的歷史與狀態。
 */
import React, { useCallback, useEffect, useState } from 'react'
import { toast } from '../Toast'
import { isBound } from '../../services/bindingService'
import {
  createTicket,
  fetchMyTickets,
  CATEGORY_OPTIONS,
  STATUS_LABELS,
  type MyTicket,
  type TicketCategory,
} from '../../services/ticketsService'

const STATUS_COLOR: Record<MyTicket['status'], string> = {
  open: 'bg-amber-50 text-amber-700',
  in_progress: 'bg-blue-50 text-blue-700',
  resolved: 'bg-green-50 text-green-700',
  wontfix: 'bg-gray-100 text-gray-500',
}

export const HelpPage: React.FC = () => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TicketCategory | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [tickets, setTickets] = useState<MyTicket[]>([])
  const [loading, setLoading] = useState(true)

  const bound = isBound()

  const loadTickets = useCallback(async () => {
    setLoading(true)
    const list = await fetchMyTickets()
    setTickets(list)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  const reset = () => {
    setTitle('')
    setDescription('')
    setCategory('')
  }

  const handleSubmit = async () => {
    const t = title.trim()
    const d = description.trim()
    if (t.length < 1) {
      toast('請填標題', 'error')
      return
    }
    if (t.length > 200) {
      toast('標題不要超過 200 字', 'error')
      return
    }
    if (d.length > 5000) {
      toast('內容太長（上限 5000 字）', 'error')
      return
    }

    setSubmitting(true)
    const result = await createTicket({
      title: t,
      description: d,
      category: category || null,
    })
    setSubmitting(false)

    if (!result.success) {
      toast(result.error ?? '回報失敗，請稍後再試', 'error')
      return
    }
    toast('✅ 已送出，我們會儘快處理', 'success')
    reset()
    loadTickets()
  }

  return (
    <div className="max-w-lg mx-auto px-4 space-y-6">
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-1">有問題想反應？</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          寫下遇到的狀況，我們（不是 AI）會看到。
          {!bound && '（你還沒綁定學員帳號，送出後我們仍會收到，但會比較難追蹤是誰）'}
        </p>
      </section>

      {/* 回報表單 */}
      <section className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">類別（選填）</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value as TicketCategory | '')}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
          >
            <option value="">不指定</option>
            {CATEGORY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">
            標題 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={200}
            placeholder="例：打卡按送出一直轉圈"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">
            詳細說明
            <span className="ml-2 text-gray-400">{description.length}/5000</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={5000}
            rows={5}
            placeholder="什麼時候發生？怎麼操作的？出現什麼畫面？（越具體越好）"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || title.trim().length === 0}
          className="w-full text-sm font-semibold text-white py-2.5 rounded-lg disabled:opacity-50"
          style={{ backgroundColor: '#d0502a' }}
        >
          {submitting ? '送出中...' : '送出回報'}
        </button>
      </section>

      {/* 我的工單歷史 */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">我回報過的</h3>
        {loading ? (
          <div className="text-center text-gray-400 text-xs py-6 animate-pulse">載入中...</div>
        ) : !bound ? (
          <div className="text-center text-gray-400 text-xs py-6">綁定學員後才能查歷史紀錄</div>
        ) : tickets.length === 0 ? (
          <div className="text-center text-gray-400 text-xs py-6">還沒回報過任何問題</div>
        ) : (
          <div className="space-y-2">
            {tickets.map(t => (
              <div key={t.id} className="bg-white border border-gray-100 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium text-gray-800 flex-1 break-words">
                    {t.title}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[t.status]}`}>
                    {STATUS_LABELS[t.status]}
                  </span>
                </div>
                {t.description && (
                  <div className="text-xs text-gray-500 mt-1 whitespace-pre-wrap break-words line-clamp-3">
                    {t.description}
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-1.5">
                  {new Date(t.created_at).toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' })}
                  {t.resolved_at && (
                    <span className="ml-2">
                      · 解決於 {new Date(t.resolved_at).toLocaleDateString('zh-TW')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
