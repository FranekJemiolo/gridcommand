import React from 'react';

export interface ElevationPointData {
  distanceMeters: number;
  lat: number;
  lon: number;
  groundElevation: number;
  rayElevation: number;
  clearance: number;
  isObstructed: boolean;
}

export interface LOSAnalysisData {
  distanceMeters: number;
  bearingDeg: number;
  isClear: boolean;
  minElevation: number;
  maxElevation: number;
  netAscent: number;
  netDescent: number;
  startElevation: number;
  targetElevation: number;
  maxObstructionMeters: number;
  fresnelRadiusMidpointMeters: number;
  profile: ElevationPointData[];
}

export interface ElevationProfileWidgetProps {
  analysis: LOSAnalysisData;
  targetName?: string;
  isCompact?: boolean;
}

export const ElevationProfileWidget: React.FC<ElevationProfileWidgetProps> = ({
  analysis,
  targetName = 'TARGET OBJECTIVE',
  isCompact = false,
}) => {
  const {
    distanceMeters,
    bearingDeg,
    isClear,
    minElevation,
    maxElevation,
    startElevation,
    targetElevation,
    maxObstructionMeters,
    fresnelRadiusMidpointMeters,
    profile,
  } = analysis;

  const elevRange = Math.max(15, maxElevation - minElevation + 10);
  const chartHeight = isCompact ? 70 : 110;
  const chartWidth = 320;
  const paddingX = 15;
  const paddingY = 12;

  const scaleX = (dist: number) =>
    paddingX + (dist / (distanceMeters || 1)) * (chartWidth - 2 * paddingX);
  const scaleY = (elev: number) =>
    chartHeight - paddingY - ((elev - minElevation + 5) / elevRange) * (chartHeight - 2 * paddingY);

  // Generate SVG path for terrain ground
  const groundPath = profile
    .map(
      (pt: ElevationPointData, i: number) =>
        `${i === 0 ? 'M' : 'L'} ${scaleX(pt.distanceMeters).toFixed(1)} ${scaleY(pt.groundElevation).toFixed(1)}`
    )
    .join(' ');

  // Fill area under terrain
  const areaPath = `${groundPath} L ${scaleX(distanceMeters)} ${chartHeight} L ${scaleX(0)} ${chartHeight} Z`;

  // Direct optical ray line
  const rayStart = { x: scaleX(0), y: scaleY(startElevation) };
  const rayEnd = { x: scaleX(distanceMeters), y: scaleY(targetElevation) };

  return (
    <div className="bg-[#141c14] border border-[#2e3d2e] rounded-lg p-3 font-mono text-xs select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#2e3d2e] text-[11px]">
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-[#9ba89b]">LOS PROFILE:</span>
          <span className="font-bold text-[#f5b700] truncate">{targetName}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-black border uppercase ${
              isClear
                ? 'bg-[#4e9b4e]/20 text-[#68d391] border-[#4e9b4e]'
                : 'bg-[#c5221f]/20 text-[#c5221f] border-[#c5221f] animate-pulse'
            }`}
          >
            {isClear ? '● LOS CLEAR' : '▲ RIDGE BLOCKED'}
          </span>
        </div>
      </div>

      {/* Cross-section SVG */}
      <div className="my-2 bg-[#0b0f0b] rounded border border-[#2e3d2e] overflow-hidden relative">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto block"
          style={{ maxHeight: chartHeight }}
        >
          {/* Subtle grid lines */}
          <line
            x1={paddingX}
            y1={chartHeight / 2}
            x2={chartWidth - paddingX}
            y2={chartHeight / 2}
            stroke="#1c261c"
            strokeDasharray="3 3"
          />

          {/* Terrain fill */}
          <path d={areaPath} fill="rgba(59, 83, 35, 0.25)" />
          {/* Terrain ground line */}
          <path d={groundPath} fill="none" stroke="#4e9b4e" strokeWidth="2" strokeLinejoin="round" />

          {/* Direct Optical Ray (yellow dotted or red if blocked) */}
          <line
            x1={rayStart.x}
            y1={rayStart.y}
            x2={rayEnd.x}
            y2={rayEnd.y}
            stroke={isClear ? '#f5b700' : '#c5221f'}
            strokeWidth="1.8"
            strokeDasharray={isClear ? '4 3' : '2 2'}
          />

          {/* Start Point Marker (Operator) */}
          <circle cx={rayStart.x} cy={rayStart.y} r="3.5" fill="#f5b700" />

          {/* Target Point Marker (Objective) */}
          <circle cx={rayEnd.x} cy={rayEnd.y} r="3.5" fill="#68d391" />

          {/* Labels inside SVG */}
          <text x={rayStart.x} y={chartHeight - 4} fill="#9ba89b" fontSize="8" fontFamily="monospace">
            OP ({startElevation}m)
          </text>
          <text
            x={rayEnd.x}
            y={chartHeight - 4}
            fill="#9ba89b"
            fontSize="8"
            fontFamily="monospace"
            textAnchor="end"
          >
            TGT ({targetElevation}m)
          </text>
        </svg>
      </div>

      {/* Metrics Footer */}
      <div className="grid grid-cols-3 gap-2 text-[10px] text-[#9ba89b] pt-1">
        <div>
          <span>DIST / AZ: </span>
          <span className="text-[#e8ede8] font-bold">
            {distanceMeters}m @ {bearingDeg.toString().padStart(3, '0')}°
          </span>
        </div>
        <div className="text-center">
          <span>ALT DELTA: </span>
          <span className="text-[#e8ede8] font-bold">
            {targetElevation >= startElevation ? `+${targetElevation - startElevation}` : `${targetElevation - startElevation}`}m
          </span>
        </div>
        <div className="text-right">
          <span>FRESNEL (868M): </span>
          <span className="text-[#c7a76c] font-bold">±{fresnelRadiusMidpointMeters}m</span>
        </div>
      </div>

      {!isClear && (
        <div className="mt-2 p-1.5 rounded bg-[#c5221f]/15 border border-[#c5221f]/40 text-[10px] text-[#c5221f] flex items-center justify-between">
          <span>⚠️ RIDGE OBSTRUCTION DETECTED:</span>
          <span className="font-bold">+{maxObstructionMeters}m above direct ray</span>
        </div>
      )}
    </div>
  );
};
