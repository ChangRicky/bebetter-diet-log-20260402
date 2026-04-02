import React, { useState } from 'react';
import { composeMealCard, composeBehaviorCard } from '../../services/canvasExport';
import type { AppRecord, MealRecord, BehaviorRecord } from '../../types';

interface HistoryViewerProps {
  records: AppRecord[];
  onRecordSaved?: () => void;
}

export const HistoryViewer: React.FC<HistoryViewerProps> = ({ records }) => {
  const [filter, setFilter] = useState<'all' | 'meal' | 'behavior'>('all');

  const filtered = records
    .filter((r) => filter === 'all' || r.type === filter)
    .sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="max-w-lg mx-auto px-4 pb-6">
      <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">歷史紀錄</h2>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { id: 'all' as const, label: '全部' },
          { id: 'meal' as const, label: '飲食' },
          { id: 'behavior' as const, label: '行為指標' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.id
                ? 'bg-[#d0502a] text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-xl text-gray-400">目前沒有任何紀錄</p>
          <p className="mt-2 text-sm text-gray-400">開始記錄你的第一筆資料吧！</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((record) =>
            record.type === 'meal' ? (
              <MealCard key={record.id} record={record} />
            ) : (
              <BehaviorCard key={record.id} record={record} />
            )
          )}
        </div>
      )}
    </div>
  );
};

const MealCard: React.FC<{ record: MealRecord }> = ({ record }) => {
  const [exporting, setExporting] = useState(false);
  const date = new Date(record.timestamp);

  const handleExport = async () => {
    setExporting(true);
    try {
      const url = await composeMealCard(record);
      downloadImage(url, `BeBetter飲食紀錄-${date.toLocaleDateString('zh-TW')}.jpg`);
    } catch { /* ignore */ }
    setExporting(false);
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
          <button
            onClick={handleExport}
            disabled={exporting}
            className="text-xs text-[#d0502a] font-medium px-2 py-1 rounded-lg bg-[#FFF3E8] active:bg-[#FFE8D6] disabled:opacity-50"
          >
            {exporting ? '...' : '💾 下載'}
          </button>
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
      const url = await composeBehaviorCard(record);
      downloadImage(url, `BeBetter行為指標-${displayDate}.jpg`);
    } catch { /* ignore */ }
    setExporting(false);
  };

  const items = [
    { icon: '💧', label: '喝水', value: record.waterMl != null ? `${record.waterMl}ml` : null },
    { icon: '🥛', label: '蛋白', value: record.proteinCups != null ? `${record.proteinCups}杯` : null },
    { icon: '🏃', label: '運動', value: record.exercise === true ? (record.exerciseNote || '有') : record.exercise === false ? '沒有' : null },
    { icon: '🚶', label: '步數', value: record.stepsCount ? `${record.stepsCount}步` : null },
    { icon: '😴', label: '睡眠', value: record.sleep ? `${record.sleep}${record.sleepQuality ? `(${record.sleepQuality})` : ''}` : null },
    { icon: '🚽', label: '排便', value: record.bowel ?? null },
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

function downloadImage(dataUrl: string, fileName: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
