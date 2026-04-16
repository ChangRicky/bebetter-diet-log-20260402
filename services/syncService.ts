/**
 * Cloud sync service — IndexedDB-first, Supabase as background sync target.
 *
 * Flow:
 *  saveRecord() → IndexedDB (sync, immediate)
 *                → Supabase (async, best-effort)
 *                  → on failure → retry queue (localStorage)
 *
 * On app startup, processRetryQueue() drains pending syncs.
 */
import type { AppRecord } from '../types'
import { supabase } from './supabase'
import { getBoundStudentId } from './bindingService'

const RETRY_QUEUE_KEY = 'bebetter-sync-retry'

interface QueueEntry {
  id: string
  studentId: string
  recordDate: string
  recordType: 'meal' | 'behavior'
  data: AppRecord
}

// ── Retry queue ──────────────────────────────────────────────────

function getRetryQueue(): QueueEntry[] {
  try {
    return JSON.parse(localStorage.getItem(RETRY_QUEUE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function setRetryQueue(q: QueueEntry[]): void {
  localStorage.setItem(RETRY_QUEUE_KEY, JSON.stringify(q))
}

function enqueue(entry: QueueEntry): void {
  const q = getRetryQueue()
  // Deduplicate by id
  const filtered = q.filter(e => !(e.id === entry.id && e.studentId === entry.studentId))
  setRetryQueue([...filtered, entry])
}

function dequeue(id: string, studentId: string): void {
  setRetryQueue(getRetryQueue().filter(e => !(e.id === id && e.studentId === studentId)))
}

// ── Date helpers ─────────────────────────────────────────────────

function toDateStr(record: AppRecord): string {
  if (record.type === 'behavior') {
    return record.recordDate
  }
  // MealRecord — use recordDate if set, else derive from timestamp
  const d = record.type === 'meal' && record.recordDate
    ? new Date(record.recordDate)
    : new Date(record.timestamp)
  return d.toISOString().split('T')[0]
}

// ── Single record sync ────────────────────────────────────────────

async function syncOne(entry: QueueEntry): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('student_daily_logs')
    .upsert({
      id: entry.id,
      student_id: entry.studentId,
      record_date: entry.recordDate,
      record_type: entry.recordType,
      data: entry.data,
      synced_at: new Date().toISOString(),
    }, { onConflict: 'student_id,id' })

  return !error
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Try to sync a record to Supabase. On failure, add to retry queue.
 * No-op if student is not bound or Supabase not configured.
 */
export async function syncRecord(record: AppRecord): Promise<void> {
  const studentId = getBoundStudentId()
  if (!studentId || !supabase) return

  const entry: QueueEntry = {
    id: record.id,
    studentId,
    recordDate: toDateStr(record),
    recordType: record.type,
    data: record,
  }

  const ok = await syncOne(entry)
  if (!ok) {
    enqueue(entry)
  }
}

/**
 * Process pending retry queue. Call on app startup.
 * Silently ignores errors — failed items stay in queue for next time.
 */
export async function processRetryQueue(): Promise<void> {
  const studentId = getBoundStudentId()
  if (!studentId || !supabase) return

  const queue = getRetryQueue().filter(e => e.studentId === studentId)
  if (queue.length === 0) return

  for (const entry of queue) {
    const ok = await syncOne(entry)
    if (ok) dequeue(entry.id, entry.studentId)
  }
}

/** Number of records waiting for sync */
export function pendingSyncCount(): number {
  const studentId = getBoundStudentId()
  if (!studentId) return 0
  return getRetryQueue().filter(e => e.studentId === studentId).length
}
