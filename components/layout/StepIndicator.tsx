import React from 'react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps }) => {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i + 1 === currentStep
              ? 'w-6 bg-[#d0502a]'
              : i + 1 < currentStep
              ? 'w-2 bg-[#efa93b]'
              : 'w-2 bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
};
