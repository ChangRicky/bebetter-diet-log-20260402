/**
 * Singleton toast system for the diet-log app.
 * Usage:
 *   toast('訊息', 'success' | 'error' | 'info')
 *   <ToastContainer /> — render once in App.tsx
 */
import { useEffect, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'
interface ToastItem { id: number; msg: string; type: ToastType }

let _handler: ((msg: string, type: ToastType) => void) | null = null

export function toast(msg: string, type: ToastType = 'info') {
  _handler?.(msg, type)
}

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    _handler = (msg, type) => {
      const id = Date.now()
      setItems(prev => [...prev, { id, msg, type }])
      setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), 3500)
    }
    return () => { _handler = null }
  }, [])

  if (items.length === 0) return null

  const colors: Record<ToastType, string> = {
    success: 'bg-green-600',
    error: 'bg-red-500',
    info: 'bg-gray-800',
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
      {items.map(t => (
        <div
          key={t.id}
          className={`${colors[t.type]} text-white px-4 py-2 rounded-lg text-sm shadow-lg`}
        >
          {t.msg}
        </div>
      ))}
    </div>
  )
}
