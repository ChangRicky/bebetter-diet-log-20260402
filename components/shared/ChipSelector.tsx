import React from 'react';

interface ChipSelectorProps<T extends string> {
  options: T[];
  selected: T[];
  onToggle: (value: T) => void;
  colorClass?: string;
}

export function ChipSelector<T extends string>({
  options,
  selected,
  onToggle,
  colorClass = 'bg-green-500 text-white',
}: ChipSelectorProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            onClick={() => onToggle(option)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 active:scale-95 ${
              isSelected
                ? colorClass
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
