import React from 'react';

interface WelcomePageProps {
  onStart: () => void;
}

const TIPS = [
  { emoji: '📊', title: '成功率 +64%', text: '持續記錄飲食的人，減脂成功率比不記錄者高出 64%' },
  { emoji: '🧠', title: '覺察力提升', text: '飲食紀錄幫助你建立自我覺察，讓每一口都更有意識' },
  { emoji: '📱', title: '社群動力', text: '分享到限動或 LINE 相簿，讓朋友看到你正在努力改變' },
  { emoji: '🤝', title: '專業陪伴', text: '你的營養師會陪你一起看紀錄，給你最適合的建議' },
];

export const WelcomePage: React.FC<WelcomePageProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F0] via-white to-[#FEF3E8] flex flex-col items-center px-6 py-10">
      {/* Logo */}
      <div className="mt-8 mb-6 text-center">
        <h1
          className="text-4xl font-bold mb-2"
          style={{ fontFamily: 'Georgia, "Noto Sans TC", serif' }}
        >
          <span className="text-[#d0502a]">Be</span>
          <span style={{ color: '#c05828' }}>Bet</span>
          <span className="text-[#efa93b]">ter</span>
        </h1>
        <p className="text-base text-gray-600 font-medium">飲食 & 行為紀錄工具</p>
      </div>

      {/* Hero message */}
      <div className="mb-8 text-center max-w-sm">
        <p className="text-2xl font-bold text-gray-800 leading-snug mb-3">
          每一次的紀錄，<br />都是對自己的一份承諾。
        </p>
        <p className="text-base text-gray-500 leading-relaxed">
          <span className="text-[#d0502a] font-semibold">我們會陪伴你，一起變得更好。</span>
          <br />
          你的努力不會白費，而這裡會幫你記住每一步。
        </p>
      </div>

      {/* Research tips */}
      <div className="w-full max-w-sm mb-8 flex flex-col gap-3">
        {TIPS.map((tip, i) => (
          <div
            key={i}
            className="flex items-start gap-3 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-[#efa93b]/10"
          >
            <span className="text-2xl flex-shrink-0 mt-0.5">{tip.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-[#d0502a] mb-0.5">{tip.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{tip.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA button */}
      <button
        onClick={onStart}
        className="w-full max-w-sm py-4 text-white text-lg font-bold rounded-2xl shadow-lg active:opacity-90 transition-opacity"
        style={{ background: 'linear-gradient(135deg, #d0502a, #efa93b)' }}
      >
        開始紀錄
      </button>

      <p className="text-xs text-gray-300 mt-6">BeBetter 成長學院 — 陪你成為更好的自己</p>
    </div>
  );
};
