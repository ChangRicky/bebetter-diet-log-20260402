import type { AppRecord, MealRecord } from '../types';
import { syncRecord } from './syncService';

const DB_NAME = 'bebetter-diet';
const DB_VERSION = 1;
const STORE_NAME = 'records';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveRecord(record: AppRecord): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  // Background cloud sync — don't await, don't block UI
  syncRecord(record).catch(() => {});
}

export async function getAllRecords(): Promise<AppRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).index('timestamp').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteRecord(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Migrate old localStorage data to IndexedDB
export async function migrateFromLocalStorage(): Promise<void> {
  const raw = localStorage.getItem('beBetterDietRecords');
  if (!raw) return;

  try {
    const oldRecords: any[] = JSON.parse(raw);
    for (const r of oldRecords) {
      const record: MealRecord = {
        id: r.id,
        type: 'meal',
        imageDataUrl: r.imageDataUrl,
        items: [],
        note: r.text || '',
        aiAnalysis: r.aiAnalysis || '',
        timestamp: r.timestamp,
        mealType: r.mealType || '早餐',
      };
      await saveRecord(record);
    }
    localStorage.removeItem('beBetterDietRecords');
  } catch (e) {
    console.error('Migration failed:', e);
  }
}
