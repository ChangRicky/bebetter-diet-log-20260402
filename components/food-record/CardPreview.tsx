import React, { useEffect, useState } from 'react';
import { composeMealCard } from '../../services/canvasExport';
import { getLiffUserName } from '../../services/liffService';
import { ExportActions } from '../shared/ExportActions';
import type { MealRecord } from '../../types';

interface CardPreviewProps {
  record: MealRecord;
  onNewRecord: () => void;
}

export const CardPreview: React.FC<CardPreviewProps> = ({ record, onNewRecord }) => {
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsComposing(true);
    composeMealCard(record, getLiffUserName()).then((url) => {
      if (!cancelled) {
        setCardImageUrl(url);
        setIsComposing(false);
      }
    }).catch(() => {
      if (!cancelled) setIsComposing(false);
    });
    return () => { cancelled = true; };
  }, [record]);

  const date = new Date(record.timestamp);
  const fileName = `BeBetter飲食紀錄-${date.toLocaleDateString('zh-TW')}.jpg`;

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800">完成！</h2>
        <p className="text-sm text-gray-400 mt-1">每一次記錄都是對自己的承諾</p>
      </div>

      {isComposing ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#d0502a]" />
        </div>
      ) : cardImageUrl ? (
        <>
          <div className="rounded-xl overflow-hidden shadow-lg">
            <img src={cardImageUrl} alt="飲食紀錄卡片" className="w-full" />
          </div>
          <ExportActions
            imageDataUrl={cardImageUrl}
            fileName={fileName}
            onNewRecord={onNewRecord}
          />
        </>
      ) : (
        <p className="text-center text-red-500">圖片合成失敗，請重試</p>
      )}
    </div>
  );
};
