import React from 'react';

export interface CompassBearingProps {
  heading: number; // 0 - 360 degrees
  targetBearing?: number; // 0 - 360 degrees
  targetDistanceMeters?: number;
  targetName?: string;
}

export const CompassBearing: React.FC<CompassBearingProps> = ({
  heading,
  targetBearing,
  targetDistanceMeters,
  targetName,
}) => {
  const getCardinal = (angle: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(((angle % 360) + 360) % 360 / 45) % 8;
    return directions[index];
  };

  const relativeBearing = targetBearing !== undefined ? (targetBearing - heading + 360) % 360 : null;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-[#0a0e14] border-2 border-[#1e2638] rounded font-mono select-none">
      {/* Compass Dial Simulation */}
      <div className="relative w-36 h-36 rounded-full border-2 border-[#1e2638] flex items-center justify-center bg-[#000000]/70">
        {/* Cardinal Markers */}
        <span className="absolute top-1 text-[11px] font-bold text-[#ff2200]">N</span>
        <span className="absolute right-2 text-[10px] text-[#8b949e]">E</span>
        <span className="absolute bottom-1 text-[10px] text-[#8b949e]">S</span>
        <span className="absolute left-2 text-[10px] text-[#8b949e]">W</span>

        {/* Heading Indicator Needle */}
        <div
          className="absolute w-1 h-14 bg-gradient-to-t from-transparent via-[#00f3ff]/50 to-[#00f3ff] origin-bottom -translate-y-7 transition-transform duration-200"
          style={{ transform: `rotate(${heading}deg)` }}
        />

        {/* Target Vector Needle (if present) */}
        {relativeBearing !== null && (
          <div
            className="absolute w-1.5 h-16 bg-gradient-to-t from-transparent via-[#ffe600]/60 to-[#ffe600] origin-bottom -translate-y-8 transition-transform duration-200"
            style={{ transform: `rotate(${relativeBearing}deg)` }}
          />
        )}

        {/* Center Digital Heading */}
        <div className="z-10 text-center">
          <div className="text-xl font-black text-[#00f3ff]">
            {Math.round(heading).toString().padStart(3, '0')}°
          </div>
          <div className="text-[10px] font-bold text-[#8b949e]">{getCardinal(heading)}</div>
        </div>
      </div>

      {/* Target Info */}
      {targetName && (
        <div className="mt-3 text-center">
          <div className="text-xs uppercase text-[#8b949e]">TARGET: {targetName}</div>
          {targetDistanceMeters !== undefined && (
            <div className="text-lg font-black text-[#ffe600] tracking-wider mt-0.5">
              &gt;&gt;&gt; {Math.round(targetDistanceMeters)}m &lt;&lt;&lt;
            </div>
          )}
        </div>
      )}
    </div>
  );
};
