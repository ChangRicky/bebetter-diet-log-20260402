import React, { useState } from 'react';
import { composeMealCard, composeBehaviorCard } from '../../services/canvasExport';
import { getLiffUserName } from '../../services/liffService';
import { saveMealDraft, setDuplicatedImage } from '../../services/draftStorage';
import type { AppRecord, MealRecord, BehaviorRecord } from '../../types';

interface HistoryViewerProps {
  records: AppRecord[];
  onRecordSaved?: () => void;
  onDuplicateMeal?: () => void;
}

export const HistoryViewer: React.FC<HistoryViewerProps> = ({ records, onDuplicateMeal }) => {
  const [filter, setFilter] = useState<'all' | 'meal' | 'behavior' | 'summary'>('all');

  const filtered = records
    .filter((r) => filter === 'all' || filter === 'summary' || r.type === filter)
    .sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="max-w-lg mx-auto px-4 pb-6">
      <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">歷史紀錄</h2>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {[
          { id: 'all' as const, label: '全部' },
          { id: 'meal' as const, label: '飲食' },
          { id: 'behavior' as const, label: '行為指標' },
          { id: 'summary' as const, label: '📊 總覽' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2.5 min-h-[44px] rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              filter === f.id
                ? 'bg-[#d0502a] text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filter === 'summary' ? (
        <WeeklySummary records={records} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-xl text-gray-400">目前沒有任何紀錄</p>
          <p className="mt-2 text-sm text-gray-400">開始記錄你的第一筆資料吧！</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((record) =>
            record.type === 'meal' ? (
              <MealCard key={record.id} record={record} onDuplicate={onDuplicateMeal} />
            ) : (
              <BehaviorCard key={record.id} record={record} />
            )
          )}
        </div>
      )}
    </div>
  );
};

const MealCard: React.FC<{ record: MealRecord; onDuplicate?: () => void }> = ({ record, onDuplicate }) => {
  const [exporting, setExporting] = useState(false);
  const date = new Date(record.timestamp);

  const handleExport = async () => {
    setExporting(true);
    try {
      const url = await composeMealCard(record, getLiffUserName());
      downloadImage(url, `BeBetter飲食紀錄-${date.toLocaleDateString('zh-TW')}.jpg`);
    } catch { /* ignore */ }
    setExporting(false);
  };

  const handleDuplicate = () => {
    saveMealDraft({
      items: record.items.map(i => ({ name: i.name, tags: i.tags.map(t => ({ tag: t.tag, qty: t.qty })) })),
      mealType: record.mealType,
      note: '',
      showNote: false,
      duplicated: true,
    });
    setDuplicatedImage(record.imageDataUrl);
    onDuplicate?.();
  };

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
      <img
        src={record.imageDataUrl}
        alt="餐點"
        className="w-full h-40 object-cover"
      />
      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="bg-[#FFF3E8] text-[#d0502a] text-xs font-semibold px-2 py-0.5 rounded-full">
              {record.mealType}
            </span>
            <span className="text-xs text-gray-400">
              {date.toLocaleString('zh-TW', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={handleDuplicate}
              className="text-xs text-gray-600 font-medium px-2.5 py-2 min-h-[44px] flex items-center justify-center rounded-lg bg-gray-100 active:bg-gray-200"
            >
              📋 複製
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="text-xs text-[#d0502a] font-medium px-2.5 py-2 min-h-[44px] flex items-center justify-center rounded-lg bg-[#FFF3E8] active:bg-[#FFE8D6] disabled:opacity-50"
            >
              {exporting ? '...' : '💾 下載'}
            </button>
          </div>
        </div>
        {Array.isArray(record.items) && record.items.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {record.items.map((item, i) => (
              <span key={i} className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full border border-gray-100">
                {item.name || '食物'}：{Array.isArray(item.tags) ? item.tags.map(t => `${t.tag}${t.qty}份`).join(' ') : ''}
              </span>
            ))}
          </div>
        )}
        {record.note && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{record.note}</p>
        )}
      </div>
    </div>
  );
};

const BehaviorCard: React.FC<{ record: BehaviorRecord }> = ({ record }) => {
  const [exporting, setExporting] = useState(false);
  const displayDate = record.recordDate || new Date(record.timestamp).toLocaleDateString('zh-TW');

  const handleExport = async () => {
    setExporting(true);
    try {
      const url = await composeBehaviorCard(record, getLiffUserName());
      downloadImage(url, `BeBetter行為指標-${displayDate}.jpg`);
    } catch { /* ignore */ }
    setExporting(false);
  };

  const items = [
    { icon: '💧', label: '喝水', value: record.waterMl != null ? `${record.waterMl}ml` : null },
    { icon: '🥛', label: '蛋白', value: record.proteinCups != null ? `${record.proteinCups}杯` : null },
    { icon: '🏃', label: '運動', value: record.exercise === true ? (record.exerciseNote || '有') : record.exercise === false ? '沒有' : null },
    { icon: '🚶', label: '步數', value: record.stepsCount ? `${record.stepsCount}步` : null },
    { icon: '😴', label: '睡眠', value: record.sleep ? `${record.sleep}${record.sleepQuality ? `(${record.sleepQuality})` : ''}${record.bedtime ? ` ${record.bedtime}就寢` : ''}` : record.bedtime ? `${record.bedtime}就寢` : null },
    { icon: '🚽', label: '排便', value: record.bowel ?? null },
    { icon: '💊', label: '保健品', value: record.supplements?.trim() || null },
  ].filter((i) => i.value != null && i.value !== 'undefined');

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="bg-gray-800 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            行為指標
          </span>
          <span className="text-xs text-gray-400">
            {displayDate}
          </span>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="text-xs text-[#d0502a] font-medium px-2 py-1 rounded-lg bg-[#FFF3E8] active:bg-[#FFE8D6] disabled:opacity-50"
        >
          {exporting ? '...' : '💾 下載'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item.label} className="text-xs bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
            {item.icon} {item.value}
          </span>
        ))}
      </div>
    </div>
  );
};

