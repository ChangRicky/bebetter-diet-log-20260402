import React from 'react';

interface SegmentedControlProps<T extends string> {
  options: T[];
  value: T | null;
  onChange: (value: T) => void;
  colorMap?: Record<string, string>;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  colorMap,
}: SegmentedControlProps<T>) {
  return (
    <div className="flex rounded-xl overflow-hidden border border-gray-200">
      {options.map((option, i) => {
        const isSelected = value === option;
        const selectedColor = colorMap?.[option] || 'bg-green-500 text-white';
        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`flex-1 py-2.5 px-3 text-sm font-medium transition-all duration-200 ${
              isSelected
                ? selectedColor
                : 'bg-white text-gray-500 active:bg-gray-100'
            } ${i > 0 ? 'border-l border-gray-200' : ''}`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
