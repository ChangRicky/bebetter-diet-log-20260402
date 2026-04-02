import React, { useRef } from 'react';

interface PhotoCaptureProps {
  onPhotoSelected: (file: File, previewUrl: string) => void;
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({ onPhotoSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPhotoSelected(file, URL.createObjectURL(file));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">記錄你的餐點</h2>
        <p className="text-gray-500">拍張照片或從相簿選擇</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        {/* Camera button - primary */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-16 bg-[#FFF8F0] border-2 border-dashed border-[#efa93b] rounded-2xl flex flex-col items-center gap-3 active:bg-[#FFF0E0] transition-colors"
        >
          <span className="text-5xl">📸</span>
          <span className="text-lg font-semibold text-[#d0502a]">拍照</span>
        </button>

        {/* Gallery button - secondary */}
        <button
          onClick={() => galleryInputRef.current?.click()}
          className="w-full py-4 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center gap-2 active:bg-gray-100 transition-colors"
        >
          <span className="text-xl">🖼️</span>
          <span className="text-base text-gray-600">從相簿選擇</span>
        </button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
};
