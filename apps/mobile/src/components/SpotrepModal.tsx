import React, { useState } from 'react';
import { TacticalButton } from '@gridcommand/ui-theme';
import { TacticalMarkerType } from '@gridcommand/crdt-core';

export interface SpotrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSpotrep: (report: {
    type: TacticalMarkerType;
    title: string;
    notes?: string;
  }) => void;
}

const MARKER_TYPES: {
  type: TacticalMarkerType;
  label: string;
  desc: string;
  icon: string;
  color: string;
  presets: string[];
}[] = [
  {
    type: 'HOSTILE',
    label: 'HOSTILE CONTACT',
    desc: 'Report enemy infantry, sniper, or vehicle sighting',
    icon: '🔴',
    color: '#c5221f',
    presets: ['2x Infantry Visual', 'Sniper North Ridge', 'Patrol Vehicle Bearing 040°'],
  },
  {
    type: 'HAZARD',
    label: 'HAZARD / OBSTACLE',
    desc: 'Minefield, barbed wire, or impassable swamp',
    icon: '⚠️',
    color: '#f5b700',
    presets: ['Tripwire Detected', 'Impassable Ravine', 'Chemical / Smoke Hazard'],
  },
  {
    type: 'MEDEVAC',
    label: 'MEDEVAC / CASUALTY',
    desc: 'Operator down or urgent medical extraction',
    icon: '🚑',
    color: '#e53e3e',
    presets: ['Operator Down (P2)', 'Heat Exhaustion', 'Urgent Litter Required'],
  },
  {
    type: 'SUPPLY',
    label: 'SUPPLY / AMMO CACHE',
    desc: 'Equipment cache, battery depot, or water drop',
    icon: '📦',
    color: '#4e9b4e',
    presets: ['Battery Resupply Drop', 'Ammo Cache Bunker', 'Medical Kit Staged'],
  },
  {
    type: 'RALLY',
    label: 'RALLY POINT / WAYPOINT',
    desc: 'Squad coordination point or fall-back location',
    icon: '🎯',
    color: '#c7a76c',
    presets: ['Alpha Fallback Alpha-1', 'Extraction Staging Zone', 'Overwatch Ridge'],
  },
];

export const SpotrepModal: React.FC<SpotrepModalProps> = ({
  isOpen,
  onClose,
  onSubmitSpotrep,
}) => {
  const [selectedType, setSelectedType] = useState<TacticalMarkerType>('HOSTILE');
  const [title, setTitle] = useState('2x Infantry Visual');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const currentConfig = MARKER_TYPES.find((m) => m.type === selectedType) || MARKER_TYPES[0];

  const handleSelectType = (type: TacticalMarkerType) => {
    setSelectedType(type);
    const cfg = MARKER_TYPES.find((m) => m.type === type);
    if (cfg && cfg.presets[0]) {
      setTitle(cfg.presets[0]);
    }
  };

  const handleTransmit = () => {
    onSubmitSpotrep({
      type: selectedType,
      title: title || currentConfig.presets[0],
      notes: notes || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 font-mono select-none">
      <div className="w-full max-w-md bg-[#141c14] border-2 border-[#453724] rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-3 bg-[#1c261c] border-b border-[#2e3d2e] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f5b700] animate-pulse" />
            <h3 className="text-xs font-black tracking-wider text-[#f5b700] uppercase">
              DROP TACTICAL SPOTREP
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
          {/* Category Selector */}
          <div>
            <label className="text-[10px] text-[#9ba89b] uppercase font-bold block mb-1.5">
              1. REPORT CLASSIFICATION
            </label>
            <div className="grid grid-cols-2 gap-2">
              {MARKER_TYPES.map((item) => (
                <button
                  key={item.type}
                  onClick={() => handleSelectType(item.type)}
                  className={`p-2.5 rounded text-left border flex items-center gap-2 transition-all ${
                    selectedType === item.type
                      ? 'bg-[#1c261c] border-[#f5b700] shadow-[0_0_8px_rgba(245,183,0,0.3)]'
                      : 'bg-[#0b0f0b] border-[#2e3d2e] text-[#9ba89b] hover:border-[#4e9b4e]'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <div>
                    <div
                      className="font-bold text-[11px]"
                      style={{ color: selectedType === item.type ? item.color : '#e8ede8' }}
                    >
                      {item.label}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="text-[10px] text-[#9ba89b] uppercase font-bold block mb-1.5">
              2. RAPID FIELD TEMPLATES
            </label>
            <div className="flex flex-wrap gap-1.5">
              {currentConfig.presets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setTitle(preset)}
                  className={`px-2.5 py-1.5 rounded text-[10px] border transition-all ${
                    title === preset
                      ? 'bg-[#3b5323]/50 text-[#f5b700] border-[#f5b700] font-bold'
                      : 'bg-[#0b0f0b] text-[#9ba89b] border-[#2e3d2e] hover:text-[#e8ede8]'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Description */}
          <div>
            <label className="text-[10px] text-[#9ba89b] uppercase font-bold block mb-1">
              3. CUSTOM CALLOUT / CALLSIGN
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Hostile Fire Team sighted"
              className="w-full bg-[#0b0f0b] border border-[#2e3d2e] rounded px-3 py-2 text-xs text-[#e8ede8] focus:outline-none focus:border-[#f5b700]"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="text-[10px] text-[#9ba89b] uppercase font-bold block mb-1">
              OPTIONAL INTEL (GRID BEARING / RANGE)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Distance ~150m, moving SE toward Bunker 01"
              className="w-full bg-[#0b0f0b] border border-[#2e3d2e] rounded px-3 py-2 text-xs text-[#9ba89b] focus:outline-none focus:border-[#f5b700]"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-[#1c261c] border-t border-[#2e3d2e] flex items-center justify-between gap-3">
          <TacticalButton variant="neutral" size="compact" onClick={onClose}>
            CANCEL
          </TacticalButton>
          <TacticalButton
            variant="yellow"
            className="flex-1 h-12 text-xs font-black"
            onClick={handleTransmit}
          >
            TRANSMIT SPOTREP OVER MESH
          </TacticalButton>
        </div>
      </div>
    </div>
  );
};
