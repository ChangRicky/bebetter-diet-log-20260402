import React, { useEffect, useState } from 'react';
import { fetchMyWeekScores, fetchMyStudentProfile, type WeekScore, type StudentProfile } from '../services/supabase';
import { getBoundLineUserId, isBound } from '../services/bindingService';

/**
 * Home-screen week score card.
 * - Not bound → render nothing.
 * - Bound & today < start_date → 測試期 banner (scores don't count yet).
 * - Bound & on/after start_date & no scores yet → 評分即將開始 empty state.
 * - Bound & has scores → latest week score card.
 */
export const WeekScoreCard: React.FC = () => {
  const [score, setScore] = useState<WeekScore | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const lineUserId = getBoundLineUserId();
    if (!lineUserId) {
      setLoaded(true);
      return;
    }
    Promise.all([
      fetchMyStudentProfile(lineUserId),
      fetchMyWeekScores(lineUserId),
    ]).then(([p, scores]) => {
      setProfile(p);
      const latest = scores
        .filter(s => s.total !== null)
        .sort((a, b) => b.week_num - a.week_num)[0] ?? null;
      setScore(latest);
      setLoaded(true);
    });
  }, []);

  if (!isBound() || !loaded) return null;

  const today = new Date().toISOString().slice(0, 10);
  const isTesting = profile?.start_date != null && today < profile.start_date;

  // ── 測試期：正式開課日前，分數不計 ───────────────────────
  if (isTesting && profile?.start_date) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-3">
        <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl p-3 border border-blue-100">
          <p className="text-xs text-blue-700 font-semibold">🧪 測試期</p>
          <p className="text-sm text-gray-700 mt-1 leading-relaxed">
            正式開課日：<span className="font-semibold">{profile.start_date}</span><br/>
            此期間打卡<span className="text-blue-700">不會計入分數</span>，請熟悉操作即可 😊
          </p>
        </div>
      </div>
    );
  }

  // ── 已開課但尚無評分 ───────────────────────────────────
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
