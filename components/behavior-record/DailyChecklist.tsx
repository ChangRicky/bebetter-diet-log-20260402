import React, { useState, useEffect, useRef } from 'react';
import { SegmentedControl } from '../shared/SegmentedControl';
import { SLEEP_LEVELS, SLEEP_QUALITIES, BOWEL_OPTIONS, WATER_PRESETS, CARD_THEMES, toDateString } from '../../constants';
import { saveRecord } from '../../services/storage';
import { composeBehaviorCard } from '../../services/canvasExport';
import { getLiffUserName } from '../../services/liffService';
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
  const [exercise2Note, setExercise2Note] = useState(draft.current?.exercise2Note ?? '');
  const [exercise2Duration, setExercise2Duration] = useState(draft.current?.exercise2Duration ?? '');
  const [showExercise2, setShowExercise2] = useState(!!(draft.current?.exercise2Note || draft.current?.exercise2Duration));
  const [stepsCount, setStepsCount] = useState(draft.current?.stepsCount ?? '');
  const [sleep, setSleep] = useState<SleepLevel | null>((draft.current?.sleep as SleepLevel) ?? null);
  const [sleepQuality, setSleepQuality] = useState<SleepQuality | null>((draft.current?.sleepQuality as SleepQuality) ?? null);
  const [bedtime, setBedtime] = useState(draft.current?.bedtime ?? '');
  const [sleepNote, setSleepNote] = useState(draft.current?.sleepNote ?? '');
  const [bowel, setBowel] = useState<BowelCount | null>((draft.current?.bowel as BowelCount) ?? null);
  const [bowelNote, setBowelNote] = useState(draft.current?.bowelNote ?? '');
  const [junkFood, setJunkFood] = useState<boolean | null>(draft.current?.junkFood ?? null);
  const [supplements, setSupplements] = useState(draft.current?.supplements ?? '');
  const [generalNote, setGeneralNote] = useState(draft.current?.generalNote ?? '');
  const [cardTheme, setCardTheme] = useState<BehaviorRecord['cardTheme']>((draft.current?.cardTheme as BehaviorRecord['cardTheme']) ?? 'dark');

  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-save draft on every change
  useEffect(() => {
    if (cardImageUrl) return; // Don't save after submission
    saveBehaviorDraft({
      recordDate, waterMl, customWater, proteinCups, proteinGrams,
      exercise, exerciseNote, exerciseDuration, exercise2Note, exercise2Duration, stepsCount,
      sleep, sleepQuality, bedtime, sleepNote, bowel, bowelNote, junkFood, supplements, generalNote, cardTheme,
    });
  }, [recordDate, waterMl, customWater, proteinCups, proteinGrams, exercise, exerciseNote, exerciseDuration, exercise2Note, exercise2Duration, stepsCount, sleep, sleepQuality, bedtime, sleepNote, bowel, bowelNote, junkFood, supplements, generalNote, cardTheme, cardImageUrl]);

  const hasAnyValue = waterMl !== null || proteinCups !== null || exercise !== null ||
    stepsCount !== '' || sleep !== null || bowel !== null || junkFood !== null;

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
      exercise2Note, exercise2Duration,
      stepsCount, sleep, sleepQuality, bedtime: bedtime || '',
      sleepNote: sleepNote || '',
      bowel, bowelNote: bowelNote || '', junkFood, supplements: supplements || '', generalNote, cardTheme,
    };

    // Step 1: save record
    try {
      await saveRecord(record);
      clearBehaviorDraft();
      onRecordSaved();
    } catch (err) {
      console.error('Save failed:', err);
      alert('儲存失敗，請再試一次');
      setIsSubmitting(false);
      return;
    }

    // Step 2: generate card image (non-blocking — record is already saved)
    try {
      const imageUrl = await composeBehaviorCard(record, getLiffUserName());
      setCardImageUrl(imageUrl);
    } catch (err) {
      console.error('Card generation failed:', err);
      // Record saved successfully, just skip preview
      setCardImageUrl('error');
    }
    setIsSubmitting(false);
  };

  const reset = () => {
    setRecordDate(toDateString(new Date()));
    setWaterMl(null); setCustomWater('');
    setProteinCups(null); setShowProteinDetail(false); setProteinGrams('');
    setExercise(null); setExerciseNote(''); setExerciseDuration('');
    setExercise2Note(''); setExercise2Duration(''); setShowExercise2(false);
    setStepsCount(''); setSleep(null); setSleepQuality(null); setBedtime(''); setSleepNote('');
    setBowel(null); setBowelNote(''); setJunkFood(null); setSupplements(''); setGeneralNote(''); setCardTheme('dark'); setCardImageUrl(null);
    clearBehaviorDraft();
  };

  // Warn before closing if there's unsaved data
  // IMPORTANT: This useEffect MUST be above any conditional return to respect React Hooks rules
  useEffect(() => {
    if (!hasAnyValue || cardImageUrl) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasAnyValue, cardImageUrl]);

  if (cardImageUrl) {
    const hasValidImage = cardImageUrl !== 'error';
    return (
      <div className="max-w-lg mx-auto px-4 pb-6">
        <h2 className="text-xl font-bold text-gray-800 text-center mb-2">
          {hasValidImage ? '行為指標紀錄卡' : '紀錄已儲存！'}
        </h2>
        <p className="text-center text-sm text-gray-400 mb-4">
          {hasValidImage ? '分享到限動，讓大家看到你的堅持與成長' : '圖片產生失敗，但紀錄已成功儲存'}
        </p>
        {hasValidImage && (
          <div className="rounded-xl overflow-hidden shadow-lg mb-4">
            <img src={cardImageUrl} alt="行為指標" className="w-full" />
          </div>
        )}
        <ExportActions
          imageDataUrl={hasValidImage ? cardImageUrl : null}
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
        {hasAnyValue && (
          <p className="text-xs text-green-500 mt-1">💾 已自動暫存，關掉再回來不會消失</p>
        )}
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
          <p className="text-xs text-gray-500 mb-2">以一整天加起來的總量為主，不同類型可分開填寫</p>
          <div className="flex gap-2 mb-2">
            <ToggleBtn label="有做" active={exercise === true} onClick={() => setExercise(true)} activeClass="bg-[#d0502a] text-white" />
            <ToggleBtn label="沒有" active={exercise === false} onClick={() => setExercise(false)} activeClass="bg-red-400 text-white" />
          </div>
          {exercise === true && (
            <>
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={exerciseNote}
                  onChange={(e) => setExerciseNote(e.target.value)}
                  placeholder="運動類型（例：快走、有氧）"
                  className="flex-1 p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#efa93b]/50"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={exerciseDuration}
                    onChange={(e) => setExerciseDuration(e.target.value)}
                    placeholder="分鐘"
                    className="w-20 p-2.5 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#efa93b]/50"
                    min="0"
                  />
                  <span className="text-sm text-gray-500">分鐘</span>
                </div>
              </div>
              {!showExercise2 ? (
                <button
                  onClick={() => setShowExercise2(true)}
                  className="mt-2 text-xs text-[#d0502a] font-medium underline"
                >
                  + 新增第二種運動
                </button>
              ) : (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={exercise2Note}
                    onChange={(e) => setExercise2Note(e.target.value)}
                    placeholder="第二種運動（例：重訓）"
                    className="flex-1 p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#efa93b]/50"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={exercise2Duration}
                      onChange={(e) => setExercise2Duration(e.target.value)}
                      placeholder="分鐘"
                      className="w-20 p-2.5 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#efa93b]/50"
                      min="0"
                    />
                    <span className="text-sm text-gray-500">分鐘</span>
                  </div>
                </div>
              )}
            </>
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
          <p className="text-xs text-gray-600 font-medium mb-2">睡眠時數</p>
          <SegmentedControl
            options={SLEEP_LEVELS}
            value={sleep}
            onChange={setSleep}
            colorMap={{ '<6hr': 'bg-red-500 text-white', '6-7hr': 'bg-yellow-500 text-white', '7-8hr': 'bg-[#d0502a] text-white', '8hr+': 'bg-[#d0502a] text-white' }}
          />
          <p className="text-xs text-gray-600 font-medium mt-3 mb-2">睡眠品質</p>
          <SegmentedControl
            options={SLEEP_QUALITIES}
            value={sleepQuality}
            onChange={setSleepQuality}
            colorMap={{ '很好': 'bg-[#d0502a] text-white', '不錯': 'bg-[#d0502a] text-white', '還好': 'bg-yellow-500 text-white', '不太好': 'bg-orange-500 text-white', '很差': 'bg-red-500 text-white' }}
          />
          <p className="text-xs text-gray-600 font-medium mt-3 mb-2">就寢時間</p>
          <input
            type="time"
            value={bedtime}
            onChange={(e) => setBedtime(e.target.value)}
            className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#efa93b]/50 focus:border-[#efa93b]"
            style={{ fontSize: '16px' }}
          />
          <p className="text-xs text-gray-600 font-medium mt-3 mb-2">睡眠備註</p>
          <input
            type="text"
            value={sleepNote}
            onChange={(e) => setSleepNote(e.target.value)}
            placeholder="例：淺眠、做夢、中途醒來、失眠..."
            className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#efa93b]/50"
            style={{ fontSize: '16px' }}
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
          {bowel && bowel !== '沒有' && (
            <input
              type="text"
              value={bowelNote}
              onChange={(e) => setBowelNote(e.target.value)}
              placeholder="排便備註（例：軟便、硬便、正常）"
              className="w-full mt-2 p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#efa93b]/50"
              style={{ fontSize: '16px' }}
            />
          )}
        </Card>

        {/* 垃圾食物 */}
        <Card icon="🚫" label="垃圾食物" subLabel="今天有沒有吃？">
          <div className="flex gap-2">
            <ToggleBtn label="沒有吃" active={junkFood === false} onClick={() => setJunkFood(false)} activeClass="bg-[#d0502a] text-white" />
            <ToggleBtn label="有吃" active={junkFood === true} onClick={() => setJunkFood(true)} activeClass="bg-red-400 text-white" />
          </div>
        </Card>

        {/* 保健品/藥物 */}
        <Card icon="💊" label="保健品 / 藥物" subLabel="選填">
          <textarea
            value={supplements}
            onChange={(e) => setSupplements(e.target.value)}
            rows={2}
            placeholder="例：B群、魚油、維他命D、益生菌..."
            className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#efa93b]/50"
            style={{ fontSize: '16px' }}
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
      {subLabel && <span className="text-xs text-gray-500">{subLabel}</span>}
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
