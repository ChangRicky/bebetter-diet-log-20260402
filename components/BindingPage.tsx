import React, { useState } from 'react'
import { bindStudentByInviteCode, getDeviceId } from '../services/bindingService'
import { getLiffProfile } from '../services/liffService'

interface Props {
  onBound: (studentName: string) => void
  onSkip: () => void
}

export const BindingPage: React.FC<Props> = ({ onBound, onSkip }) => {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleBind = async () => {
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length !== 8) {
      setError('請輸入 8 碼邀請碼')
      return
    }

    setLoading(true)
    setError('')

    // Try to get LINE userId from LIFF; fall back to device ID
    let lineUserId = getDeviceId()
    try {
      const profile = await getLiffProfile()
      if (profile?.userId) lineUserId = profile.userId
    } catch { /* ignore */ }

    const result = await bindStudentByInviteCode(trimmed, lineUserId)
    setLoading(false)

    if (result.success && result.studentName) {
      onBound(result.studentName)
    } else {
      setError(result.error ?? '綁定失敗，請重試')
    }
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-6 bg-white"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      {/* Logo */}
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
            綁定後即可開始雲端同步記錄
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
          onClick={handleBind}
          disabled={loading || code.length !== 8}
          className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50 transition-opacity"
          style={{ backgroundColor: '#d0502a' }}
        >
          {loading ? '綁定中...' : '確認綁定'}
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
