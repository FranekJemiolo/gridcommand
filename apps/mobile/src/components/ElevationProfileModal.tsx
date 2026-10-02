import React from 'react';
import { TacticalButton, ElevationProfileWidget } from '@gridcommand/ui-theme';
import { computeElevationProfile, MissionNode } from '@gridcommand/crdt-core';

export interface ElevationProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerLocation: { lat: number; lon: number };
  activeObjective: MissionNode | null;
}

export const ElevationProfileModal: React.FC<ElevationProfileModalProps> = ({
  isOpen,
  onClose,
  playerLocation,
  activeObjective,
}) => {
  if (!isOpen || !activeObjective || activeObjective.lat === undefined || activeObjective.lon === undefined) {
    return null;
  }

  const analysis = computeElevationProfile(
    { lat: playerLocation.lat, lon: playerLocation.lon },
    { lat: activeObjective.lat, lon: activeObjective.lon },
    36
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 font-mono select-none">
      <div className="w-full max-w-lg bg-[#141c14] border-2 border-[#453724] rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-3 bg-[#1c261c] border-b border-[#2e3d2e] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f5b700] animate-pulse" />
            <h3 className="text-xs font-black tracking-wider text-[#f5b700] uppercase">
              TERRAIN ELEVATION &amp; LINE-OF-SIGHT (LOS) ANALYZER
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-[#9ba89b] hover:text-[#e8ede8] px-2 py-1 rounded bg-[#0b0f0b] border border-[#2e3d2e]"
          >
            ✕ ESC
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Main Visual Profile Widget */}
          <ElevationProfileWidget
            analysis={analysis}
            targetName={activeObjective.name}
            isCompact={false}
          />

          {/* Tactical Assessment Card */}
          <div className="p-3 rounded-lg bg-[#0b0f0b] border border-[#2e3d2e] space-y-2 text-[11px]">
            <div className="text-[#f5b700] font-bold uppercase tracking-wider">
              FIELD TOPOGRAPHY ASSESSMENT:
            </div>
            <div className="grid grid-cols-2 gap-2 text-[#9ba89b]">
              <div>
                <span>MIN / MAX ELEVATION: </span>
                <span className="text-[#e8ede8] font-bold">
                  {analysis.minElevation}m / {analysis.maxElevation}m
                </span>
              </div>
              <div>
                <span>TOTAL ASCENT: </span>
                <span className="text-[#68d391] font-bold">+{analysis.netAscent}m</span>
              </div>
              <div>
                <span>TARGET AZIMUTH: </span>
                <span className="text-[#e8ede8] font-bold">{analysis.bearingDeg}° TRUE</span>
              </div>
              <div>
                <span>TOTAL DESCENT: </span>
                <span className="text-[#c7a76c] font-bold">-{analysis.netDescent}m</span>
              </div>
            </div>

            <div className="border-t border-[#2e3d2e] pt-2 text-[10px] text-[#9ba89b] leading-relaxed">
              {analysis.isClear ? (
                <span className="text-[#68d391]">
                  ✓ Optical line of sight is completely unimpeded. Direct visual acquisition and LoRa 868 MHz RF links are clear of topological earth curvature and ridge interference.
                </span>
              ) : (
                <span className="text-[#c5221f]">
                  ⚠️ Terrain ridge obstruction detected along the direct vector. Operator is in dead ground relative to target antenna. Recommend relaying via high-ground squad leader or Data Mule.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#1c261c] border-t border-[#2e3d2e] flex items-center justify-end">
          <TacticalButton variant="neutral" size="compact" onClick={onClose}>
            CLOSE
          </TacticalButton>
        </div>
      </div>
    </div>
  );
};
