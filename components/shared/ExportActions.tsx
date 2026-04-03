import React, { useState, useEffect } from 'react';
import { isInLiff, isLiffEnabled, shareToLine, closeLiff } from '../../services/liffService';

interface ExportActionsProps {
  imageDataUrl: string | null;
  fileName: string;
  onNewRecord: () => void;
}

export const ExportActions: React.FC<ExportActionsProps> = ({
  imageDataUrl,
  fileName,
  onNewRecord,
}) => {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [inLiff, setInLiff] = useState(false);
  const [liffEnabled, setLiffEnabled] = useState(false);

  useEffect(() => {
    setInLiff(isInLiff());
    setLiffEnabled(isLiffEnabled());
  }, []);

  const showToastMsg = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(imageDataUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Feature detection: test if <a download> actually works.
      // On iOS Safari/Chrome and some in-app browsers, it silently fails.
      // Strategy: try blob URL download first, then share API, then new tab.
      const supportsDownload = (() => {
        const a = document.createElement('a');
        // 'download' in a is true even on iOS Safari, but it doesn't actually work.
        // Detect iOS/iPadOS via touch + platform heuristics (no UA sniffing).
        const isTouchDevice = 'ontouchstart' in window && navigator.maxTouchPoints > 0;
        const isAppleDevice = /Mac|iPad|iPhone|iPod/.test(navigator.platform) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        // Desktop Mac has maxTouchPoints === 0, so this correctly excludes it
        return !('download' in a && isTouchDevice && isAppleDevice);
      })();

      if (supportsDownload) {
        // Desktop + Android: blob URL download works
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        showToastMsg('圖片已下載！');
        return;
      }

      // Mobile Safari/Chrome: use Web Share API (lets user choose "Save Image")
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] });
          showToastMsg('圖片已儲存！');
          URL.revokeObjectURL(blobUrl);
          return;
        }
      }

      // Fallback: open image in new tab for long-press save
      window.open(blobUrl, '_blank');
      showToastMsg('長按圖片即可儲存到相簿');
    } catch {
      // User cancelled share or unexpected error — open in new tab
      try {
        const res2 = await fetch(imageDataUrl);
        const blob2 = await res2.blob();
        const url2 = URL.createObjectURL(blob2);
        window.open(url2, '_blank');
        showToastMsg('長按圖片即可儲存到相簿');
      } catch {
        showToastMsg('儲存失敗，請使用分享功能');
      }
    }
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

  const handleLineShare = async () => {
    const success = await shareToLine(imageDataUrl);
    if (success) {
      showToastMsg('已分享到 LINE！');
    } else {
      // Fallback to regular share
      handleShare();
    }
  };

  const handleDone = () => {
    if (inLiff) {
      closeLiff();
    } else {
      onNewRecord();
    }
  };

  return (
    <>
      {imageDataUrl && (
        <>
        {/* Guidance text */}
        <div className="bg-[#FFF8F0] rounded-xl p-3 mb-3 border border-[#efa93b]/20">
          <p className="text-xs text-[#d0502a] leading-relaxed">
            <span className="font-semibold">持續記錄，就是最好的改變。</span>
            <br />分享到 IG 限動或 LINE 相簿，讓大家看到你正在努力成長！研究顯示，公開記錄飲食的人減脂成功率提升 2 倍以上。
          </p>
        </div>

        {/* Album reminder */}
        <div className="bg-green-50 rounded-xl p-3 mb-3 border border-green-200/50">
          <p className="text-xs text-green-700 leading-relaxed">
            <span className="font-semibold">📌 小提醒：</span>傳到 LINE 之後，記得把圖片<span className="font-semibold">加入群組相簿</span>，這樣營養師才能方便查看你的紀錄喔！
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

        {liffEnabled ? (
          /* LINE share button — shown when LIFF is configured */
          <button
            onClick={handleLineShare}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-white text-base font-semibold py-3.5 rounded-xl active:opacity-85 transition-opacity"
            style={{ backgroundColor: '#06C755' }}
          >
            <span className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
              </svg>
              <span>傳到 LINE</span>
            </span>
            <span className="text-[10px] font-normal opacity-80">直接傳給營養師</span>
          </button>
        ) : (
          /* Regular share button — when LIFF is not configured */
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
        )}
      </div>

      {/* Always show the other share option as secondary */}
      {liffEnabled && (
        <button
          onClick={handleShare}
          className="w-full mt-2 py-2.5 text-gray-500 text-sm rounded-xl border border-gray-200 active:bg-gray-50 transition-colors"
        >
          📤 分享到其他 App
        </button>
      )}
        </>
      )}

      <button
        onClick={handleDone}
        className="w-full mt-3 py-3 text-[#d0502a] font-medium text-base rounded-xl border-2 border-[#efa93b]/30 active:bg-[#FFF8F0] transition-colors"
      >
        {inLiff ? '完成（返回 LINE）' : '再記錄一筆'}
      </button>

      {showToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#d0502a] text-white px-5 py-2.5 rounded-full shadow-lg text-sm flex items-center gap-2 z-50 animate-fade-in">
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
};
