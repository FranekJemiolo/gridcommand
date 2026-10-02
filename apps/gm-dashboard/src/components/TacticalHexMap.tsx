import React, { useState, useEffect, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { ColumnLayer } from '@deck.gl/layers';
import maplibregl from 'maplibre-gl';
import { TacticalHex } from '../stores/gmStore';

export interface TacticalHexMapProps {
  hexes: TacticalHex[];
  onSelectHex?: (hex: TacticalHex) => void;
}

const INITIAL_VIEW_STATE = {
  longitude: 21.228,
  latitude: 52.13,
  zoom: 13.5,
  pitch: 45,
  bearing: -15,
  maxPitch: 65,
};

export const TacticalHexMap: React.FC<TacticalHexMapProps> = ({ hexes, onSelectHex }) => {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [osmMode, setOsmMode] = useState<'standard' | 'tactical'>('standard');
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Initialize MapLibre GL instance with OpenStreetMap tiles
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm',
            paint: {
              'raster-brightness-max': osmMode === 'standard' ? 0.95 : 0.45,
              'raster-contrast': osmMode === 'standard' ? 0.1 : 0.35,
              'raster-saturation': osmMode === 'standard' ? 0.0 : -0.85,
            },
          },
        ],
      },
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
      pitch: viewState.pitch,
      bearing: viewState.bearing,
      interactive: false, // Deck.gl drives the camera
      attributionControl: false,
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update MapLibre style when osmMode changes
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (map.getLayer('osm-tiles')) {
      map.setPaintProperty(
        'osm-tiles',
        'raster-brightness-max',
        osmMode === 'standard' ? 0.95 : 0.45
      );
      map.setPaintProperty(
        'osm-tiles',
        'raster-saturation',
        osmMode === 'standard' ? 0.0 : -0.85
      );
    }
  }, [osmMode]);

  // Sync MapLibre camera with Deck.gl controller
  const handleViewStateChange = (params: { viewState: any }) => {
    const nextViewState = params.viewState;
    setViewState(nextViewState);
    if (mapRef.current) {
      mapRef.current.jumpTo({
        center: [nextViewState.longitude, nextViewState.latitude],
        zoom: nextViewState.zoom,
        bearing: nextViewState.bearing,
        pitch: nextViewState.pitch,
      });
    }
  };

  const getColor = (owner: TacticalHex['owner']): [number, number, number, number] => {
    switch (owner) {
      case 'squad_alpha':
        return [0, 119, 255, 175]; // Alpha Blue (translucent to reveal OSM streets underneath)
      case 'squad_bravo':
        return [255, 34, 0, 175]; // Bravo Red
      case 'contested':
        return [255, 85, 0, 200]; // Flashing Orange
      case 'hazard':
        return [255, 230, 0, 200]; // Toxic Yellow
      default:
        return [45, 60, 80, 120]; // Uncontested Slate
    }
  };

  const layers = [
    // 3D Tactical Hexagon Columns
    new ColumnLayer<TacticalHex>({
      id: 'tactical-hex-columns',
      data: hexes,
      diskResolution: 6, // 6 vertices = True Hexagon
      radius: 300, // meters
      extruded: true,
      pickable: true,
      elevationScale: 1.5,
      getPosition: (d) => [d.coordinates[0], d.coordinates[1]],
      getFillColor: (d) => getColor(d.owner),
      getElevation: (d) => d.elevation,
      getLineColor: [0, 243, 255, 220],
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
    <div className="relative w-full h-full bg-[#05080c] overflow-hidden">
      {/* MapLibre GL Background Container: renders live OpenStreetMap layout */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0 w-full h-full pointer-events-none" />

      {/* DeckGL Canvas: 3D interactive layer rendered on top */}
      <div className="absolute inset-0 z-10 w-full h-full">
        <DeckGL
          viewState={viewState}
          onViewStateChange={handleViewStateChange}
          controller={true}
          layers={layers}
          getCursor={({ isHovering }) => (isHovering ? 'pointer' : 'default')}
          style={{ background: 'transparent' }}
        />
      </div>

      {/* Top Left: OpenStreetMap Layout Toggle */}
      <div className="absolute top-4 left-4 z-20 bg-[#0a0e14]/90 p-2.5 rounded border border-[#1e2638] font-mono text-xs backdrop-blur-sm flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse" />
          <span className="text-[#00f3ff] font-bold text-[11px]">BASEMAP: OpenStreetMap</span>
        </div>
        <div className="flex items-center gap-1 border-l border-[#1e2638] pl-3">
          <button
            onClick={() => setOsmMode('standard')}
            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border transition-colors ${
              osmMode === 'standard'
                ? 'bg-[#00f3ff] text-black border-[#00f3ff]'
                : 'text-[#8b949e] border-[#1e2638] hover:text-white'
            }`}
          >
            OSM Full
          </button>
          <button
            onClick={() => setOsmMode('tactical')}
            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border transition-colors ${
              osmMode === 'tactical'
                ? 'bg-[#00f3ff] text-black border-[#00f3ff]'
                : 'text-[#8b949e] border-[#1e2638] hover:text-white'
            }`}
          >
            OSM Tactical
          </button>
        </div>
      </div>

      {/* Bottom Left: Legend & Attribution */}
      <div className="absolute bottom-4 left-4 z-20 bg-[#0a0e14]/90 p-3 rounded border border-[#1e2638] font-mono text-xs backdrop-blur-sm pointer-events-none">
        <div className="text-[10px] text-[#8b949e] font-bold mb-1.5 uppercase tracking-wider">
          HEX BATTLE MAP // OPENSTREETMAP BASE
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
        <div className="mt-2 text-[9px] text-[#8b949e]/80">
          Map data © OpenStreetMap contributors
        </div>
      </div>
    </div>
  );
};
