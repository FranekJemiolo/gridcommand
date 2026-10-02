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
    <div className="flex flex-col items-center justify-center p-4 bg-[#141c14] border-2 border-[#2e3d2e] rounded font-mono select-none">
      {/* Compass Dial Simulation */}
      <div className="relative w-36 h-36 rounded-full border-2 border-[#453724] flex items-center justify-center bg-[#0b0f0b]/90 shadow-inner">
        {/* Cardinal Markers */}
        <span className="absolute top-1 text-[11px] font-bold text-[#c5221f]">N</span>
        <span className="absolute right-2 text-[10px] text-[#9ba89b]">E</span>
        <span className="absolute bottom-1 text-[10px] text-[#9ba89b]">S</span>
        <span className="absolute left-2 text-[10px] text-[#9ba89b]">W</span>

        {/* Heading Indicator Needle */}
        <div
          className="absolute w-1 h-14 bg-gradient-to-t from-transparent via-[#4e9b4e]/50 to-[#68d391] origin-bottom -translate-y-7 transition-transform duration-200"
          style={{ transform: `rotate(${heading}deg)` }}
        />

        {/* Target Vector Needle (if present) */}
        {relativeBearing !== null && (
          <div
            className="absolute w-1.5 h-16 bg-gradient-to-t from-transparent via-[#f5b700]/60 to-[#f5b700] origin-bottom -translate-y-8 transition-transform duration-200"
            style={{ transform: `rotate(${relativeBearing}deg)` }}
          />
        )}

        {/* Center Digital Heading */}
        <div className="z-10 text-center">
          <div className="text-xl font-black text-[#f5b700]">
            {Math.round(heading).toString().padStart(3, '0')}°
          </div>
          <div className="text-[10px] font-bold text-[#9ba89b]">{getCardinal(heading)}</div>
        </div>
      </div>

      {/* Target Info */}
      {targetName && (
        <div className="mt-3 text-center">
          <div className="text-xs uppercase text-[#c7a76c]">TARGET: {targetName}</div>
          {targetDistanceMeters !== undefined && (
            <div className="text-lg font-black text-[#f5b700] tracking-wider mt-0.5">
              &gt;&gt;&gt; {Math.round(targetDistanceMeters)}m &lt;&lt;&lt;
            </div>
          )}
        </div>
      )}
    </div>
  );
};
