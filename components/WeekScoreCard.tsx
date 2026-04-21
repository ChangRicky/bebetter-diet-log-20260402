import React, { useEffect, useState } from 'react';
import { fetchMyWeekScores, type WeekScore } from '../services/supabase';
import { getBoundLineUserId, isBound } from '../services/bindingService';

/**
 * Home-screen week score card — shows the latest scored week from the nutritionist.
 * If student is not bound, renders nothing.
 * If bound but no scores yet, shows a friendly empty state.
 */
export const WeekScoreCard: React.FC = () => {
  const [score, setScore] = useState<WeekScore | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const lineUserId = getBoundLineUserId();
    if (!lineUserId) {
      setLoaded(true);
      return;
    }
    fetchMyWeekScores(lineUserId).then(scores => {
      const latest = scores
        .filter(s => s.total !== null)
        .sort((a, b) => b.week_num - a.week_num)[0] ?? null;
      setScore(latest);
      setLoaded(true);
    });
  }, []);

  if (!isBound() || !loaded) return null;

  if (!score) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-3">
        <div className="bg-gradient-to-r from-[#FFF3E8] to-[#FFE8D6] rounded-xl p-3 border border-[#f5d5b8]">
          <p className="text-xs text-gray-500">📊 營養師週分數</p>
          <p className="text-sm text-gray-600 mt-1">營養師還沒開始評分，繼續加油打卡！</p>
        </div>
      </div>
    );
  }

  const total = score.total ?? 0;
  const color = total >= 80 ? 'text-green-600' : total >= 60 ? 'text-yellow-600' : 'text-red-500';

  return (
    <div className="max-w-lg mx-auto px-4 pt-3">
      <div className="bg-gradient-to-r from-[#FFF3E8] to-[#FFE8D6] rounded-xl p-3 border border-[#f5d5b8]">
        <div className="flex items-baseline justify-between">
          <p className="text-xs text-gray-600">📊 第 {score.week_num} 週 營養師評分</p>
          <p className={`text-2xl font-bold ${color}`}>
            {total}
            <span className="text-sm text-gray-500 font-normal">/100</span>
          </p>
        </div>
        {score.comment && (
          <p className="text-xs text-gray-700 mt-2 leading-relaxed">💬 {score.comment}</p>
        )}
      </div>
    </div>
  );
};
