import React, { useState } from 'react'
import { bindStudentByInviteCode, getDeviceId } from '../services/bindingService'
import { getLiffProfile } from '../services/liffService'
import { previewBind } from '../services/supabase'

interface Props {
  onBound: (studentName: string) => void
  onSkip: () => void
}

type Stage = 'enter_code' | 'confirm' | 'binding'

type PreviewInfo = {
  studentName: string
  nutritionistName: string
  startDate: string | null
  code: string
  lineUserId: string
}

export const BindingPage: React.FC<Props> = ({ onBound, onSkip }) => {
  const [stage, setStage] = useState<Stage>('enter_code')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<PreviewInfo | null>(null)

  const resolveLineUserId = async (): Promise<string> => {
    let id = getDeviceId()
    try {
      const profile = await getLiffProfile()
      if (profile?.userId) id = profile.userId
    } catch { /* ignore */ }
    return id
  }

  const handleLookup = async () => {
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length !== 8) {
      setError('請輸入 8 碼邀請碼')
      return
    }
    setLoading(true)
    setError('')

    const lineUserId = await resolveLineUserId()
    const result = await previewBind(trimmed, lineUserId)
    setLoading(false)

    if (!result.success) {
      setError(result.error ?? '邀請碼查詢失敗')
      return
    }
    setPreview({
      studentName: result.student_name ?? '',
      nutritionistName: result.nutritionist_name ?? '營養師',
      startDate: result.start_date ?? null,
      code: trimmed,
      lineUserId,
    })
    setStage('confirm')
  }

  const handleConfirmBind = async () => {
    if (!preview) return
    setStage('binding')
    setError('')
    const result = await bindStudentByInviteCode(preview.code, preview.lineUserId)
    if (result.success && result.studentName) {
      onBound(result.studentName)
    } else {
      setError(result.error ?? '綁定失敗，請重試')
      setStage('confirm')
    }
  }

  const handleBack = () => {
    setStage('enter_code')
    setPreview(null)
    setError('')
  }

  // ── 第 2 步：確認名字 ─────────────────────────────────
  if ((stage === 'confirm' || stage === 'binding') && preview) {
    const today = new Date().toISOString().slice(0, 10)
    const isTesting = preview.startDate && today < preview.startDate
    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center px-6 bg-white"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">
            <span style={{ color: '#d0502a' }}>Be</span>
            <span style={{ color: '#c05828' }}>Bet</span>
            <span style={{ color: '#efa93b' }}>ter</span>
          </h1>
          <p className="text-gray-400 text-xs mt-1">請確認是不是你</p>
        </div>

        <div className="w-full max-w-xs space-y-4">
          <div className="border border-orange-200 bg-orange-50 rounded-xl p-5 text-center">
            <p className="text-xs text-gray-500">你即將綁定</p>
            <p className="text-2xl font-bold text-gray-800 mt-2">👤 {preview.studentName}</p>
            <p className="text-sm text-gray-600 mt-2">🥗 {preview.nutritionistName}</p>
            {preview.startDate && (
              <p className="text-xs text-gray-500 mt-3 border-t border-orange-100 pt-2">
                {isTesting ? (
                  <>正式開課：{preview.startDate}<br/><span className="text-blue-600">開課前打卡屬測試期，不會計分</span></>
                ) : (
                  <>正式期已開始（開課日：{preview.startDate}）</>
                )}
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <button
            onClick={handleConfirmBind}
            disabled={stage === 'binding'}
            className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: '#d0502a' }}
          >
            {stage === 'binding' ? '綁定中...' : '✓ 確認是我，完成綁定'}
          </button>

          <button
            onClick={handleBack}
            disabled={stage === 'binding'}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            不是我，重新輸入邀請碼
          </button>
        </div>

        <p className="text-xs text-gray-300 mt-8 text-center max-w-xs">
          看到名字不對？請停下來，回去跟營養師確認一次邀請碼。
        </p>
      </div>
    )
  }

  // ── 第 1 步：輸入邀請碼 ─────────────────────────────────
  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-6 bg-white"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">
          <span style={{ color: '#d0502a' }}>Be</span>
          <span style={{ color: '#c05828' }}>Bet</span>
          <span style={{ color: '#efa93b' }}>ter</span>
        </h1>
        <p className="text-gray-400 text-sm mt-1">健康管理計畫</p>
      </div>

      <div className="w-full max-w-xs space-y-5">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-800">輸入邀請碼</p>
          <p className="text-sm text-gray-400 mt-1">
            請向你的營養師取得 8 碼邀請碼<br />
            下一步會顯示你的名字確認
          </p>
        </div>

        <input
          type="text"
          value={code}
          onChange={e => {
            setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))
            setError('')
          }}
          placeholder="例：A3X7K2QW"
          maxLength={8}
          className="w-full border-2 rounded-xl px-4 py-3 text-center text-xl font-mono font-bold tracking-[0.3em] outline-none focus:border-orange-400 transition-colors"
          style={{ borderColor: error ? '#ef4444' : code.length === 8 ? '#d0502a' : '#e5e7eb' }}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
        />

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        <button
          onClick={handleLookup}
          disabled={loading || code.length !== 8}
          className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50 transition-opacity"
          style={{ backgroundColor: '#d0502a' }}
        >
          {loading ? '查詢中...' : '查詢邀請碼'}
        </button>

        <button
          onClick={onSkip}
          className="w-full py-2 text-sm text-gray-400 hover:text-gray-600"
        >
          稍後再設定（僅本地儲存）
        </button>
      </div>

      <p className="text-xs text-gray-300 mt-10 text-center max-w-xs">
        邀請碼只能使用一次，綁定後你的記錄將自動同步至你的營養師
      </p>
    </div>
  )
}
