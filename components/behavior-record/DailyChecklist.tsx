import React, { useState, useEffect, useRef } from 'react';
import { SegmentedControl } from '../shared/SegmentedControl';
import { SLEEP_LEVELS, SLEEP_QUALITIES, BOWEL_OPTIONS, WATER_PRESETS, CARD_THEMES, toDateString } from '../../constants';
import { saveRecord } from '../../services/storage';
import { composeBehaviorCard } from '../../services/canvasExport';
import { ExportActions } from '../shared/ExportActions';
import { saveBehaviorDraft, loadBehaviorDraft, clearBehaviorDraft } from '../../services/draftStorage';
import type { BehaviorRecord, SleepLevel, SleepQuality, BowelCount } from '../../types';

interface DailyChecklistProps {
  onRecordSaved: () => void;
}

export const DailyChecklist: React.FC<DailyChecklistProps> = ({ onRecordSaved }) => {
  // Load draft on mount
  const draft = useRef(loadBehaviorDraft());

  const [recordDate, setRecordDate] = useState(draft.current?.recordDate ?? toDateString(new Date()));
  const [waterMl, setWaterMl] = useState<number | null>(draft.current?.waterMl ?? null);
  const [customWater, setCustomWater] = useState(draft.current?.customWater ?? '');
  const [proteinCups, setProteinCups] = useState<number | null>(draft.current?.proteinCups ?? null);
  const [showProteinDetail, setShowProteinDetail] = useState(false);
  const [proteinGrams, setProteinGrams] = useState(draft.current?.proteinGrams ?? '');
  const [exercise, setExercise] = useState<boolean | null>(draft.current?.exercise ?? null);
  const [exerciseNote, setExerciseNote] = useState(draft.current?.exerciseNote ?? '');
  const [exerciseDuration, setExerciseDuration] = useState(draft.current?.exerciseDuration ?? '');
  const [stepsCount, setStepsCount] = useState(draft.current?.stepsCount ?? '');
  const [sleep, setSleep] = useState<SleepLevel | null>((draft.current?.sleep as SleepLevel) ?? null);
  const [sleepQuality, setSleepQuality] = useState<SleepQuality | null>((draft.current?.sleepQuality as SleepQuality) ?? null);
  const [bowel, setBowel] = useState<BowelCount | null>((draft.current?.bowel as BowelCount) ?? null);
  const [generalNote, setGeneralNote] = useState(draft.current?.generalNote ?? '');
  const [cardTheme, setCardTheme] = useState<BehaviorRecord['cardTheme']>((draft.current?.cardTheme as BehaviorRecord['cardTheme']) ?? 'dark');

  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-save draft on every change
  useEffect(() => {
    if (cardImageUrl) return; // Don't save after submission
    saveBehaviorDraft({
      recordDate, waterMl, customWater, proteinCups, proteinGrams,
      exercise, exerciseNote, exerciseDuration, stepsCount,
      sleep, sleepQuality, bowel, generalNote, cardTheme,
    });
  }, [recordDate, waterMl, customWater, proteinCups, proteinGrams, exercise, exerciseNote, exerciseDuration, stepsCount, sleep, sleepQuality, bowel, generalNote, cardTheme, cardImageUrl]);

  const hasAnyValue = waterMl !== null || proteinCups !== null || exercise !== null ||
    stepsCount !== '' || sleep !== null || bowel !== null;

  const handleWaterPreset = (ml: number) => {
    setWaterMl(ml);
    setCustomWater('');
  };

  const handleCustomWater = (val: string) => {
    setCustomWater(val);
    const n = parseInt(val);
    setWaterMl(isNaN(n) ? null : n);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const now = new Date();
    const record: BehaviorRecord = {
      id: now.toISOString(),
      type: 'behavior',
      timestamp: now.getTime(),
      recordDate,
      waterMl, proteinCups, proteinGrams,
      exercise, exerciseNote, exerciseDuration,
      stepsCount, sleep, sleepQuality, bowel, generalNote, cardTheme,
    };
    await saveRecord(record);
    clearBehaviorDraft();
    const imageUrl = await composeBehaviorCard(record);
    setCardImageUrl(imageUrl);
    setIsSubmitting(false);
    onRecordSaved();
  };

  const reset = () => {
    setRecordDate(toDateString(new Date()));
    setWaterMl(null); setCustomWater('');
    setProteinCups(null); setShowProteinDetail(false); setProteinGrams('');
    setExercise(null); setExerciseNote(''); setExerciseDuration('');
    setStepsCount(''); setSleep(null); setSleepQuality(null); setBowel(null);
    setGeneralNote(''); setCardTheme('dark'); setCardImageUrl(null);
    clearBehaviorDraft();
  };

  if (cardImageUrl) {
    return (
      <div className="max-w-lg mx-auto px-4 pb-6">
        <h2 className="text-xl font-bold text-gray-800 text-center mb-2">行為指標紀錄卡</h2>
        <p className="text-center text-sm text-gray-400 mb-4">
          分享到限動，讓大家看到你的堅持與成長
        </p>
        <div className="rounded-xl overflow-hidden shadow-lg mb-4">
          <img src={cardImageUrl} alt="行為指標" className="w-full" />
        </div>
        <ExportActions
          imageDataUrl={cardImageUrl}
          fileName={`BeBetter行為指標-${recordDate}.jpg`}
          onNewRecord={reset}
        />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">行為指標紀錄表</h2>
        <p className="text-gray-500 text-sm mt-1">每天記錄，每天進步一點點</p>
      </div>

      <div className="flex flex-col gap-4">

        {/* 紀錄日期 */}
        <Card icon="📅" label="紀錄日期">
          <input
            type="date"
            value={recordDate}
            onChange={(e) => setRecordDate(e.target.value)}
            max={toDateString(new Date())}
            className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#efa93b]/50 focus:border-[#efa93b]"
          />
        </Card>

        {/* 喝水量 (ml) */}
        <Card icon="💧" label="喝水量" subLabel="毫升 (ml)">
          <div className="flex flex-wrap gap-2 mb-2">
            {WATER_PRESETS.map((ml) => (
              <button
                key={ml}
                onClick={() => handleWaterPreset(ml)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  waterMl === ml && customWater === ''
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                }`}
              >
                {ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={customWater}
              onChange={(e) => handleCustomWater(e.target.value)}
              placeholder="自訂毫升數"
              className="flex-1 p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              min="0"
            />
            <span className="text-sm text-gray-500">ml</span>
          </div>
        </Card>

        {/* 高蛋白 */}
        <Card icon="🥛" label="高蛋白">
          <SegmentedControl
            options={['0杯', '1杯', '2杯']}
            value={proteinCups !== null ? `${proteinCups}杯` : null}
            onChange={(v) => setProteinCups(parseInt(v))}
            colorMap={{ '0杯': 'bg-gray-400 text-white', '1杯': 'bg-[#d0502a] text-white', '2杯': 'bg-[#d0502a] text-white' }}
          />
          {!showProteinDetail ? (
            <button
              onClick={() => setShowProteinDetail(true)}
              className="mt-2 text-xs text-gray-400 underline"
            >
              補充每杯克數（選填）
            </button>
          ) : (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                value={proteinGrams}
                onChange={(e) => setProteinGrams(e.target.value)}
                placeholder="每杯幾克蛋白質"
                className="flex-1 p-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#efa93b]/50"
                min="0"
              />
              <span className="text-xs text-gray-500">克/杯</span>
            </div>
          )}
        </Card>

        {/* 運動 */}
        <Card icon="🏃" label="運動">
          <div className="flex gap-2 mb-2">
            <ToggleBtn label="有做" active={exercise === true} onClick={() => setExercise(true)} activeClass="bg-[#d0502a] text-white" />
            <ToggleBtn label="沒有" active={exercise === false} onClick={() => setExercise(false)} activeClass="bg-red-400 text-white" />
          </div>
          {exercise === true && (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={exerciseNote}
                onChange={(e) => setExerciseNote(e.target.value)}
                placeholder="做什麼運動？"
                className="flex-1 p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#efa93b]/50"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={exerciseDuration}
                  onChange={(e) => setExerciseDuration(e.target.value)}
                  placeholder="幾分鐘"
                  className="w-20 p-2.5 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#efa93b]/50"
                  min="0"
                />
                <span className="text-sm text-gray-500">分鐘</span>
              </div>
            </div>
          )}
        </Card>

        {/* 走路步數 */}
        <Card icon="🚶" label="走路步數">
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={stepsCount}
              onChange={(e) => setStepsCount(e.target.value)}
              placeholder="輸入步數"
              className="flex-1 p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#efa93b]/50"
              min="0"
            />
            <span className="text-sm text-gray-500 whitespace-nowrap">步</span>
          </div>
        </Card>

        {/* 睡眠 */}
        <Card icon="😴" label="睡眠">
          <p className="text-xs text-gray-400 mb-2">睡眠時數</p>
          <SegmentedControl
            options={SLEEP_LEVELS}
            value={sleep}
            onChange={setSleep}
            colorMap={{ '<6hr': 'bg-red-500 text-white', '6-7hr': 'bg-yellow-500 text-white', '7-8hr': 'bg-[#d0502a] text-white', '8hr+': 'bg-[#d0502a] text-white' }}
          />
          <p className="text-xs text-gray-400 mt-3 mb-2">睡眠品質</p>
          <SegmentedControl
            options={SLEEP_QUALITIES}
            value={sleepQuality}
            onChange={setSleepQuality}
            colorMap={{ '很好': 'bg-[#d0502a] text-white', '還好': 'bg-yellow-500 text-white', '不太好': 'bg-orange-500 text-white', '很差': 'bg-red-500 text-white' }}
          />
        </Card>

        {/* 排便 */}
        <Card icon="🚽" label="排便">
          <SegmentedControl
            options={BOWEL_OPTIONS}
            value={bowel}
            onChange={setBowel}
            colorMap={{ '沒有': 'bg-gray-400 text-white', '1次': 'bg-[#d0502a] text-white', '2次': 'bg-[#d0502a] text-white', '3次以上': 'bg-blue-500 text-white' }}
          />
        </Card>

        {/* 卡片配色 */}
        <Card icon="🎨" label="卡片配色">
          <div className="flex gap-2">
            {CARD_THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setCardTheme(theme.id)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                  cardTheme === theme.id
                    ? 'ring-2 ring-offset-2 ring-[#d0502a]'
                    : ''
                }`}
                style={{ backgroundColor: theme.bg, color: theme.text }}
              >
                {theme.label}
              </button>
            ))}
          </div>
        </Card>

        {/* 今日備註 */}
        <Card icon="📝" label="今日備註" subLabel="給營養師的補充說明">
          <textarea
            value={generalNote}
            onChange={(e) => setGeneralNote(e.target.value)}
            rows={3}
            placeholder="例：今天外出應酬、感冒不舒服、壓力很大、生理期..."
            className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#efa93b]/50"
          />
        </Card>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!hasAnyValue || isSubmitting}
        className="w-full mt-6 py-4 text-white text-lg font-bold rounded-xl transition-colors disabled:bg-gray-200 disabled:text-gray-400"
        style={{ background: hasAnyValue && !isSubmitting ? 'linear-gradient(135deg, #d0502a, #efa93b)' : undefined }}
      >
        {isSubmitting ? '儲存中...' : '完成紀錄'}
      </button>
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const Card: React.FC<{ icon: string; label: string; subLabel?: string; children: React.ReactNode }> = ({
  icon, label, subLabel, children,
}) => (
  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xl">{icon}</span>
      <span className="font-semibold text-gray-700">{label}</span>
      {subLabel && <span className="text-xs text-gray-400">{subLabel}</span>}
    </div>
    {children}
  </div>
);

const ToggleBtn: React.FC<{ label: string; active: boolean; onClick: () => void; activeClass: string }> = ({
  label, active, onClick, activeClass,
}) => (
  <button
    onClick={onClick}
    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
      active ? activeClass : 'bg-gray-100 text-gray-600 active:bg-gray-200'
    }`}
  >
    {label}
  </button>
);
