import React, { useState, useEffect, useCallback } from 'react';
import { ToastContainer, toast } from './components/Toast';
import { TabBar } from './components/layout/TabBar';
import { WelcomePage } from './components/layout/WelcomePage';
import { BindingPage } from './components/BindingPage';
import { FoodRecordFlow } from './components/food-record/FoodRecordFlow';
import { DailyChecklist } from './components/behavior-record/DailyChecklist';
import { HistoryViewer } from './components/history/HistoryViewer';
import { PlantGrowth } from './components/PlantGrowth';
import { NutritionistView } from './components/nutritionist/NutritionistView';
import { WeekScoreCard } from './components/WeekScoreCard';
import { getAllRecords, migrateFromLocalStorage } from './services/storage';
import { processRetryQueue, pendingSyncCount } from './services/syncService';
import { isBound, getBoundStudentName } from './services/bindingService';
import type { AppRecord, TabType } from './types';

const SEEN_WELCOME_KEY = 'bebetter-welcome-seen';
const SEEN_BINDING_KEY = 'bebetter-binding-seen';

const isNutritionistMode = typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('mode') === 'nutritionist';

const MainApp: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(() => {
    return !localStorage.getItem(SEEN_WELCOME_KEY);
  });
  // Show binding page when: not yet bound AND not skipped
  const [showBinding, setShowBinding] = useState(() => {
    return !isBound() && !localStorage.getItem(SEEN_BINDING_KEY);
  });
  const [syncPending, setSyncPending] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('meal');
  const [records, setRecords] = useState<AppRecord[]>([]);

  const loadRecords = useCallback(async () => {
    const all = await getAllRecords();
    setRecords(all);
  }, []);

  useEffect(() => {
    migrateFromLocalStorage().then(loadRecords);
    // Process retry queue in background after startup
    processRetryQueue().then(() => setSyncPending(pendingSyncCount()));
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

  if (showBinding) {
    return (
      <BindingPage
        onBound={(studentName) => {
          setShowBinding(false);
          setSyncPending(0);
          // Re-sync existing local records
          processRetryQueue();
          toast(`✅ 已綁定成功！歡迎 ${studentName}`, 'success');
        }}
        onSkip={() => {
          localStorage.setItem(SEEN_BINDING_KEY, '1');
          setShowBinding(false);
        }}
      />
    );
  }

  return (
    <div className="font-sans text-gray-800 bg-gray-50 pb-20" style={{ minHeight: '100dvh' }}>
      <ToastContainer />
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
          <div className="flex items-center gap-2">
            {isBound() && (
              <span className="text-xs text-gray-400" title={`同步至 ${getBoundStudentName() ?? '學生帳號'}`}>
                {syncPending > 0 ? `⏳ ${syncPending}` : '☁️'}
              </span>
            )}
            <PlantGrowth level={records.length} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-4">
        {activeTab !== 'history' && <WeekScoreCard />}
        {activeTab === 'meal' && (
          <FoodRecordFlow onRecordSaved={handleRecordSaved} />
        )}
        {activeTab === 'behavior' && (
          <DailyChecklist onRecordSaved={handleRecordSaved} />
        )}
        {activeTab === 'history' && (
          <HistoryViewer
            records={records}
            onDuplicateMeal={() => setActiveTab('meal')}
            onDuplicateBehavior={() => setActiveTab('behavior')}
          />
        )}
      </main>

      {/* Bottom tab bar */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

const App: React.FC = () => (isNutritionistMode ? <NutritionistView /> : <MainApp />);

export default App;
