import React from 'react';
import type { TabType } from '../../types';

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: { id: TabType; label: string; icon: string }[] = [
  { id: 'meal', label: '飲食紀錄', icon: '📷' },
  { id: 'behavior', label: '行為指標', icon: '📋' },
  { id: 'history', label: '歷史紀錄', icon: '📁' },
];

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-50 safe-area-bottom">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 flex flex-col items-center py-2 pt-3 transition-colors ${
            activeTab === tab.id
              ? 'text-[#d0502a]'
              : 'text-gray-400 active:text-gray-600'
          }`}
        >
          <span className="text-xl">{tab.icon}</span>
          <span className={`text-xs mt-0.5 ${activeTab === tab.id ? 'font-semibold' : ''}`}>
            {tab.label}
          </span>
        </button>
      ))}
    </nav>
  );
};