// ── Weekly Summary with data archive ────────────────────────────────────────────

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

interface WeekData {
  weekNum: number;
  startDate: Date;
  endDate: Date;
  records: AppRecord[];
  mealCount: number;
  behaviorCount: number;
}

function buildWeeks(records: AppRecord[]): WeekData[] {
  if (records.length === 0) return [];
  const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp);
  const first = new Date(sorted[0].timestamp);
  first.setHours(0, 0, 0, 0);
  const dow = first.getDay();
  const firstMon = new Date(first);
  firstMon.setDate(firstMon.getDate() - ((dow + 6) % 7));

  const now = new Date();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const total = Math.min(Math.ceil((now.getTime() - firstMon.getTime()) / weekMs), 20);

  const weeks: WeekData[] = [];
  for (let i = 0; i < total; i++) {
    const s = new Date(firstMon.getTime() + i * weekMs);
    const e = new Date(s.getTime() + weekMs);
    const wr = records.filter(r => r.timestamp >= s.getTime() && r.timestamp < e.getTime());
    weeks.push({
      weekNum: i + 1, startDate: s, endDate: e, records: wr,
      mealCount: wr.filter(r => r.type === 'meal').length,
      behaviorCount: wr.filter(r => r.type === 'behavior').length,
    });
  }
  return weeks;
}

