import { useEffect, useState } from 'react';
import { Gamepad2, Map } from 'lucide-react';
import { GardenMapTab } from './components/GardenMapTab';
import { FlappyLoveTab } from './components/FlappyLoveTab';
import { soundEngine } from './utils/sound';

type ActiveTab = 'guide' | 'game';

const STORAGE_VISITED_KEY = 'sj_wedding_visited_stalls';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('guide');
  const [visitedStalls, setVisitedStalls] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_VISITED_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_VISITED_KEY, JSON.stringify(visitedStalls));
    } catch {
      // ignore storage errors
    }
  }, [visitedStalls]);

  const handleToggleVisited = (stallId: string) => {
    setVisitedStalls((prev) =>
      prev.includes(stallId) ? prev.filter((id) => id !== stallId) : [...prev, stallId],
    );
  };

  const switchTab = (tab: ActiveTab) => {
    if (tab !== activeTab) {
      soundEngine.playClick();
      setActiveTab(tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FCF9F4] text-[#2C2A29]">
      {/* Desktop Top Navigation Bar (Clean 3-Zone Contract) */}
      <header className="hidden md:flex sticky top-0 z-40 h-16 items-center justify-between gap-8 px-6 lg:px-10 bg-[#FCF9F4]/90 backdrop-blur-md border-b border-[#EAE0D3]">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            switchTab('guide');
          }}
          className="font-display text-xl font-bold tracking-wide text-[#2C2A29] whitespace-nowrap shrink-0"
        >
          S &amp; J Garden
        </a>

        <nav className="flex items-center gap-8 text-sm font-medium" aria-label="Main navigation">
          <button
            type="button"
            onClick={() => switchTab('guide')}
            className={`py-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'guide'
                ? 'text-[#D96B78] border-[#D96B78] font-semibold'
                : 'text-[#6B6560] border-transparent hover:text-[#2C2A29]'
            }`}
          >
            婚礼指南 · Garden Guide
          </button>
          <button
            type="button"
            onClick={() => switchTab('game')}
            className={`py-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'game'
                ? 'text-[#D96B78] border-[#D96B78] font-semibold'
                : 'text-[#6B6560] border-transparent hover:text-[#2C2A29]'
            }`}
          >
            婚礼小游戏 · Wedding Game
          </button>
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={() => switchTab(activeTab === 'guide' ? 'game' : 'guide')}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-[#D96B78] hover:bg-[#C95C69] text-white text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer shadow-xs"
          >
            {activeTab === 'guide' ? '玩婚礼小游戏 · Play Game' : '返回花园地图 · Back to Map'}
          </button>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1">
        {activeTab === 'guide' ? (
          <GardenMapTab
            visitedStalls={visitedStalls}
            onToggleVisited={handleToggleVisited}
          />
        ) : (
          <FlappyLoveTab />
        )}
      </main>

      {/* Mobile Floating Bottom Tab Switcher (Compact <= 15% Viewport Cap, Thumb Zone) */}
      <nav
        aria-label="Mobile view switcher"
        className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[min(92vw,380px)] rounded-2xl bg-white/92 backdrop-blur-md border border-[#E6DACB] shadow-lg p-1.5 grid grid-cols-2 gap-1.5"
      >
        <button
          type="button"
          onClick={() => switchTab('guide')}
          className={`min-h-[46px] rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition cursor-pointer whitespace-nowrap px-3 ${
            activeTab === 'guide'
              ? 'bg-[#D96B78] text-white shadow-xs'
              : 'text-[#5A544E] hover:bg-[#F7F1E8]'
          }`}
        >
          <Map className="w-4 h-4 shrink-0" />
          <span>婚礼指南 · Guide</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('game')}
          className={`min-h-[46px] rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition cursor-pointer whitespace-nowrap px-3 ${
            activeTab === 'game'
              ? 'bg-[#D96B78] text-white shadow-xs'
              : 'text-[#5A544E] hover:bg-[#F7F1E8]'
          }`}
        >
          <Gamepad2 className="w-4 h-4 shrink-0" />
          <span>婚礼小游戏 · Game</span>
        </button>
      </nav>
    </div>
  );
}
