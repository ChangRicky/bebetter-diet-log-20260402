import React, { useState } from 'react';
import { composeMealCard, composeBehaviorCard, composeWeeklyReport, composeProgramSummary, generateStructuredData } from '../../services/canvasExport';
import { getLiffUserName } from '../../services/liffService';
import { saveMealDraft, saveBehaviorDraft, setDuplicatedImage } from '../../services/draftStorage';
import { sortTags, toDateString } from '../../constants';
import type { AppRecord, MealRecord, BehaviorRecord } from '../../types';

interface HistoryViewerProps {
  records: AppRecord[];
  onRecordSaved?: () => void;
  onDuplicateMeal?: () => void;
  onDuplicateBehavior?: () => void;
}

export const HistoryViewer: React.FC<HistoryViewerProps> = ({ records, onDuplicateMeal, onDuplicateBehavior }) => {
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
              <BehaviorCard key={record.id} record={record} onDuplicate={onDuplicateBehavior} />
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
                {item.name || '食物'}：{Array.isArray(item.tags) ? sortTags(item.tags).map(t => `${t.tag}${t.qty}份`).join(' ') : ''}
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

const BehaviorCard: React.FC<{ record: BehaviorRecord; onDuplicate?: () => void }> = ({ record, onDuplicate }) => {
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

  const handleDuplicate = () => {
    saveBehaviorDraft({
      recordDate: toDateString(new Date()),
      waterMl: record.waterMl,
      customWater: record.waterMl != null ? String(record.waterMl) : '',
      proteinCups: record.proteinCups,
      proteinGrams: record.proteinGrams || '',
      exercise: record.exercise,
      exerciseNote: record.exerciseNote || '',
      exerciseDuration: record.exerciseDuration || '',
      exercise2Note: record.exercise2Note || '',
      exercise2Duration: record.exercise2Duration || '',
      stepsCount: record.stepsCount || '',
      sleep: record.sleep,
      sleepQuality: record.sleepQuality,
      bedtime: record.bedtime || '',
      sleepNote: record.sleepNote || '',
      bowel: record.bowel,
      bowelNote: record.bowelNote || '',
      junkFood: record.junkFood ?? null,
      supplements: record.supplements || '',
      generalNote: '',
      cardTheme: record.cardTheme || 'dark',
    });
    onDuplicate?.();
  };

  const bowelDisplay = record.bowel
    ? (record.bowelNote?.trim() ? `${record.bowel}（${record.bowelNote}）` : record.bowel)
    : null;

  const items = [
    { icon: '💧', label: '喝水', value: record.waterMl != null ? `${record.waterMl}ml` : null },
    { icon: '🥛', label: '蛋白', value: record.proteinCups != null ? `${record.proteinCups}杯` : null },
    { icon: '🏃', label: '運動', value: record.exercise === true ? ([record.exerciseNote || '有', record.exercise2Note].filter(Boolean).join(' + ') + (record.exerciseDuration ? ` ${record.exerciseDuration}分` : '') + (record.exercise2Duration ? `+${record.exercise2Duration}分` : '')) : record.exercise === false ? '沒有' : null },
    { icon: '🚶', label: '步數', value: record.stepsCount ? `${record.stepsCount}步` : null },
    { icon: '😴', label: '睡眠', value: record.sleep ? `${record.sleep}${record.sleepQuality ? `(${record.sleepQuality})` : ''}${record.bedtime ? ` ${record.bedtime}就寢` : ''}${record.sleepNote?.trim() ? ` ${record.sleepNote}` : ''}` : record.bedtime ? `${record.bedtime}就寢` : null },
    { icon: '🚽', label: '排便', value: bowelDisplay },
    { icon: '🚫', label: '垃圾食物', value: record.junkFood === true ? '有吃' : record.junkFood === false ? '沒有' : null },
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
  weekNum: number;        // 0 = unassigned, 1+ = official within a period
  globalWeekNum: number;  // continuous across all periods (1, 2, ... 18) for Excel sync
  startDate: Date;
  endDate: Date;
  records: AppRecord[];
  mealCount: number;
  behaviorCount: number;
  isPractice: boolean;
  periodId?: string;      // which course period this week belongs to
  periodLabel?: string;
}

const COURSE_PERIODS_KEY = 'bebetter_course_periods';

type CoursePlanId = 'standard' | 'premium' | 'loop_full' | 'loop_lite';

const COURSE_PLANS: { id: CoursePlanId; label: string; weeks: number; desc: string; isMain: boolean }[] = [
  { id: 'standard', label: 'Standard 標準版', weeks: 8, desc: '8 週基礎課程', isMain: true },
  { id: 'premium', label: 'Premium 高級版', weeks: 10, desc: '10 週進階課程', isMain: true },
  { id: 'loop_full', label: 'Loop Full 延長', weeks: 8, desc: '高級版延長 8 週', isMain: false },
  { id: 'loop_lite', label: 'Loop Lite 延長', weeks: 8, desc: '標準版延長 8 週', isMain: false },
];

interface CoursePeriod {
  id: string;         // unique id (timestamp)
  planId: CoursePlanId;
  startDate: string;  // YYYY-MM-DD
  weeks: number;
  label: string;
}

function loadPeriods(): CoursePeriod[] {
  try {
    const raw = localStorage.getItem(COURSE_PERIODS_KEY);
    if (!raw) {
      // Migrate from old single-period format
      const oldStart = localStorage.getItem('bebetter_course_start');
      const oldPlan = localStorage.getItem('bebetter_course_plan') as CoursePlanId | null;
      if (oldStart && oldPlan) {
        const plan = COURSE_PLANS.find(p => p.id === oldPlan);
        const periods: CoursePeriod[] = [{
          id: Date.now().toString(),
          planId: oldPlan,
          startDate: oldStart,
          weeks: plan?.weeks ?? 8,
          label: plan?.label ?? oldPlan,
        }];
        savePeriods(periods);
        localStorage.removeItem('bebetter_course_start');
        localStorage.removeItem('bebetter_course_plan');
        return periods;
      }
      return [];
    }
    return JSON.parse(raw);
  } catch { return []; }
}

function savePeriods(periods: CoursePeriod[]) {
  localStorage.setItem(COURSE_PERIODS_KEY, JSON.stringify(periods));
}

function toMonday(d: Date): Date {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}

function buildWeeks(records: AppRecord[], periods: CoursePeriod[]): WeekData[] {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const now = new Date();

  // Build period ranges (start Monday → end Monday)
  const periodRanges = periods.map(p => {
    const startMon = toMonday(new Date(p.startDate + 'T00:00:00'));
    const endTime = startMon.getTime() + p.weeks * weekMs;
    return { ...p, startMon, endTime };
  });

  // Find earliest Monday across records and periods
  const sorted = records.length > 0 ? [...records].sort((a, b) => a.timestamp - b.timestamp) : [];
  const firstRecMon = sorted.length > 0 ? toMonday(new Date(sorted[0].timestamp)) : null;
  const firstPeriodMon = periodRanges.length > 0
    ? new Date(Math.min(...periodRanges.map(p => p.startMon.getTime())))
    : null;

  // Need at least one anchor point
  if (!firstRecMon && !firstPeriodMon) return [];

  const earliestMon = firstRecMon && firstPeriodMon
    ? (firstRecMon < firstPeriodMon ? firstRecMon : firstPeriodMon)
    : (firstRecMon || firstPeriodMon!);

  // Also consider latest period end to ensure all period weeks are shown
  const latestEnd = periodRanges.length > 0
    ? Math.max(...periodRanges.map(p => p.endTime))
    : now.getTime();
  const upperBound = Math.min(Math.max(now.getTime(), latestEnd), earliestMon.getTime() + 52 * weekMs);

  const total = Math.max(1, Math.ceil((upperBound - earliestMon.getTime()) / weekMs));

  const weeks: WeekData[] = [];
  for (let i = 0; i < total; i++) {
    const s = new Date(earliestMon.getTime() + i * weekMs);
    const e = new Date(s.getTime() + weekMs);
    const wr = records.filter(r => r.timestamp >= s.getTime() && r.timestamp < e.getTime());

    // Find which period this week belongs to
    const period = periodRanges.find(p =>
      s.getTime() >= p.startMon.getTime() && s.getTime() < p.endTime
    );

    const isPractice = !period;
    const weekNum = period
      ? Math.round((s.getTime() - period.startMon.getTime()) / weekMs) + 1
      : 0;

    weeks.push({
      weekNum, globalWeekNum: 0, startDate: s, endDate: e, records: wr, isPractice,
      mealCount: wr.filter(r => r.type === 'meal').length,
      behaviorCount: wr.filter(r => r.type === 'behavior').length,
      periodId: period?.id,
      periodLabel: period?.label,
    });
  }

  // Compute globalWeekNum: continuous counter across all periods (skip practice weeks)
  let globalCounter = 0;
  for (const w of weeks) {
    if (!w.isPractice && w.weekNum > 0) {
      globalCounter++;
      w.globalWeekNum = globalCounter;
    }
  }

  return weeks;
}

/** Group records by date string — uses recordDate when available */
function groupByDate(records: AppRecord[]): Map<string, AppRecord[]> {
  const map = new Map<string, AppRecord[]>();
  for (const r of records) {
    // Use recordDate if available (for both meal and behavior records)
    const rdStr = r.type === 'behavior' ? (r as BehaviorRecord).recordDate
      : (r as MealRecord).recordDate;
    const d = rdStr ? new Date(rdStr + 'T00:00:00') : new Date(r.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

const WeeklySummary: React.FC<{ records: AppRecord[] }> = ({ records }) => {
  const [periods, setPeriodsState] = useState<CoursePeriod[]>(loadPeriods);
  const [showSettings, setShowSettings] = useState(false);
  const [addingPeriod, setAddingPeriod] = useState(false);
  const [newPlanId, setNewPlanId] = useState<CoursePlanId | null>(null);
  const [newStartDate, setNewStartDate] = useState('');
  const weeks = buildWeeks(records, periods);
  const officialWeeks = weeks.filter(w => !w.isPractice);
  const [expandedKey, setExpandedKey] = useState<string | null>(() => {
    if (weeks.length === 0) return null;
    const last = weeks[weeks.length - 1];
    return `${last.periodId || 'p'}-${last.weekNum}`;
  });
  const [exportingWeek, setExportingWeek] = useState<string | null>(null);
  const [exportingProgram, setExportingProgram] = useState<string | null>(null);
  const totalMeals = records.filter(r => r.type === 'meal').length;
  const totalBehaviors = records.filter(r => r.type === 'behavior').length;
  const streakWeeks = weeks.filter(w => w.records.length > 0).length;
  const userName = getLiffUserName();

  // ── Course plan validation helpers ──
  const existingMain = periods.find(p => {
    const plan = COURSE_PLANS.find(c => c.id === p.planId);
    return plan?.isMain;
  });
  const existingMainPlanId = existingMain?.planId as CoursePlanId | undefined;
  const hasExtension = periods.some(p => !COURSE_PLANS.find(c => c.id === p.planId)?.isMain);

  // Which extension is allowed based on the main plan
  const allowedExtension: CoursePlanId | null =
    existingMainPlanId === 'premium' ? 'loop_full'
    : existingMainPlanId === 'standard' ? 'loop_lite'
    : null;

  // Smart default start date for extension = day after main plan ends
  const suggestedExtensionStart = (): string => {
    if (!existingMain) return '';
    const end = new Date(existingMain.startDate + 'T00:00:00');
    end.setDate(end.getDate() + existingMain.weeks * 7);
    return end.toISOString().slice(0, 10);
  };

  const addPeriod = () => {
    if (!newPlanId || !newStartDate) return;
    const plan = COURSE_PLANS.find(p => p.id === newPlanId);
    if (!plan) return;

    // Validation: can't add two main plans
    if (plan.isMain && existingMain) {
      alert('已經有主方案了，不能同時設定兩個主方案。\n如需更換，請先刪除現有主方案或使用「重新開始」。');
      return;
    }
    // Validation: extension must match main plan
    if (!plan.isMain) {
      if (!existingMain) {
        alert('請先新增主方案（Premium 或 Standard），再加購延長方案。');
        return;
      }
      if (plan.id !== allowedExtension) {
        const correct = existingMainPlanId === 'premium' ? 'Loop Full' : 'Loop Lite';
        alert(`${existingMain.label} 只能搭配 ${correct} 延長方案。`);
        return;
      }
    }

    const newPeriod: CoursePeriod = {
      id: Date.now().toString(),
      planId: newPlanId,
      startDate: newStartDate,
      weeks: plan.weeks,
      label: plan.label,
    };
    const updated = [...periods, newPeriod].sort((a, b) => a.startDate.localeCompare(b.startDate));
    savePeriods(updated);
    setPeriodsState(updated);
    setNewPlanId(null);
    setNewStartDate('');
    setAddingPeriod(false);
  };

  const removePeriod = (id: string) => {
    // If removing a main plan, also remove its extension
    const target = periods.find(p => p.id === id);
    const plan = target ? COURSE_PLANS.find(c => c.id === target.planId) : null;
    let updated: CoursePeriod[];
    if (plan?.isMain) {
      // Removing main plan also removes extensions
      updated = periods.filter(p => {
        if (p.id === id) return false;
        const pp = COURSE_PLANS.find(c => c.id === p.planId);
        return pp?.isMain; // keep other main plans (shouldn't exist, but safe)
      });
    } else {
      updated = periods.filter(p => p.id !== id);
    }
    savePeriods(updated);
    setPeriodsState(updated);
  };

  const weekKey = (w: WeekData) => {
    const dateStr = `${w.startDate.getFullYear()}${String(w.startDate.getMonth() + 1).padStart(2, '0')}${String(w.startDate.getDate()).padStart(2, '0')}`;
    return w.isPractice ? `practice-${dateStr}` : `${w.periodId}-W${w.weekNum}`;
  };

  const handleExportWeek = async (week: WeekData) => {
    const key = weekKey(week);
    setExportingWeek(key);
    try {
      const behaviors = week.records.filter(r => r.type === 'behavior') as BehaviorRecord[];
      const mealCounts = Array(7).fill(0);
      for (const r of week.records) {
        if (r.type !== 'meal') continue;
        const d = new Date(r.timestamp);
        const dayIdx = (d.getDay() + 6) % 7;
        mealCounts[dayIdx]++;
      }
      const meals = week.records.filter(r => r.type === 'meal') as MealRecord[];
      const exportWeekNum = week.globalWeekNum > 0 ? week.globalWeekNum : week.weekNum;
      const url = await composeWeeklyReport({
        weekNum: exportWeekNum,
        startDate: week.startDate,
        endDate: week.endDate,
        behaviorRecords: behaviors,
        mealRecords: meals,
        mealCounts,
        userName,
      });
      downloadImage(url, `BeBetter-W${exportWeekNum}週報.jpg`);
    } catch { /* ignore */ }
    setExportingWeek(null);
  };

  const handleCopyData = async (week: WeekData) => {
    const behaviors = week.records.filter(r => r.type === 'behavior') as BehaviorRecord[];
    const meals = week.records.filter(r => r.type === 'meal') as MealRecord[];
    // Use globalWeekNum so it matches the Excel template (W1-W20 continuously)
    const exportWeekNum = week.globalWeekNum > 0 ? week.globalWeekNum : week.weekNum;
    const text = generateStructuredData({
      weekNum: exportWeekNum,
      startDate: week.startDate,
      behaviorRecords: behaviors,
      mealRecords: meals,
      userName,
    });
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback: show text for manual copy
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    alert(`✅ 數據已複製！\n\n請接著按「匯出 W${exportWeekNum} 週報」，\n將週報圖片和數據一起分享給營養師 📤`);
  };

  const handleDownloadCsv = (week: WeekData) => {
    const behaviors = week.records.filter(r => r.type === 'behavior') as BehaviorRecord[];
    const meals = week.records.filter(r => r.type === 'meal') as MealRecord[];
    const exportWeekNum = week.globalWeekNum > 0 ? week.globalWeekNum : week.weekNum;
    const text = generateStructuredData({
      weekNum: exportWeekNum,
      startDate: week.startDate,
      behaviorRecords: behaviors,
      mealRecords: meals,
      userName,
    });
    // Convert comma-separated lines to proper CSV file
    const lines = text.split('\n');
    // Skip title line (first line), keep column header + 7 data rows
    const csvContent = lines.slice(1).join('\n');
    const bom = '\uFEFF'; // UTF-8 BOM for Excel to recognize Chinese
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BeBetter-W${exportWeekNum}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPeriod = async (period: CoursePeriod) => {
    setExportingProgram(period.id);
    try {
      const periodWeeks = weeks.filter(w => w.periodId === period.id);
      const weekData = periodWeeks.map(w => {
        const behaviors = w.records.filter(r => r.type === 'behavior') as BehaviorRecord[];
        const waterVals = behaviors.filter(b => b.waterMl != null).map(b => b.waterMl!);
        const stepVals = behaviors.filter(b => b.stepsCount && Number(b.stepsCount) > 0).map(b => Number(b.stepsCount));
        const proteinVals = behaviors.filter(b => b.proteinCups != null).map(b => b.proteinCups!);
        const bowelYes = behaviors.filter(b => b.bowel && b.bowel !== '沒有').length;
        const bowelTotal = behaviors.filter(b => b.bowel != null).length;
        const sleepRecords = behaviors.filter(b => b.sleep != null);
        const sleepGood = sleepRecords.filter(b => b.sleep === '7-8hr' || b.sleep === '8hr+').length;
        return {
          weekNum: w.weekNum,
          startDate: w.startDate,
          avgWater: waterVals.length > 0 ? Math.round(waterVals.reduce((a, b) => a + b, 0) / waterVals.length) : null,
          exerciseDays: behaviors.filter(b => b.exercise === true).length,
          avgSteps: stepVals.length > 0 ? Math.round(stepVals.reduce((a, b) => a + b, 0) / stepVals.length) : null,
          avgProtein: proteinVals.length > 0 ? Math.round(proteinVals.reduce((a, b) => a + b, 0) / proteinVals.length * 10) / 10 : null,
          bowelRatio: bowelTotal > 0 ? `${bowelYes}/${bowelTotal}` : null,
          sleepGoodRatio: sleepRecords.length > 0 ? `${sleepGood}/${sleepRecords.length}` : null,
          mealCount: w.mealCount,
          behaviorCount: w.behaviorCount,
          recordDays: new Set(w.records.map(r => {
            const d = new Date(r.timestamp);
            return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          })).size,
        };
      });
      const url = await composeProgramSummary({ weeks: weekData, totalWeeks: period.weeks, planLabel: period.label, userName });
      downloadImage(url, `BeBetter-${period.label}-${period.weeks}週總覽.jpg`);
    } catch { /* ignore */ }
    setExportingProgram(null);
  };

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

      {/* Course periods management */}
      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {periods.length > 0
              ? (() => {
                  const summary = periods.map(p => {
                    const plan = COURSE_PLANS.find(c => c.id === p.planId);
                    return plan?.isMain ? p.label.split(' ')[0] : p.label;
                  }).join(' + ');
                  return `📅 ${summary}`;
                })()
              : '📅 尚未設定課程方案'}
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-xs text-[#d0502a] font-medium px-3 py-1.5 rounded-lg bg-[#FFF3E8] active:bg-[#FFE8D6]"
          >
            {showSettings ? '收合' : '設定'}
          </button>
        </div>

        {/* Active period timeline (always visible when periods exist) */}
        {!showSettings && periods.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {periods.map((p, i) => {
              const plan = COURSE_PLANS.find(c => c.id === p.planId);
              const endD = new Date(p.startDate + 'T00:00:00');
              endD.setDate(endD.getDate() + p.weeks * 7 - 1);
              const now = new Date();
              const startT = new Date(p.startDate + 'T00:00:00').getTime();
              const endT = endD.getTime() + 86400000;
              const isActive = now.getTime() >= startT && now.getTime() < endT;
              const isPast = now.getTime() >= endT;
              const periodWeeks = weeks.filter(w => w.periodId === p.id);
              const currentWeek = periodWeeks.find(w => {
                return now.getTime() >= w.startDate.getTime() && now.getTime() < w.endDate.getTime();
              });
              return (
                <div key={p.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${isActive ? 'bg-[#FFF3E8]' : 'bg-gray-50'}`}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-[#d0502a] animate-pulse' : isPast ? 'bg-gray-300' : 'bg-gray-200'}`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-gray-700">{p.label}</span>
                    <span className="text-[10px] text-gray-400 ml-1.5">
                      {p.startDate.slice(5)} ~ {endD.getMonth() + 1}/{endD.getDate()}
                    </span>
                  </div>
                  <div className="shrink-0">
                    {isActive && currentWeek && (
                      <span className="text-[10px] font-bold text-[#d0502a]">W{currentWeek.weekNum}</span>
                    )}
                    {isPast && <span className="text-[10px] text-gray-400">已完成</span>}
                    {!isActive && !isPast && <span className="text-[10px] text-gray-400">未開始</span>}
                  </div>
                  {/* Quick export for completed periods */}
                  {isPast && periodWeeks.length >= 2 && (
                    <button
                      onClick={() => handleExportPeriod(p)}
                      disabled={exportingProgram === p.id}
                      className="text-[10px] font-semibold text-[#d0502a] px-2 py-0.5 rounded bg-[#FFF3E8] active:bg-[#FFE8D6] disabled:opacity-50 shrink-0"
                    >
                      {exportingProgram === p.id ? '...' : '匯出'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {showSettings && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-3">
            {/* Existing periods with timeline */}
            {periods.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-gray-500 font-medium">已設定的課程</p>
                {periods.map((p) => {
                  const plan = COURSE_PLANS.find(c => c.id === p.planId);
                  const endD = new Date(p.startDate + 'T00:00:00');
                  endD.setDate(endD.getDate() + p.weeks * 7 - 1);
                  const periodWeeks = weeks.filter(w => w.periodId === p.id);
                  return (
                    <div key={p.id} className={`rounded-xl p-3 border ${plan?.isMain ? 'bg-[#FFF8F0] border-[#efa93b]/30' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-gray-700">{p.label}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${plan?.isMain ? 'bg-[#d0502a]/10 text-[#d0502a]' : 'bg-[#efa93b]/20 text-[#c05828]'}`}>
                              {plan?.isMain ? '主方案' : '延長方案'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {p.startDate} ~ {endD.getFullYear()}/{endD.getMonth() + 1}/{endD.getDate()}（{p.weeks} 週）
                          </p>
                        </div>
                        <button
                          onClick={() => removePeriod(p.id)}
                          className="text-xs text-gray-400 px-2 py-1 rounded-lg active:bg-gray-200"
                        >
                          ✕
                        </button>
                      </div>
                      {periodWeeks.length >= 2 && (
                        <button
                          onClick={() => handleExportPeriod(p)}
                          disabled={exportingProgram === p.id}
                          className="w-full mt-2 py-2 text-xs font-semibold text-white rounded-lg disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg, #d0502a, #efa93b)' }}
                        >
                          {exportingProgram === p.id ? '匯出中...' : `📤 匯出 ${p.label} 總覽（${periodWeeks.length} 週）`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add new period / restart */}
            {!addingPeriod ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setAddingPeriod(true)}
                  className="flex-1 py-2.5 text-sm font-medium text-[#d0502a] border-2 border-dashed border-[#efa93b]/40 rounded-xl active:bg-[#FFF8F0]"
                >
                  {!existingMain ? '+ 新增主方案' : !hasExtension ? '+ 加購延長方案' : '+ 新增課程'}
                </button>
                {periods.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('確定要重新開始嗎？\n\n這會清除所有課程設定。\n（飲食與行為紀錄不會被刪除）')) {
                        savePeriods([]);
                        setPeriodsState([]);
                      }
                    }}
                    className="py-2.5 px-3 text-sm font-medium text-gray-500 border-2 border-dashed border-gray-200 rounded-xl active:bg-gray-50"
                  >
                    重新開始
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-[#FFF8F0] rounded-xl p-3 border border-[#efa93b]/30 flex flex-col gap-3">
                {/* Main plans — only show if no main plan exists */}
                {!existingMain && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-2">選擇主方案</p>
                    <div className="grid grid-cols-2 gap-2">
                      {COURSE_PLANS.filter(p => p.isMain).map((plan) => (
                        <button
                          key={plan.id}
                          onClick={() => setNewPlanId(plan.id)}
                          className={`p-2.5 rounded-xl text-left transition-all border ${
                            newPlanId === plan.id
                              ? 'border-[#d0502a] bg-[#FFF3E8]'
                              : 'border-gray-200 bg-white active:bg-gray-50'
                          }`}
                        >
                          <p className={`text-xs font-bold ${newPlanId === plan.id ? 'text-[#d0502a]' : 'text-gray-700'}`}>
                            {plan.label}
                          </p>
                          <p className="text-xs text-gray-400">{plan.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Extension plan — only show matching extension based on main plan */}
                {existingMain && allowedExtension && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-2">
                      延長方案（搭配 {existingMain.label.split(' ')[0]}）
                    </p>
                    {(() => {
                      const plan = COURSE_PLANS.find(p => p.id === allowedExtension)!;
                      return (
                        <button
                          onClick={() => {
                            setNewPlanId(plan.id);
                            if (!newStartDate) setNewStartDate(suggestedExtensionStart());
                          }}
                          className={`w-full p-2.5 rounded-xl text-left transition-all border ${
                            newPlanId === plan.id
                              ? 'border-[#efa93b] bg-[#FFFBF0]'
                              : 'border-gray-200 bg-white active:bg-gray-50'
                          }`}
                        >
                          <p className={`text-xs font-bold ${newPlanId === plan.id ? 'text-[#c05828]' : 'text-gray-700'}`}>
                            {plan.label}
                          </p>
                          <p className="text-xs text-gray-400">{plan.desc}</p>
                        </button>
                      );
                    })()}
                    <p className="text-[10px] text-gray-400 mt-1.5">
                      {hasExtension ? '可多次加購延長方案，週數會持續累計' : `搭配 ${existingMain.label.split(' ')[0]}，可延長 8 週`}
                    </p>
                  </div>
                )}
                {/* If has main but no allowed extension (shouldn't happen, but safe) */}
                {existingMain && !allowedExtension && (
                  <p className="text-xs text-gray-500">目前的主方案無法搭配延長方案。</p>
                )}
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-2">
                    課程起始日{newPlanId ? ` · ${COURSE_PLANS.find(p => p.id === newPlanId)?.weeks} 週` : ''}
                  </p>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#efa93b]/50"
                    style={{ fontSize: '16px' }}
                  />
                  {newPlanId && newStartDate && (() => {
                    const plan = COURSE_PLANS.find(p => p.id === newPlanId);
                    if (!plan) return null;
                    const end = new Date(newStartDate + 'T00:00:00');
                    end.setDate(end.getDate() + plan.weeks * 7 - 1);
                    return (
                      <p className="text-xs text-gray-400 mt-1.5">
                        結束日：{end.getFullYear()}/{end.getMonth() + 1}/{end.getDate()}
                      </p>
                    );
                  })()}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setAddingPeriod(false); setNewPlanId(null); setNewStartDate(''); }}
                    className="flex-1 py-2.5 text-xs text-gray-500 rounded-lg bg-gray-100 active:bg-gray-200"
                  >
                    取消
                  </button>
                  <button
                    onClick={addPeriod}
                    disabled={!newPlanId || !newStartDate}
                    className="flex-1 py-2.5 text-xs font-bold text-white rounded-lg bg-[#d0502a] disabled:opacity-40 active:opacity-85"
                  >
                    確認新增
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expandable weekly archive — latest first */}
      {[...weeks].reverse().map((week) => {
        const wk = weekKey(week);
        const isOpen = expandedKey === wk;
        const fmtDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
        const dailyMap = groupByDate(week.records);
        const weekLabel = week.isPractice
          ? '練習'
          : `${week.periodLabel ? week.periodLabel.split(' ')[0] + ' ' : ''}W${week.weekNum}`;

        return (
          <div key={wk} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${week.isPractice ? 'border-gray-200 opacity-80' : 'border-gray-100'}`}>
            {/* Week header — clickable */}
            <button
              onClick={() => setExpandedKey(isOpen ? null : wk)}
              className="w-full flex items-center justify-between p-3 active:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <span className={`text-white text-xs font-bold px-2 py-0.5 rounded-full ${week.isPractice ? 'bg-gray-400' : 'bg-[#d0502a]'}`}>
                  {week.isPractice ? '練習' : `W${week.weekNum}`}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {fmtDate(week.startDate)} ~ {fmtDate(new Date(week.endDate.getTime() - 86400000))}
                </span>
                {week.periodLabel && !week.isPractice && (
                  <span className="text-[10px] text-gray-400">{week.periodLabel.split(' ')[0]}</span>
                )}
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

                    {/* Action buttons — not for practice weeks */}
                    {!week.isPractice && (
                      <div className="space-y-1.5 mt-1">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCopyData(week)}
                            className="py-2.5 px-3 text-sm font-semibold text-[#d0502a] bg-[#FFF3E8] rounded-lg active:bg-[#FFE8D6]"
                          >
                            📋 複製數據
                          </button>
                          <button
                            onClick={() => handleDownloadCsv(week)}
                            className="py-2.5 px-3 text-sm font-semibold text-[#1B4332] bg-[#E2EFDA] rounded-lg active:bg-[#C6EFCE]"
                          >
                            📥 下載 CSV
                          </button>
                        </div>
                        <button
                          onClick={() => handleExportWeek(week)}
                          disabled={exportingWeek === wk}
                          className="w-full py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg active:bg-gray-200 disabled:opacity-50"
                        >
                          {exportingWeek === wk ? '匯出中...' : `📤 匯出 W${week.globalWeekNum || week.weekNum} 週報`}
                        </button>
                      </div>
                    )}
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
      ? meal.items.map(i => `${i.name}（${sortTags(i.tags).map(t => `${t.tag}${t.qty}份`).join('、')}）`).join('、')
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
  if (beh.exercise === true) {
    const ex1 = beh.exerciseNote || '有';
    const ex2 = beh.exercise2Note ? `+${beh.exercise2Note}` : '';
    const dur1 = beh.exerciseDuration ? `${beh.exerciseDuration}分` : '';
    const dur2 = beh.exercise2Duration ? `+${beh.exercise2Duration}分` : '';
    parts.push(`🏃${ex1}${ex2} ${dur1}${dur2}`.trim());
  }
  if (beh.stepsCount) parts.push(`🚶${Number(beh.stepsCount).toLocaleString()}步`);
  if (beh.sleep) parts.push(`😴${beh.sleep}${beh.sleepQuality ? `(${beh.sleepQuality})` : ''}${beh.sleepNote?.trim() ? ` ${beh.sleepNote}` : ''}`);
  if (beh.bowel) parts.push(`🚽${beh.bowel}${beh.bowelNote?.trim() ? `(${beh.bowelNote})` : ''}`);
  if (beh.junkFood === true) parts.push('🚫有吃垃圾食物');
  else if (beh.junkFood === false) parts.push('🚫沒吃垃圾食物');
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

  // Average steps
  const stepRecords = behaviors.filter(b => b.stepsCount && Number(b.stepsCount) > 0);
  const avgSteps = stepRecords.length > 0
    ? Math.round(stepRecords.reduce((s, b) => s + Number(b.stepsCount), 0) / stepRecords.length)
    : null;

  // Bowel summary
  const bowelRecords = behaviors.filter(b => b.bowel != null);
  const bowelYes = bowelRecords.filter(b => b.bowel !== '沒有').length;

  return (
    <div className="bg-[#FFF8F0] rounded-lg p-2.5 mt-1">
      <p className="text-xs font-semibold text-[#d0502a] mb-1">本週小結</p>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-600">
        <span>📅 記錄 {uniqueDays} 天</span>
        <span>🍽 飲食 {meals.length} 筆</span>
        <span>📋 行為 {behaviors.length} 筆</span>
        {avgWater !== null && <span>💧 平均喝水 {avgWater}ml</span>}
        {exerciseDays > 0 && <span>🏃 運動 {exerciseDays} 天</span>}
        {avgSteps !== null && <span>🚶 平均 {avgSteps.toLocaleString()} 步</span>}
        {bowelRecords.length > 0 && <span>🚽 排便 {bowelYes}/{bowelRecords.length} 天</span>}
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
