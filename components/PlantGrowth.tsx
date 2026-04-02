import React from 'react';

interface PlantGrowthProps {
  level: number;
}

const plantEmojis = ['🌱', '🌿', '🪴', '🌳', '🌸', '🌺'];

export const PlantGrowth: React.FC<PlantGrowthProps> = ({ level }) => {
  const stageIndex = Math.min(Math.floor(level / 2), plantEmojis.length - 1);
  const emoji = plantEmojis[stageIndex];

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span>{emoji}</span>
      <span className="text-green-600 font-semibold">{level}</span>
      <span className="text-gray-400">筆</span>
    </div>
  );
};
