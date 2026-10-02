import React from 'react';

export interface TacticalHeaderProps {
  gpsAccuracy?: number; // meters
  meshNodesCount?: number;
  batteryPercent?: number;
  isRedMode?: boolean;
  onToggleRedMode?: () => void;
  isRainLocked?: boolean;
  onToggleRainLock?: () => void;
}

export const TacticalHeader: React.FC<TacticalHeaderProps> = ({
  gpsAccuracy = 3.2,
  meshNodesCount = 4,
  batteryPercent = 88,
  isRedMode = false,
  onToggleRedMode,
  isRainLocked = false,
  onToggleRainLock,
}) => {
  const getGpsColor = (acc: number) => {
    if (acc <= 5) return 'text-[#00ff66] border-[#00ff66]/40';
    if (acc <= 15) return 'text-[#ffe600] border-[#ffe600]/40';
    return 'text-[#ff2200] border-[#ff2200]/40';
  };

  return (
    <header className="w-full bg-[#0a0e14] border-b-2 border-[#1e2638] px-3 py-2 text-xs font-mono select-none">
      <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
        {/* GPS Indicator */}
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded border bg-[#000000]/60 ${getGpsColor(
            gpsAccuracy
          )}`}
        >
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          <span className="font-bold">GPS: ±{gpsAccuracy.toFixed(1)}m</span>
        </div>

        {/* Mesh Nodes */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-[#00f3ff]/40 bg-[#00f3ff]/5 text-[#00f3ff]">
          <span className="font-bold">MESH: {meshNodesCount} NODES</span>
        </div>

        {/* Battery */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-[#8b949e]/40 bg-[#121820] text-[#e6edf3]">
          <span>BAT: {batteryPercent}%</span>
        </div>

        {/* Tactical Controls */}
        <div className="flex items-center gap-1">
          {onToggleRedMode && (
            <button
              onClick={onToggleRedMode}
              title="Toggle Tactical Red-Light Mode"
              className={`px-2 py-1 text-[10px] font-bold rounded border uppercase ${
                isRedMode
                  ? 'bg-[#ff2200] text-black border-[#ff2200]'
                  : 'bg-[#ff2200]/10 text-[#ff2200] border-[#ff2200]/40'
              }`}
            >
              RED
            </button>
          )}

          {onToggleRainLock && (
            <button
              onClick={onToggleRainLock}
              title="Toggle Rain Lock Guard"
              className={`px-2 py-1 text-[10px] font-bold rounded border uppercase ${
                isRainLocked
                  ? 'bg-[#ffe600] text-black border-[#ffe600]'
                  : 'bg-[#ffe600]/10 text-[#ffe600] border-[#ffe600]/40'
              }`}
            >
              RAIN
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
