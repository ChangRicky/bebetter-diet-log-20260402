import React, { useState } from 'react';

interface ExportActionsProps {
  imageDataUrl: string;
  fileName: string;
  onNewRecord: () => void;
}

export const ExportActions: React.FC<ExportActionsProps> = ({
  imageDataUrl,
  fileName,
  onNewRecord,
}) => {
  const [showToast, setShowToast] = useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageDataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const handleShare = async () => {
    if (!navigator.share) {
      handleDownload();
      return;
    }
    try {
      const res = await fetch(imageDataUrl);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: blob.type });
      await navigator.share({ files: [file] });
    } catch {
      handleDownload();
    }
  };

  return (
    <>
      {/* Guidance text */}
      <div className="bg-[#FFF8F0] rounded-xl p-3 mb-3 border border-[#efa93b]/20">
        <p className="text-xs text-[#d0502a] leading-relaxed">
          <span className="font-semibold">持續記錄，就是最好的改變。</span>
          <br />分享到 IG 限動或 LINE 相簿，讓大家看到你正在努力成長！研究顯示，公開記錄飲食的人減脂成功率提升 2 倍以上。
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleDownload}
          className="flex-1 flex flex-col items-center justify-center gap-1 bg-[#d0502a] text-white text-base font-semibold py-3.5 rounded-xl active:opacity-85 transition-opacity"
        >
          <span className="flex items-center gap-2">
            <span>💾</span>
            <span>存到手機</span>
          </span>
          <span className="text-[10px] font-normal opacity-70">下載圖片到相簿</span>
        </button>
        <button
          onClick={handleShare}
          className="flex-1 flex flex-col items-center justify-center gap-1 bg-[#efa93b] text-white text-base font-semibold py-3.5 rounded-xl active:opacity-85 transition-opacity"
        >
          <span className="flex items-center gap-2">
            <span>📤</span>
            <span>分享</span>
          </span>
          <span className="text-[10px] font-normal opacity-70">直接傳到 LINE / IG</span>
        </button>
      </div>
      <button
        onClick={onNewRecord}
        className="w-full mt-3 py-3 text-[#d0502a] font-medium text-base rounded-xl border-2 border-[#efa93b]/30 active:bg-[#FFF8F0] transition-colors"
      >
        再記錄一筆
      </button>

      {showToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#d0502a] text-white px-5 py-2.5 rounded-full shadow-lg text-sm flex items-center gap-2 z-50 animate-fade-in">
          <span>圖片已下載！</span>
        </div>
      )}
    </>
  );
};
