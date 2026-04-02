
import React from 'react';
import type { MealRecord } from '../types';
import { BackIcon } from './icons/BackIcon';
import { DownloadIcon } from './icons/DownloadIcon';

interface HistoryViewerProps {
  records: MealRecord[];
  onBack: () => void;
}

export const HistoryViewer: React.FC<HistoryViewerProps> = ({ records, onBack }) => {
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-green-800">歷史紀錄</h2>
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-gray-500 text-white px-5 py-2 rounded-lg shadow-md hover:bg-gray-600 transition-colors duration-300 text-lg"
          aria-label="返回紀錄頁面"
        >
          <BackIcon />
          <span>返回</span>
        </button>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-lg">
          <p className="text-2xl text-gray-500">目前沒有任何紀錄。</p>
          <p className="mt-2 text-gray-400">開始上傳您的第一張餐點照片吧！</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {records.slice().reverse().map((record) => (
            <div key={record.id} className="group bg-white rounded-2xl shadow-lg overflow-hidden relative">
              <img src={record.imageDataUrl} alt={`Meal on ${new Date(record.timestamp).toLocaleDateString()}`} className="w-full h-64 object-cover" />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-70 transition-all duration-300 flex flex-col justify-between p-4">
                
                {/* Top part: Meal Type & Date */}
                <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="bg-green-600 text-white text-xs font-bold mr-2 px-2.5 py-0.5 rounded-full">{record.mealType}</span>
                    <p className="font-bold text-lg mt-1">{new Date(record.timestamp).toLocaleString('zh-TW', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                 </div>
                 
                {/* Bottom part: Download button */}
                <a
                  href={record.imageDataUrl}
                  download={`BeBetter飲食紀錄-${new Date(record.timestamp).toLocaleDateString()}.png`}
                  className="self-end flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-emerald-600 transition-colors duration-300 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0"
                  aria-label="下載此紀錄"
                >
                  <DownloadIcon />
                  <span>下載</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
