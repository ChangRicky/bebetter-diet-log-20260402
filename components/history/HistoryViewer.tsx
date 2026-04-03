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

// ── Weekly Summary ──────────────────────────────────────────────────────────────

interface WeekData {
  weekLabel: string;
  weekNum: number;
  mealCount: number;
  behaviorCount: number;
  total: number;
  startDate: Date;
}

function getWeeklyData(records: AppRecord[]): WeekData[] {
  if (records.length === 0) return [];

  const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp);
  const firstDate = new Date(sorted[0].timestamp);
  // Start of first week (Monday)
  const firstMonday = new Date(firstDate);
  firstMonday.setHours(0, 0, 0, 0);
  const dayOfWeek = firstMonday.getDay();
  firstMonday.setDate(firstMonday.getDate() - ((dayOfWeek + 6) % 7));

  const now = new Date();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const totalWeeks = Math.ceil((now.getTime() - firstMonday.getTime()) / weekMs);
  const maxWeeks = Math.min(totalWeeks, 20); // Cap at 20 weeks

  const weeks: WeekData[] = [];
  for (let i = 0; i < maxWeeks; i++) {
    const weekStart = new Date(firstMonday.getTime() + i * weekMs);
    const weekEnd = new Date(weekStart.getTime() + weekMs);
    const weekRecords = records.filter(r => r.timestamp >= weekStart.getTime() && r.timestamp < weekEnd.getTime());
    const m = weekRecords.filter(r => r.type === 'meal').length;
    const b = weekRecords.filter(r => r.type === 'behavior').length;
    weeks.push({
      weekLabel: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
      weekNum: i + 1,
      mealCount: m,
      behaviorCount: b,
      total: m + b,
      startDate: weekStart,
    });
  }
  return weeks;
}

const WeeklySummary: React.FC<{ records: AppRecord[] }> = ({ records }) => {
  const weeks = getWeeklyData(records);
  const totalMeals = records.filter(r => r.type === 'meal').length;
  const totalBehaviors = records.filter(r => r.type === 'behavior').length;
  const maxPerWeek = Math.max(...weeks.map(w => w.total), 1);
  const streakWeeks = weeks.filter(w => w.total > 0).length;

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

      {/* Weekly bar chart */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">每週紀錄量</h3>
        <div className="flex flex-col gap-1.5">
          {weeks.map((week) => (
            <div key={week.weekNum} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-16 text-right shrink-0">
                W{week.weekNum} {week.weekLabel}
              </span>
              <div className="flex-1 flex gap-0.5 h-5">
                {week.mealCount > 0 && (
                  <div
                    className="bg-[#d0502a] rounded-sm"
                    style={{ width: `${(week.mealCount / maxPerWeek) * 100}%`, minWidth: '4px' }}
                    title={`飲食 ${week.mealCount} 筆`}
                  />
                )}
                {week.behaviorCount > 0 && (
                  <div
                    className="bg-[#efa93b] rounded-sm"
                    style={{ width: `${(week.behaviorCount / maxPerWeek) * 100}%`, minWidth: '4px' }}
                    title={`行為 ${week.behaviorCount} 筆`}
                  />
                )}
                {week.total === 0 && (
                  <div className="bg-gray-100 rounded-sm w-full" />
                )}
              </div>
              <span className="text-xs text-gray-500 w-6 text-right shrink-0">{week.total}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 pt-2 border-t border-gray-100">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <span className="w-3 h-3 rounded-sm bg-[#d0502a] inline-block" /> 飲食
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <span className="w-3 h-3 rounded-sm bg-[#efa93b] inline-block" /> 行為指標
          </span>
        </div>
      </div>

      {/* Daily heatmap — last 10 weeks */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">每日紀錄熱力圖</h3>
        <DailyHeatmap records={records} weeks={Math.min(weeks.length, 10)} />
      </div>
    </div>
  );
};

/** Simple daily heatmap — shows colored squares for each day */
const DailyHeatmap: React.FC<{ records: AppRecord[]; weeks: number }> = ({ records, weeks: numWeeks }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  // Start from numWeeks ago's Monday
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - ((dayOfWeek + 6) % 7) - (numWeeks - 1) * 7);

  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.ceil((today.getTime() - startDate.getTime()) / dayMs) + 1;

  // Build counts per day
  const countMap = new Map<string, number>();
  for (const r of records) {
    const d = new Date(r.timestamp);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    countMap.set(key, (countMap.get(key) || 0) + 1);
  }

  const days: Array<{ date: Date; count: number; col: number; row: number }> = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate.getTime() + i * dayMs);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const row = (d.getDay() + 6) % 7; // Mon=0, Sun=6
    const col = Math.floor(i / 7);
    days.push({ date: d, count: countMap.get(key) || 0, col, row });
  }

  const maxCount = Math.max(...days.map(d => d.count), 1);
  const numCols = Math.ceil(totalDays / 7);

  const getColor = (count: number) => {
    if (count === 0) return '#F3F4F6';
    const intensity = Math.min(count / maxCount, 1);
    if (intensity < 0.33) return '#FED7AA';
    if (intensity < 0.66) return '#F97316';
    return '#D0502A';
  };

  return (
    <div className="overflow-x-auto">
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${numCols}, 14px)`, gridTemplateRows: 'repeat(7, 14px)', gap: '2px' }}>
        {days.map((day, i) => (
          <div
            key={i}
            style={{
              gridColumn: day.col + 1,
              gridRow: day.row + 1,
              width: 14,
              height: 14,
              borderRadius: 2,
              backgroundColor: day.date > today ? 'transparent' : getColor(day.count),
            }}
            title={`${day.date.getMonth() + 1}/${day.date.getDate()}: ${day.count} 筆`}
          />
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2">
        <span className="text-xs text-gray-400">少</span>
        {['#F3F4F6', '#FED7AA', '#F97316', '#D0502A'].map((c) => (
          <span key={c} style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: c, display: 'inline-block' }} />
        ))}
        <span className="text-xs text-gray-400">多</span>
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
