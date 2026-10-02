import React from 'react';
import { useGMStore } from './stores/gmStore';
import { TacticalHexMap } from './components/TacticalHexMap';
import { TemporalScrubber } from './components/TemporalScrubber';
import { EventTicker } from './components/EventTicker';
import { AdminConsole } from './components/AdminConsole';

export const App: React.FC = () => {
  const {
    matchId,
    isLive,
    scrubPosition,
    globalFreeze,
    graph,
    hexes,
    ticker,
    activeHazard,
    setIsLive,
    setScrubPosition,
    toggleGlobalFreeze,
    forceResolve,
    injectHazard,
  } = useGMStore();

  // Calculate squad scores
  let alphaScore = 0;
  let bravoScore = 0;
  Object.values(graph.nodes).forEach((n) => {
    if (n.status === 'RESOLVED') {
      if (n.owner === 'squad_alpha') alphaScore += n.points;
      if (n.owner === 'squad_bravo') bravoScore += n.points;
    }
  });

  return (
    <div className="relative w-full h-full flex flex-col bg-black text-[#e6edf3] overflow-hidden select-none font-mono">
      {/* Top Bar: Match Identification & Squad Scores */}
      <header className="w-full bg-[#0a0e14] border-b-2 border-[#1e2638] px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-black text-[#00f3ff] text-sm">
            <span className="w-2.5 h-2.5 bg-[#00f3ff] rounded-sm" />
            GRIDCOMMAND // GM COMMAND CENTER
          </div>
          <span className="text-[#8b949e]">MATCH: {matchId}</span>
          <span className="text-[10px] px-2 py-0.5 rounded border border-[#00f3ff]/40 bg-[#00f3ff]/10 text-[#00f3ff]">
            DAG STATE: RECONCILED
          </span>
        </div>

        {/* Live Scoreboard */}
        <div className="flex items-center gap-4 text-xs font-black">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#0077ff]/10 border border-[#0077ff] text-[#0077ff] rounded">
            <span>SQUAD ALPHA:</span>
            <span>{alphaScore} PTS</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#ff2200]/10 border border-[#ff2200] text-[#ff2200] rounded">
            <span>SQUAD BRAVO:</span>
            <span>{bravoScore} PTS</span>
          </div>
        </div>
      </header>

      {/* Global Freeze Banner if triggered */}
      {globalFreeze && (
        <div className="w-full bg-[#ff2200] text-black font-black py-1.5 px-4 text-center text-xs tracking-widest uppercase animate-pulse">
          🚨 GLOBAL FREEZE ACTIVE // ALL OPERATOR DEVICES LOCKED TO AMBER EMERGENCY HUD 🚨
        </div>
      )}

      {/* Admin Controls Panel */}
      <AdminConsole
        graph={graph}
        globalFreeze={globalFreeze}
        onToggleFreeze={toggleGlobalFreeze}
        onForceResolve={forceResolve}
        onInjectHazard={injectHazard}
      />

      {/* Main Command Viewport */}
      <div className="flex-1 flex w-full overflow-hidden relative">
        {/* 3D Hex Battle Map */}
        <div className="flex-1 h-full relative">
          <TacticalHexMap hexes={hexes} />

          {/* Active Hazard Countdown Widget */}
          {activeHazard && (
            <div className="absolute top-4 right-4 z-20 bg-[#ff2200]/20 border-2 border-[#ff2200] text-[#ff2200] p-3 rounded font-mono text-xs backdrop-blur-md animate-pulse">
              <div className="font-black text-sm">⚠️ ACTIVE HAZARD INJECTED</div>
              <div className="text-[11px] text-white mt-1">{activeHazard.name}</div>
              <div className="text-lg font-black mt-1">EVACUATE: {activeHazard.remainingSeconds}s</div>
            </div>
          )}
        </div>

        {/* Live Event Ticker Sidebar */}
        <div className="w-80 md:w-96 h-full flex-shrink-0 z-10">
          <EventTicker events={ticker} />
        </div>
      </div>

      {/* Bottom Temporal DVR Scrubber */}
      <TemporalScrubber
        isLive={isLive}
        onToggleLive={setIsLive}
        scrubPosition={scrubPosition}
        onScrub={setScrubPosition}
      />
    </div>
  );
};

export default App;
