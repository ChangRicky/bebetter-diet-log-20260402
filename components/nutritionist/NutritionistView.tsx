import React, { useMemo, useState } from 'react';

/**
 * NutritionistView — 營養師專用檢視模式
 *
 * 流程：
 * 1. 學生在 App 中複製數據，貼到 LINE 傳給營養師
 * 2. 營養師開啟 ?mode=nutritionist，把學生的訊息整段貼進來
 * 3. 立即在瀏覽器看到 9 項評分、總分、等級
 *
 * 完全跳過 Excel / 公式 / 格式轉換問題。
 * 解析器容錯：空格、Tab、逗號都能處理。
 */

interface DayData {
  date: string;
  steps: number | null;
  exerciseCount: number | null;
  exerciseMin: number | null;
  bowel: number | null;
  water: number | null;
  sleep: number | null;
  protein: number | null;
  powder: number | null;
  veg: number | null;
  diet: 'Y' | 'N' | null;
  junk: 'Y' | 'N' | null;
}

interface ParseResult {
  title: string;
  days: DayData[];
}

const COLUMNS = ['date', 'steps', 'exercise', 'bowel', 'water', 'sleep', 'protein', 'powder', 'veg', 'diet', 'junk'] as const;

function normalizeLine(line: string): string[] {
  // Accept comma, tab, or 2+ spaces as separator (forgiving against LINE mangling)
  return line
    .replace(/\t/g, ',')
    .replace(/，/g, ',')
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function parseExercise(s: string): { count: number | null; min: number | null } {
  // Format "1(30)" or "0(0)" or just "30"
  if (!s) return { count: null, min: null };
  const m = s.match(/^(\d+)\s*\(\s*(\d+)\s*\)$/);
  if (m) return { count: Number(m[1]), min: Number(m[2]) };
  const n = Number(s);
  if (!isNaN(n)) return { count: n > 0 ? 1 : 0, min: n };
  return { count: null, min: null };
}

function num(s: string): number | null {
  if (!s) return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

function parseInput(text: string): ParseResult {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let title = '';
  const days: DayData[] = [];

  for (const line of lines) {
    // Title line: 【...】
    if (line.startsWith('【')) {
      title = line.replace(/[【】]/g, '');
      continue;
    }
    // Skip column header
    if (line.includes('日期') && line.includes('步數')) continue;

    const cells = normalizeLine(line);
    if (cells.length < 5) continue;
    // First cell must look like date (M/D)
    if (!/^\d{1,2}\/\d{1,2}$/.test(cells[0])) continue;

    while (cells.length < COLUMNS.length) cells.push('');
    const ex = parseExercise(cells[2]);
    days.push({
      date: cells[0],
      steps: num(cells[1]),
      exerciseCount: ex.count,
      exerciseMin: ex.min,
      bowel: num(cells[3]),
      water: num(cells[4]),
      sleep: num(cells[5]),
      protein: num(cells[6]),
      powder: num(cells[7]),
      veg: num(cells[8]),
      diet: cells[9] === 'Y' ? 'Y' : cells[9] === 'N' ? 'N' : null,
      junk: cells[10] === 'Y' ? 'Y' : cells[10] === 'N' ? 'N' : null,
    });
  }

  return { title, days };
}

// ─── Scoring (100 pt scale) ──────────────────────────────────────
// steps 10, exercise 18, bowel 7, water 9, sleep 10,
// protein 15, vegetables 10, diet record 12, junk food 9 = 100

interface ScoreItem {
  label: string;
  max: number;
  score: number;
  detail: string;
}

function avg(nums: (number | null)[]): number | null {
  const xs = nums.filter((n): n is number => n != null);
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function scoreFrom(days: DayData[]): { items: ScoreItem[]; total: number; grade: string } {
  const items: ScoreItem[] = [];

  // 1. Steps (10pt) — target avg 8000+
  const avgSteps = avg(days.map(d => d.steps));
  items.push({
    label: '走路步數',
    max: 10,
    score: avgSteps == null ? 0 : Math.min(10, Math.round((avgSteps / 8000) * 10)),
    detail: avgSteps == null ? '無資料' : `平均 ${Math.round(avgSteps)} 步/日`,
  });

  // 2. Exercise (18pt) — target 150 min/week
  const totalMin = days.reduce((s, d) => s + (d.exerciseMin ?? 0), 0);
  const exerciseDays = days.filter(d => (d.exerciseMin ?? 0) > 0).length;
  items.push({
    label: '運動',
    max: 18,
    score: Math.min(18, Math.round((totalMin / 150) * 18)),
    detail: `${exerciseDays} 天運動，共 ${totalMin} 分鐘`,
  });

  // 3. Bowel (7pt) — number of days bowel > 0
  const bowelDays = days.filter(d => (d.bowel ?? 0) > 0).length;
  items.push({
    label: '排便',
    max: 7,
    score: Math.min(7, Math.round((bowelDays / 7) * 7)),
    detail: `${bowelDays}/7 天有排便`,
  });

  // 4. Water (9pt) — target avg 2000ml
  const avgWater = avg(days.map(d => d.water));
  items.push({
    label: '喝水',
    max: 9,
    score: avgWater == null ? 0 : Math.min(9, Math.round((avgWater / 2000) * 9)),
    detail: avgWater == null ? '無資料' : `平均 ${Math.round(avgWater)} ml/日`,
  });

  // 5. Sleep (10pt) — quality 1-5, avg / 5 * 10
  const avgSleep = avg(days.map(d => d.sleep));
  items.push({
    label: '睡眠',
    max: 10,
    score: avgSleep == null ? 0 : Math.min(10, Math.round((avgSleep / 5) * 10)),
    detail: avgSleep == null ? '無資料' : `平均品質 ${avgSleep.toFixed(1)}/5`,
  });

  // 6. Protein (15pt) — target avg 6 servings/day (meat + powder)
  const proteinTotals = days.map(d => (d.protein ?? 0) + (d.powder ?? 0));
  const avgProtein = avg(proteinTotals);
  items.push({
    label: '蛋白質',
    max: 15,
    score: avgProtein == null ? 0 : Math.min(15, Math.round((avgProtein / 6) * 15)),
    detail: avgProtein == null ? '無資料' : `平均 ${avgProtein.toFixed(1)} 份/日`,
  });

  // 7. Vegetables (10pt) — target avg 3 servings/day
  const avgVeg = avg(days.map(d => d.veg));
  items.push({
    label: '蔬菜',
    max: 10,
    score: avgVeg == null ? 0 : Math.min(10, Math.round((avgVeg / 3) * 10)),
    detail: avgVeg == null ? '無資料' : `平均 ${avgVeg.toFixed(1)} 份/日`,
  });

  // 8. Diet record (12pt) — number of days with Y
  const dietDays = days.filter(d => d.diet === 'Y').length;
  items.push({
    label: '飲食紀錄',
    max: 12,
    score: Math.min(12, Math.round((dietDays / 7) * 12)),
    detail: `${dietDays}/7 天有記錄`,
  });

  // 9. Junk food (9pt) — full marks if zero junk; -3 per junk day
  const junkDays = days.filter(d => d.junk === 'Y').length;
  items.push({
    label: '無垃圾食物',
    max: 9,
    score: Math.max(0, 9 - junkDays * 3),
    detail: `${junkDays} 天有吃垃圾食物`,
  });

  const total = items.reduce((s, i) => s + i.score, 0);
  const grade =
    total >= 90 ? 'A+ 優秀'
    : total >= 80 ? 'A 良好'
    : total >= 70 ? 'B 中等'
    : total >= 60 ? 'C 需加強'
    : 'D 待改善';

  return { items, total, grade };
}

export const NutritionistView: React.FC = () => {
  const [text, setText] = useState('');

  const parsed = useMemo(() => parseInput(text), [text]);
  const result = useMemo(() => scoreFrom(parsed.days), [parsed.days]);
  const hasData = parsed.days.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <h1 className="text-lg font-bold">
            <span className="text-[#d0502a]">Be</span>
            <span style={{ color: '#c05828' }}>Bet</span>
            <span className="text-[#efa93b]">ter</span>
            <span className="ml-2 text-sm font-medium text-gray-500">營養師檢視</span>
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm font-semibold text-gray-700 mb-2">
            📥 把學生傳來的數據貼在這裡
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'貼上學生在 LINE 傳來的整段訊息，例如：\n\n【W3 小明 4/1~4/7】\n日期,步數,運動(分),排便,喝水,睡眠,蛋白份,高蛋白,蔬菜份,飲食,垃圾\n4/1,8200,1(30),1,2000,4,4,1,3,Y,N\n...'}
            className="w-full h-44 p-3 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#efa93b]/50"
          />
          {text && (
            <button
              onClick={() => setText('')}
              className="mt-2 text-xs text-gray-500 underline"
            >
              清除
            </button>
          )}
        </div>

        {hasData && (
          <>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500">{parsed.title || '解析結果'}</p>
              <div className="mt-2 flex items-end gap-3">
                <div>
                  <span className="text-5xl font-bold text-[#d0502a]">{result.total}</span>
                  <span className="text-lg text-gray-400 ml-1">/100</span>
                </div>
                <span className="text-base font-semibold text-[#c05828] mb-2">{result.grade}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">解析到 {parsed.days.length} 天數據</p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-3">9 項評分明細</p>
              <div className="flex flex-col gap-2">
                {result.items.map((it) => {
                  const ratio = it.max === 0 ? 0 : it.score / it.max;
                  const color = ratio >= 0.8 ? '#16a34a' : ratio >= 0.5 ? '#efa93b' : '#dc2626';
                  return (
                    <div key={it.label} className="flex flex-col gap-1">
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-700">{it.label}</span>
                        <span className="text-sm font-bold" style={{ color }}>
                          {it.score} / {it.max}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${ratio * 100}%`, background: color }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">{it.detail}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 overflow-x-auto">
              <p className="text-sm font-semibold text-gray-700 mb-2">每日數據</p>
              <table className="w-full text-xs">
                <thead className="text-gray-500">
                  <tr>
                    <th className="text-left py-1 pr-2">日期</th>
                    <th className="text-right py-1 px-1">步數</th>
                    <th className="text-right py-1 px-1">運動</th>
                    <th className="text-right py-1 px-1">水</th>
                    <th className="text-right py-1 px-1">睡眠</th>
                    <th className="text-right py-1 px-1">蛋白</th>
                    <th className="text-right py-1 px-1">蔬菜</th>
                    <th className="text-center py-1 px-1">飲食</th>
                    <th className="text-center py-1 pl-1">垃圾</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.days.map((d, i) => (
                    <tr key={i} className="border-t border-gray-50">
                      <td className="py-1 pr-2 font-medium">{d.date}</td>
                      <td className="text-right py-1 px-1">{d.steps ?? '—'}</td>
                      <td className="text-right py-1 px-1">{d.exerciseMin ?? '—'}</td>
                      <td className="text-right py-1 px-1">{d.water ?? '—'}</td>
                      <td className="text-right py-1 px-1">{d.sleep ?? '—'}</td>
                      <td className="text-right py-1 px-1">
                        {d.protein != null || d.powder != null
                          ? ((d.protein ?? 0) + (d.powder ?? 0)).toFixed(1)
                          : '—'}
                      </td>
                      <td className="text-right py-1 px-1">{d.veg ?? '—'}</td>
                      <td className="text-center py-1 px-1">{d.diet ?? '—'}</td>
                      <td className="text-center py-1 pl-1">{d.junk ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!hasData && text && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
            ⚠️ 無法解析任何日期資料。請確認貼上的格式包含 M/D 開頭的數據行。
          </div>
        )}
      </main>
    </div>
  );
};
