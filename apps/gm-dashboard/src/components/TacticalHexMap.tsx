import React, { useState, useEffect, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { ColumnLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import maplibregl from 'maplibre-gl';
import { TacticalHex } from '../stores/gmStore';
import { BlueForcePeer, TacticalMarker } from '@gridcommand/crdt-core';

export interface TacticalHexMapProps {
  hexes: TacticalHex[];
  peers?: Record<string, BlueForcePeer>;
  markers?: Record<string, TacticalMarker>;
  onSelectHex?: (hex: TacticalHex) => void;
}

const INITIAL_VIEW_STATE = {
  longitude: 18.535,
  latitude: 54.405,
  zoom: 13.8,
  pitch: 48,
  bearing: -15,
  maxPitch: 65,
};

export const TacticalHexMap: React.FC<TacticalHexMapProps> = ({
  hexes,
  peers = {},
  markers = {},
  onSelectHex,
}) => {
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
        return [78, 155, 78, 190]; // Squad Alpha: Military Olive Drab / Ranger Green
      case 'squad_bravo':
        return [199, 167, 108, 190]; // Squad Bravo: Coyote Tan / Khaki Brown
      case 'contested':
        return [245, 183, 0, 210]; // Contested: Tactical Amber Yellow
      case 'hazard':
        return [197, 34, 31, 210]; // Hazard: Military Red
      default:
        return [55, 70, 55, 140]; // Uncontested: Field Olive Slate
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
      getLineColor: [245, 183, 0, 220],
      lineWidthMinPixels: 2,
      stroked: true,
      onClick: (info) => {
        if (info.object && onSelectHex) {
          onSelectHex(info.object);
        }
      },
    }),

    // Blue Force Tracking (BFT) Operator Telemetry Nodes
    new ScatterplotLayer<BlueForcePeer>({
      id: 'bft-peers-nodes',
      data: Object.values(peers),
      getPosition: (d) => [d.lon, d.lat, 220],
      getFillColor: (d) =>
        d.squad.toLowerCase().includes('alpha')
          ? [78, 155, 78, 240] // Alpha Olive
          : [199, 167, 108, 240], // Bravo Coyote
      getLineColor: [245, 183, 0, 255],
      lineWidthMinPixels: 2,
      stroked: true,
      radiusMinPixels: 8,
      radiusMaxPixels: 14,
    }),

    // BFT Callsign and Battery Labels
    new TextLayer<BlueForcePeer>({
      id: 'bft-peers-labels',
      data: Object.values(peers),
      getPosition: (d) => [d.lon, d.lat, 240],
      getText: (d) => `${d.callsign} (${d.battery}%)`,
      getSize: 11,
      getColor: [232, 237, 232, 255],
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'bottom',
      fontFamily: 'monospace',
      fontWeight: 'bold',
      background: true,
      getBackgroundColor: [11, 15, 11, 230],
      backgroundPadding: [4, 2],
    }),

    // Field SPOTREP Tactical Markers
    new ScatterplotLayer<TacticalMarker>({
      id: 'spotrep-markers-nodes',
      data: Object.values(markers).filter((m) => m.active),
      getPosition: (d) => [d.lon, d.lat, 210],
      getFillColor: (d) =>
        d.type === 'HOSTILE'
          ? [197, 34, 31, 240] // Hostile Red
          : d.type === 'HAZARD'
            ? [245, 183, 0, 240] // Hazard Amber
            : [104, 211, 145, 240], // Friendly / Supply
      getLineColor: [255, 255, 255, 240],
      lineWidthMinPixels: 2,
      stroked: true,
      radiusMinPixels: 7,
      radiusMaxPixels: 12,
    }),

    // SPOTREP Titles
    new TextLayer<TacticalMarker>({
      id: 'spotrep-markers-labels',
      data: Object.values(markers).filter((m) => m.active),
      getPosition: (d) => [d.lon, d.lat, 230],
      getText: (d) => `[${d.type}] ${d.title}`,
      getSize: 10,
      getColor: [245, 183, 0, 255],
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'bottom',
      fontFamily: 'monospace',
      fontWeight: 'bold',
      background: true,
      getBackgroundColor: [20, 28, 20, 230],
      backgroundPadding: [3, 2],
    }),
  ];

  return (
    <div className="relative w-full h-full bg-[#0b0f0b] overflow-hidden">
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
      <div className="absolute top-4 left-4 z-20 bg-[#141c14]/95 p-2.5 rounded border border-[#2e3d2e] font-mono text-xs backdrop-blur-sm flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#68d391] animate-pulse" />
          <span className="text-[#f5b700] font-bold text-[11px]">BASEMAP: OpenStreetMap</span>
        </div>
        <div className="flex items-center gap-1 border-l border-[#2e3d2e] pl-3">
          <button
            onClick={() => setOsmMode('standard')}
            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border transition-colors ${
              osmMode === 'standard'
                ? 'bg-[#f5b700] text-black border-[#f5b700]'
                : 'text-[#9ba89b] border-[#2e3d2e] hover:text-white bg-[#0b0f0b]'
            }`}
          >
            OSM Full
          </button>
          <button
            onClick={() => setOsmMode('tactical')}
            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border transition-colors ${
              osmMode === 'tactical'
                ? 'bg-[#f5b700] text-black border-[#f5b700]'
                : 'text-[#9ba89b] border-[#2e3d2e] hover:text-white bg-[#0b0f0b]'
            }`}
          >
            OSM Tactical
          </button>
        </div>
      </div>

      {/* Bottom Left: Legend & Attribution */}
      <div className="absolute bottom-4 left-4 z-20 bg-[#141c14]/95 p-3 rounded border border-[#2e3d2e] font-mono text-xs backdrop-blur-sm pointer-events-none">
        <div className="text-[10px] text-[#c7a76c] font-bold mb-1.5 uppercase tracking-wider">
          HEX BATTLE MAP // OPENSTREETMAP BASE
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#4e9b4e]" />
            <span className="text-[#e8ede8]">ALPHA (OLIVE)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#c7a76c]" />
            <span className="text-[#e8ede8]">BRAVO (COYOTE)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#f5b700] animate-pulse" />
            <span className="text-[#e8ede8]">CONTESTED</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#c5221f]" />
            <span className="text-[#e8ede8]">HAZARD ZONE</span>
          </div>
        </div>
        <div className="mt-2 text-[9px] text-[#9ba89b]/80">
          Map data © OpenStreetMap contributors
        </div>
      </div>
    </div>
  );
};
