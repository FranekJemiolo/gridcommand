import React from 'react';
import DeckGL from '@deck.gl/react';
import { ColumnLayer } from '@deck.gl/layers';
import { TacticalHex } from '../stores/gmStore';

export interface TacticalHexMapProps {
  hexes: TacticalHex[];
  onSelectHex?: (hex: TacticalHex) => void;
}

const INITIAL_VIEW_STATE = {
  longitude: 21.228,
  latitude: 52.13,
  zoom: 13.8,
  pitch: 50,
  bearing: -15,
  maxPitch: 65,
};

export const TacticalHexMap: React.FC<TacticalHexMapProps> = ({ hexes, onSelectHex }) => {
  const getColor = (owner: TacticalHex['owner']): [number, number, number, number] => {
    switch (owner) {
      case 'squad_alpha':
        return [0, 119, 255, 210]; // Alpha Blue
      case 'squad_bravo':
        return [255, 34, 0, 210]; // Bravo Red
      case 'contested':
        return [255, 85, 0, 240]; // Flashing Orange
      case 'hazard':
        return [255, 230, 0, 240]; // Toxic Yellow
      default:
        return [60, 75, 95, 140]; // Uncontested Slate
    }
  };

  const layers = [
    new ColumnLayer<TacticalHex>({
      id: 'tactical-hex-columns',
      data: hexes,
      diskResolution: 6, // 6 vertices = True Hexagon
      radius: 280, // meters
      extruded: true,
      pickable: true,
      elevationScale: 1.5,
      getPosition: (d) => [d.coordinates[0], d.coordinates[1]],
      getFillColor: (d) => getColor(d.owner),
      getElevation: (d) => d.elevation,
      getLineColor: [0, 243, 255, 180],
      lineWidthMinPixels: 2,
      stroked: true,
      onClick: (info) => {
        if (info.object && onSelectHex) {
          onSelectHex(info.object);
        }
      },
    }),
  ];

  return (
    <div className="relative w-full h-full bg-[#05080c]">
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
        getCursor={({ isHovering }) => (isHovering ? 'pointer' : 'default')}
      />

      {/* Grid Overlay Coordinates & Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-[#0a0e14]/90 p-3 rounded border border-[#1e2638] font-mono text-xs backdrop-blur-sm pointer-events-none">
        <div className="text-[10px] text-[#8b949e] font-bold mb-1.5 uppercase tracking-wider">
          HEX BATTLE MAP // LEGEND
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#0077ff]" />
            <span>SQUAD ALPHA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#ff2200]" />
            <span>SQUAD BRAVO</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#ff5500] animate-pulse" />
            <span>CONTESTED</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#ffe600]" />
            <span>HAZARD ZONE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
