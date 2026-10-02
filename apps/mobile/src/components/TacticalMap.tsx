import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { MissionGraph, BlueForcePeer, TacticalMarker } from '@gridcommand/crdt-core';

// Register PMTiles protocol handler once
const protocol = new Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

export interface TacticalMapProps {
  graph: MissionGraph;
  activeObjectiveId: string;
  playerLocation: { lat: number; lon: number };
  playerHeading: number;
  rigPitch?: boolean;
  peers?: Record<string, BlueForcePeer>;
  markers?: Record<string, TacticalMarker>;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  graph,
  activeObjectiveId,
  playerLocation,
  playerHeading,
  rigPitch = true,
  peers = {},
  markers = {},
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [id: string]: maplibregl.Marker }>({});
  const peerMarkersRef = useRef<{ [id: string]: maplibregl.Marker }>({});
  const spotrepMarkersRef = useRef<{ [id: string]: maplibregl.Marker }>({});
  const playerMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Tactical Dark Vector Style
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'base-tiles',
            type: 'raster',
            source: 'osm',
            paint: {
              'raster-brightness-max': 0.95,
              'raster-contrast': 0.15,
              'raster-saturation': -0.1,
            },
          },
        ],
      },
      center: [playerLocation.lon, playerLocation.lat],
      zoom: 15.2,
      pitch: rigPitch ? 45 : 0,
      bearing: playerHeading,
      attributionControl: false,
    });

    mapRef.current = map;

    // Player position marker (Military Tactical Amber with Olive Halo)
    const el = document.createElement('div');
    el.className = 'player-marker';
    el.innerHTML = `
      <div style="width: 28px; height: 28px; background: rgba(59, 83, 35, 0.35); border: 2px solid #f5b700; border-radius: 50%; display: flex; align-items: center; justify-content: center; position: relative; box-shadow: 0 0 10px rgba(245, 183, 0, 0.5);">
        <div style="width: 8px; height: 8px; background: #f5b700; border-radius: 50%;"></div>
        <div style="position: absolute; top: -6px; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 7px solid #f5b700;"></div>
      </div>
    `;

    const playerMarker = new maplibregl.Marker({ element: el })
      .setLngLat([playerLocation.lon, playerLocation.lat])
      .addTo(map);
    playerMarkerRef.current = playerMarker;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update pitch when rigPitch changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.easeTo({
        pitch: rigPitch ? 45 : 0,
        bearing: playerHeading,
        duration: 300,
      });
    }
  }, [rigPitch, playerHeading]);

  // Update player marker position
  useEffect(() => {
    if (playerMarkerRef.current) {
      playerMarkerRef.current.setLngLat([playerLocation.lon, playerLocation.lat]);
    }
  }, [playerLocation]);

  // Update Objective Markers
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Remove old markers that aren't in graph
    Object.keys(markersRef.current).forEach((id) => {
      if (!graph.nodes[id]) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Add or update markers
    Object.values(graph.nodes).forEach((node) => {
      if (node.lat === undefined || node.lon === undefined) return;

      const isCurrentActive = node.id === activeObjectiveId;
      const statusColor =
        node.status === 'RESOLVED'
          ? '#68d391'
          : node.status === 'ACTIVE'
            ? '#f5b700'
            : '#8a6240';

      if (!markersRef.current[node.id]) {
        const markerEl = document.createElement('div');
        markerEl.className = `tactical-node-marker node-${node.id}`;
        markerEl.innerHTML = `
          <div style="padding: 4px 8px; background: rgba(20, 28, 20, 0.92); border: 2px solid ${statusColor}; border-radius: 4px; font-family: monospace; font-size: 10px; font-weight: bold; color: ${statusColor}; text-transform: uppercase; white-space: nowrap; box-shadow: 0 0 10px rgba(0,0,0,0.85);">
            ${node.name}
          </div>
        `;
        const marker = new maplibregl.Marker({ element: markerEl })
          .setLngLat([node.lon, node.lat])
          .addTo(map);

        markersRef.current[node.id] = marker;
      } else {
        // Update existing marker element style
        const el = markersRef.current[node.id].getElement();
        el.innerHTML = `
          <div style="padding: 4px 8px; background: rgba(20, 28, 20, 0.92); border: 2px solid ${statusColor}; border-radius: 4px; font-family: monospace; font-size: 10px; font-weight: bold; color: ${statusColor}; text-transform: uppercase; white-space: nowrap; ${
            isCurrentActive ? 'box-shadow: 0 0 15px rgba(245, 183, 0, 0.7);' : ''
          }">
            ${node.name} [${node.status}]
          </div>
        `;
      }
    });
  }, [graph, activeObjectiveId]);

  // Update Blue Force Tracking (BFT) Teammates
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clean up removed peers
    Object.keys(peerMarkersRef.current).forEach((id) => {
      if (!peers[id]) {
        peerMarkersRef.current[id].remove();
        delete peerMarkersRef.current[id];
      }
    });

    // Add or update peer markers
    Object.values(peers).forEach((peer) => {
      const isAlpha = peer.squad.toLowerCase().includes('alpha');
      const squadColor = isAlpha ? '#4e9b4e' : '#c7a76c';
      const roleBadge = peer.role.substring(0, 3);
      const headingDeg = peer.heading || 0;

      if (!peerMarkersRef.current[peer.id]) {
        const el = document.createElement('div');
        el.className = `tactical-peer-marker peer-${peer.id}`;
        el.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="width: 22px; height: 22px; background: rgba(20, 28, 20, 0.9); border: 2px solid ${squadColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; transform: rotate(${headingDeg}deg); box-shadow: 0 0 8px ${squadColor};">
              <div style="width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-bottom: 7px solid ${squadColor};"></div>
            </div>
            <div style="margin-top: 2px; padding: 1px 4px; background: #0b0f0b; border: 1px solid ${squadColor}; border-radius: 3px; font-family: monospace; font-size: 8px; font-weight: bold; color: ${squadColor}; white-space: nowrap;">
              ${peer.callsign} [${roleBadge}]
            </div>
          </div>
        `;
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([peer.lon, peer.lat])
          .addTo(map);
        peerMarkersRef.current[peer.id] = marker;
      } else {
        peerMarkersRef.current[peer.id].setLngLat([peer.lon, peer.lat]);
        const el = peerMarkersRef.current[peer.id].getElement();
        const iconDiv = el.querySelector('div > div:first-child') as HTMLElement | null;
        if (iconDiv) {
          iconDiv.style.transform = `rotate(${headingDeg}deg)`;
        }
      }
    });
  }, [peers]);

  // Update Field SPOTREP Markers
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clean up removed markers
    Object.keys(spotrepMarkersRef.current).forEach((id) => {
      if (!markers[id] || !markers[id].active) {
        spotrepMarkersRef.current[id].remove();
        delete spotrepMarkersRef.current[id];
      }
    });

    // Add or update spotrep markers
    Object.values(markers).forEach((m) => {
      if (!m.active) return;
      const typeIcons: Record<string, string> = {
        HOSTILE: '🔴',
        HAZARD: '⚠️',
        MEDEVAC: '🚑',
        SUPPLY: '📦',
        RALLY: '🎯',
      };
      const icon = typeIcons[m.type] || '📍';
      const color =
        m.type === 'HOSTILE'
          ? '#c5221f'
          : m.type === 'HAZARD'
            ? '#f5b700'
            : m.type === 'MEDEVAC'
              ? '#e53e3e'
              : m.type === 'SUPPLY'
                ? '#4e9b4e'
                : '#c7a76c';

      if (!spotrepMarkersRef.current[m.id]) {
        const el = document.createElement('div');
        el.className = `tactical-spotrep-marker marker-${m.id}`;
        el.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; filter: drop-shadow(0 0 6px rgba(0,0,0,0.9));">
            <div style="font-size: 16px; line-height: 1; transform: scale(1.1); animation: bounce 1.5s infinite;">
              ${icon}
            </div>
            <div style="margin-top: 1px; padding: 2px 5px; background: rgba(11, 15, 11, 0.95); border: 1px solid ${color}; border-radius: 3px; font-family: monospace; font-size: 8px; font-weight: bold; color: ${color}; white-space: nowrap;">
              ${m.title}
            </div>
          </div>
        `;
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([m.lon, m.lat])
          .addTo(map);
        spotrepMarkersRef.current[m.id] = marker;
      } else {
        spotrepMarkersRef.current[m.id].setLngLat([m.lon, m.lat]);
      }
    });
  }, [markers]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      <div className="absolute bottom-1 right-2 text-[9px] text-[#9ba89b] bg-[#141c14]/80 px-1.5 py-0.5 rounded font-mono pointer-events-none z-10 border border-[#2e3d2e]">
        © OpenStreetMap
      </div>
    </div>
  );
};