/** Group records by date string */
function groupByDate(records: AppRecord[]): Map<string, AppRecord[]> {
  const map = new Map<string, AppRecord[]>();
  for (const r of records) {
    const d = new Date(r.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

const WeeklySummary: React.FC<{ records: AppRecord[] }> = ({ records }) => {
  const weeks = buildWeeks(records);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(weeks.length > 0 ? weeks[weeks.length - 1].weekNum : null);
  const totalMeals = records.filter(r => r.type === 'meal').length;
  const totalBehaviors = records.filter(r => r.type === 'behavior').length;
  const streakWeeks = weeks.filter(w => w.records.length > 0).length;

  if (records.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-xl text-gray-400">開始記錄後就能看到總覽</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-[#d0502a]">{totalMeals + totalBehaviors}</p>
          <p className="text-xs text-gray-500">總紀錄數</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-[#efa93b]">{weeks.length}</p>
          <p className="text-xs text-gray-500">累計週數</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-green-500">{streakWeeks}</p>
          <p className="text-xs text-gray-500">有記錄週數</p>
        </div>
      </div>

      {/* Motivational text */}
      <div className="bg-[#FFF8F0] rounded-xl p-3 border border-[#efa93b]/20">
        <p className="text-xs text-[#d0502a] leading-relaxed">
          {streakWeeks >= 8
            ? '🔥 太厲害了！你已經堅持超過 8 週，持續的力量正在改變你！'
            : streakWeeks >= 4
            ? '💪 超過一個月的堅持，你正在養成好習慣！'
            : streakWeeks >= 2
            ? '🌱 很好的開始！每一週的記錄都是成長的證明。'
            : '✨ 第一步最重要，持續記錄就對了！'}
        </p>
      </div>

      {/* Expandable weekly archive — latest first */}
      {[...weeks].reverse().map((week) => {
        const isOpen = expandedWeek === week.weekNum;
        const fmtDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
        const dailyMap = groupByDate(week.records);
        const completionRate = Math.round((week.records.length > 0 ? 1 : 0) * 100);

        return (
          <div key={week.weekNum} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Week header — clickable */}
            <button
              onClick={() => setExpandedWeek(isOpen ? null : week.weekNum)}
              className="w-full flex items-center justify-between p-3 active:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <span className="bg-[#d0502a] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  W{week.weekNum}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {fmtDate(week.startDate)} ~ {fmtDate(new Date(week.endDate.getTime() - 86400000))}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  🍽{week.mealCount} 📋{week.behaviorCount}
                </span>
                <span className={`text-sm transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
              </div>
            </button>

            {/* Expanded: daily detail */}
            {isOpen && (
              <div className="border-t border-gray-100 px-3 pb-3">
                {week.records.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">這週沒有紀錄</p>
                ) : (
                  <div className="flex flex-col gap-2 mt-2">
                    {[...dailyMap.entries()].map(([dateKey, dayRecords]) => {
                      const d = new Date(dateKey + 'T00:00:00');
                      const dayLabel = WEEKDAY_LABELS[(d.getDay() + 6) % 7];
                      return (
                        <div key={dateKey} className="bg-gray-50 rounded-lg p-2.5">
                          <p className="text-xs font-semibold text-gray-600 mb-1.5">
                            {d.getMonth() + 1}/{d.getDate()}（{dayLabel}）
                          </p>
                          <div className="flex flex-col gap-1">
                            {dayRecords.sort((a, b) => a.timestamp - b.timestamp).map((r) => (
                              <DayRecordRow key={r.id} record={r} />
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Week summary stats */}
                    <WeekStats records={week.records} />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/** Single record row inside daily detail */
const DayRecordRow: React.FC<{ record: AppRecord }> = ({ record }) => {
  const time = new Date(record.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });

  if (record.type === 'meal') {
    const meal = record as MealRecord;
    const foodList = Array.isArray(meal.items)
      ? meal.items.map(i => `${i.name}（${i.tags.map(t => `${t.tag}${t.qty}份`).join('、')}）`).join('、')
      : '';
    return (
      <div className="flex items-start gap-2">
        <span className="text-xs text-gray-400 shrink-0 mt-0.5">{time}</span>
        <div>
          <span className="text-xs font-semibold text-[#d0502a]">{meal.mealType}</span>
          <span className="text-xs text-gray-600 ml-1">{foodList}</span>
        </div>
      </div>
    );
  }

  const beh = record as BehaviorRecord;
  const parts: string[] = [];
  if (beh.waterMl != null) parts.push(`💧${beh.waterMl}ml`);
  if (beh.proteinCups != null) parts.push(`🥛${beh.proteinCups}杯`);
  if (beh.exercise === true) parts.push(`🏃${beh.exerciseNote || '有'}${beh.exerciseDuration ? ` ${beh.exerciseDuration}分` : ''}`);
  if (beh.stepsCount) parts.push(`🚶${Number(beh.stepsCount).toLocaleString()}步`);
  if (beh.sleep) parts.push(`😴${beh.sleep}${beh.sleepQuality ? `(${beh.sleepQuality})` : ''}`);
  if (beh.bowel) parts.push(`🚽${beh.bowel}`);
  if (beh.supplements?.trim()) parts.push(`💊${beh.supplements.trim()}`);

  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-gray-400 shrink-0 mt-0.5">{time}</span>
      <div>
        <span className="text-xs font-semibold text-gray-700">行為指標</span>
        <span className="text-xs text-gray-600 ml-1">{parts.join('  ')}</span>
      </div>
    </div>
  );
};

/** Week-level aggregate stats */
const WeekStats: React.FC<{ records: AppRecord[] }> = ({ records }) => {
  const meals = records.filter(r => r.type === 'meal') as MealRecord[];
  const behaviors = records.filter(r => r.type === 'behavior') as BehaviorRecord[];

  // Count unique days with records
  const uniqueDays = new Set(records.map(r => {
    const d = new Date(r.timestamp);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  })).size;

  // Average water
  const waterRecords = behaviors.filter(b => b.waterMl != null);
  const avgWater = waterRecords.length > 0
    ? Math.round(waterRecords.reduce((s, b) => s + (b.waterMl || 0), 0) / waterRecords.length)
    : null;

  // Exercise count
  const exerciseDays = behaviors.filter(b => b.exercise === true).length;

  return (
    <div className="bg-[#FFF8F0] rounded-lg p-2.5 mt-1">
      <p className="text-xs font-semibold text-[#d0502a] mb-1">本週小結</p>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-600">
        <span>📅 記錄 {uniqueDays} 天</span>
        <span>🍽 飲食 {meals.length} 筆</span>
        <span>📋 行為 {behaviors.length} 筆</span>
        {avgWater !== null && <span>💧 平均喝水 {avgWater}ml</span>}
        {exerciseDays > 0 && <span>🏃 運動 {exerciseDays} 天</span>}
      </div>
    </div>
  );
};

/** Cross-device image download — handles iOS, Android, and desktop */
async function downloadImage(dataUrl: string, fileName: string) {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    // Detect touch Apple devices where <a download> silently fails
    const isTouchApple =
      'ontouchstart' in window &&
      navigator.maxTouchPoints > 0 &&
      (/Mac|iPad|iPhone|iPod/.test(navigator.platform) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    if (!isTouchApple) {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      return;
    }

    // iOS: try Web Share API
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        URL.revokeObjectURL(blobUrl);
        return;
      }
    }

    // Fallback: open in new tab for long-press save
    window.open(blobUrl, '_blank');
  } catch {
    // Last resort
    try {
      const r = await fetch(dataUrl);
      const b = await r.blob();
      window.open(URL.createObjectURL(b), '_blank');
    } catch { /* swallow */ }
  }
}
