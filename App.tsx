import React, { useState, useEffect, useCallback } from 'react';
import { TabBar } from './components/layout/TabBar';
import { WelcomePage } from './components/layout/WelcomePage';
import { FoodRecordFlow } from './components/food-record/FoodRecordFlow';
import { DailyChecklist } from './components/behavior-record/DailyChecklist';
import { HistoryViewer } from './components/history/HistoryViewer';
import { PlantGrowth } from './components/PlantGrowth';
import { getAllRecords, migrateFromLocalStorage } from './services/storage';
import type { AppRecord, TabType } from './types';

const SEEN_WELCOME_KEY = 'bebetter-welcome-seen';

const App: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(() => {
    return !localStorage.getItem(SEEN_WELCOME_KEY);
  });
  const [activeTab, setActiveTab] = useState<TabType>('meal');
  const [records, setRecords] = useState<AppRecord[]>([]);

  const loadRecords = useCallback(async () => {
    const all = await getAllRecords();
    setRecords(all);
  }, []);

  useEffect(() => {
    migrateFromLocalStorage().then(loadRecords);
  }, [loadRecords]);

  const handleRecordSaved = useCallback(() => {
    loadRecords();
  }, [loadRecords]);

  const handleWelcomeDone = () => {
    localStorage.setItem(SEEN_WELCOME_KEY, '1');
    setShowWelcome(false);
  };

  if (showWelcome) {
    return <WelcomePage onStart={handleWelcomeDone} />;
  }

  return (
    <div className="font-sans text-gray-800 bg-gray-50 pb-20" style={{ minHeight: '100dvh' }}>
      {/* Header */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-100 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1
            className="text-lg font-bold"
            style={{ fontFamily: 'Georgia, "Noto Sans TC", serif' }}
          >
            <span className="text-[#d0502a]">Be</span>
            <span style={{ color: '#c05828' }}>Bet</span>
            <span className="text-[#efa93b]">ter</span>
          </h1>
          <PlantGrowth level={records.length} />
        </div>
      </header>

      {/* Main content */}
      <main className="pt-4">
        {activeTab === 'meal' && (
          <FoodRecordFlow onRecordSaved={handleRecordSaved} />
        )}
        {activeTab === 'behavior' && (
          <DailyChecklist onRecordSaved={handleRecordSaved} />
        )}
        {activeTab === 'history' && (
          <HistoryViewer
            records={records}
            onRecordSaved={handleRecordSaved}
            onDuplicateMeal={() => setActiveTab('meal')}
          />
        )}
      </main>

      {/* Bottom tab bar */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;
