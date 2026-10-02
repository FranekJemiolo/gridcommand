import React, { useState } from 'react';
import {
  TacticalHeader,
  TacticalButton,
  StatusBadge,
  CompassBearing,
} from '@gridcommand/ui-theme';
import { useGameStore } from './stores/gameStore';
import { TacticalMap } from './components/TacticalMap';
import { GlovePinModal } from './components/GlovePinModal';
import { ScannerModal } from './components/ScannerModal';

export const App: React.FC = () => {
  const {
    redMode,
    rainLock,
    rigPitch,
    heading,
    location,
    graph,
    activeObjectiveId,
    isBreached,
    activeTab,
    meshNeighbors,
    totalUpdatesTransferred,
    setActiveTab,
    toggleRedMode,
    toggleRainLock,
    toggleRigPitch,
    setLocation,
    verifyPin,
    captureObjective,
    forceMeshSync,
    exportSneakernetCRDT,
  } = useGameStore();

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  const activeNode = graph.nodes[activeObjectiveId];

  // Calculate distance and bearing to current active objective
  let distanceMeters = 0;
  let targetBearing = 0;
  if (activeNode && activeNode.lat && activeNode.lon) {
    const dLat = (activeNode.lat - location.lat) * 111000;
    const dLon = (activeNode.lon - location.lon) * 111000 * Math.cos((location.lat * Math.PI) / 180);
    distanceMeters = Math.sqrt(dLat * dLat + dLon * dLon);
    targetBearing = ((Math.atan2(dLon, dLat) * 180) / Math.PI + 360) % 360;
  }

  // Simulate walking toward objective in Gdansk
  const simulateStepCloser = () => {
    if (!activeNode || !activeNode.lat || !activeNode.lon) return;
    const newLat = location.lat + (activeNode.lat - location.lat) * 0.35;
    const newLon = location.lon + (activeNode.lon - location.lon) * 0.35;
    setLocation({ lat: newLat, lon: newLon });
  };

  const handleExportSneakernet = () => {
    const data = exportSneakernetCRDT();
    navigator.clipboard?.writeText?.(data);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  return (
    <div
      className={`relative w-full h-full flex flex-col bg-black text-[#e6edf3] overflow-hidden select-none ${
        redMode ? 'tactical-red-mode' : ''
      }`}
    >
      {/* Tactical Header */}
      <TacticalHeader
        gpsAccuracy={2.8}
        meshNodesCount={meshNeighbors.length}
        batteryPercent={94}
        isRedMode={redMode}
        onToggleRedMode={toggleRedMode}
        isRainLocked={rainLock}
        onToggleRainLock={toggleRainLock}
      />

      {/* Sub-Header: Sector & Mode Tabs */}
      <div className="bg-[#0a0e14] border-b border-[#1e2638] px-3 py-1.5 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(['hud', 'mesh', 'objectives', 'diagnostics'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1 rounded uppercase font-bold text-[10px] tracking-wider transition-all ${
                activeTab === tab
                  ? 'bg-[#00f3ff]/20 text-[#00f3ff] border border-[#00f3ff]'
                  : 'text-[#8b949e] hover:text-[#e6edf3]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-[#8b949e] hidden sm:block">
          GRID: GDAŃSK OLIWA (54.40°N, 18.53°E)
        </div>
      </div>

      {/* TAB 1: TACTICAL RIG HUD */}
      {activeTab === 'hud' && (
        <div className="relative flex-1 w-full overflow-hidden flex flex-col">
          {/* Main Map Viewport */}
          <div className="relative flex-1 w-full overflow-hidden">
            {/* MapLibre 45-degree tactical map with visible OpenStreetMap layout */}
            <div className="absolute inset-0">
              <TacticalMap
                graph={graph}
                activeObjectiveId={activeObjectiveId}
                playerLocation={location}
                playerHeading={heading}
                rigPitch={rigPitch}
              />
            </div>

            {/* Breach Alert Banner */}
            {isBreached && (
              <div className="absolute top-3 inset-x-3 z-30 bg-[#ffe600] text-black font-mono font-black py-2 px-3 rounded shadow-lg text-center animate-bounce text-xs uppercase tracking-wider border-2 border-black">
                ⚠️ GEOFENCE BREACHED (&lt;35m) // SCAN PHYSICAL NTAG215 / QR TOKEN
              </div>
            )}

            {/* Floating Compass HUD */}
            <div className="absolute top-3 right-3 z-20 pointer-events-none">
              <div className="scale-75 origin-top-right">
                <CompassBearing
                  heading={heading}
                  targetBearing={targetBearing}
                  targetDistanceMeters={distanceMeters}
                  targetName={activeNode?.name}
                />
              </div>
            </div>

            {/* Objective Status Bar */}
            <div className="absolute top-3 left-3 z-20 max-w-[210px] bg-[#0a0e14]/90 p-2.5 rounded border border-[#1e2638] font-mono text-xs backdrop-blur-sm">
              <div className="text-[10px] text-[#8b949e]">TARGET OBJECTIVE</div>
              <div className="font-bold text-[#00f3ff] truncate">{activeNode?.name || 'ALL RESOLVED'}</div>
              <div className="mt-1 flex items-center gap-1.5">
                <StatusBadge status={activeNode?.status || 'RESOLVED'} />
                <span className="text-[10px] text-[#ffe600] font-bold">+{activeNode?.points || 0} PTS</span>
              </div>
            </div>
          </div>

          {/* Bottom Rig Controls (60x60px touch zones) */}
          <div className="relative z-30 bg-[#0a0e14] border-t-2 border-[#1e2638] p-3 font-mono">
            <div className="max-w-md mx-auto flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] text-[#8b949e] px-1">
                <span>DIST: {Math.round(distanceMeters)}m</span>
                <span>BEARING: {Math.round(targetBearing).toString().padStart(3, '0')}°</span>
                <button
                  onClick={simulateStepCloser}
                  className="text-[#00f3ff] hover:underline uppercase font-bold"
                >
                  [Simulate Step Closer]
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <TacticalButton
                  variant="cyan"
                  className="h-16 text-xs sm:text-sm font-black"
                  onClick={() => setIsScannerOpen(true)}
                >
                  SCAN TOKEN / NFC
                </TacticalButton>

                <TacticalButton
                  variant="yellow"
                  className="h-16 text-xs sm:text-sm font-black"
                  onClick={() => setIsPinModalOpen(true)}
                >
                  GLOVE PIN ENTRY
                </TacticalButton>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={toggleRigPitch}
                  className="text-[10px] text-[#8b949e] hover:text-[#e6edf3] border border-[#1e2638] px-2 py-1 rounded"
                >
                  RIG PITCH: {rigPitch ? '45° (CHEST)' : '0° (FLAT)'}
                </button>
                <div className="text-[10px] text-[#8b949e]">
                  VOL UP: CONFIRM PIN | VOL DOWN: HUD TOGGLE
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MESH RADAR & COMMS */}
      {activeTab === 'mesh' && (
        <div className="flex-1 p-4 bg-[#0a0e14] font-mono overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#00f3ff]">DECENTRALIZED MESH RADAR</h2>
              <p className="text-xs text-[#8b949e]">Multi-tier BLE Gossip (30m) & Meshtastic LoRa Bridge (2-5km)</p>
            </div>
            <TacticalButton size="compact" variant="cyan" onClick={forceMeshSync}>
              FORCE SYNC
            </TacticalButton>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded bg-black border border-[#1e2638]">
              <span className="text-[#8b949e]">TOTAL CRDT UPDATES:</span>
              <div className="text-xl font-bold text-[#00ff66]">{totalUpdatesTransferred}</div>
            </div>
            <div className="p-3 rounded bg-black border border-[#1e2638]">
              <span className="text-[#8b949e]">LORA CARRIER:</span>
              <div className="text-xl font-bold text-[#ffe600]">868.0 MHz OK</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold text-[#8b949e]">ACTIVE NEIGHBOR NODES IN PROXIMITY</div>
            {meshNeighbors.map((n) => (
              <div
                key={n.id}
                className="p-3 rounded bg-[#121820] border border-[#1e2638] flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-[#e6edf3] flex items-center gap-2">
                    <span>{n.alias}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded border border-[#00f3ff]/40 text-[#00f3ff]">
                      {n.role}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#8b949e] mt-1">
                    SQUAD: {n.squad} | HOPS: {n.hops} | LAST SEEN: {n.lastSeenSec}s AGO
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${n.rssi > -70 ? 'text-[#00ff66]' : 'text-[#ffe600]'}`}>
                    {n.rssi} dBm
                  </div>
                  <div className="text-[10px] text-[#8b949e]">
                    {n.loraActive ? '● LoRa Bridge' : '○ BLE Only'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: OBJECTIVES & DAG PROGRESS */}
      {activeTab === 'objectives' && (
        <div className="flex-1 p-4 bg-[#0a0e14] font-mono overflow-y-auto space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#00f3ff]">MISSION OBJECTIVES DAG</h2>
            <p className="text-xs text-[#8b949e]">Deterministic client-side state machine</p>
          </div>

          <div className="space-y-3">
            {Object.values(graph.nodes).map((node, i) => (
              <div
                key={node.id}
                className="p-3.5 rounded bg-[#121820] border border-[#1e2638] text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-[#e6edf3]">
                    {i + 1}. {node.name}
                  </div>
                  <StatusBadge status={node.status} />
                </div>
                <div className="text-[11px] text-[#8b949e]">
                  POINTS: <span className="text-[#ffe600] font-bold">+{node.points}</span> | PREREQUISITES:{' '}
                  {node.prerequisites.length > 0 ? node.prerequisites.join(', ') : 'NONE (GENESIS)'}
                </div>
                {node.owner && (
                  <div className="text-[11px] text-[#00ff66]">CONTROLLED BY: {node.owner.toUpperCase()}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SNEAKERNET & DIAGNOSTICS */}
      {activeTab === 'diagnostics' && (
        <div className="flex-1 p-4 bg-[#0a0e14] font-mono overflow-y-auto space-y-4 text-xs">
          <div>
            <h2 className="text-base font-bold text-[#00f3ff]">SNEAKERNET OTG & DIAGNOSTICS</h2>
            <p className="text-xs text-[#8b949e]">Air-gapped disaster recovery tools</p>
          </div>

          <div className="p-4 rounded bg-[#121820] border border-[#1e2638] space-y-3">
            <div className="font-bold text-white">LEVEL 2 EMERGENCY USB-C EXPORT</div>
            <p className="text-[11px] text-[#8b949e] leading-relaxed">
              If all Bluetooth and LoRa RF layers collapse due to jamming or hardware failures, export the cryptographic Yjs event ledger snapshot to clipboard or USB-C drive for runner physical transport to Basecamp.
            </p>
            <TacticalButton variant="yellow" fullWidth onClick={handleExportSneakernet}>
              EXPORT .GRIDCRDT TO CLIPBOARD
            </TacticalButton>
            {copiedNotification && (
              <div className="text-[#00ff66] font-bold text-center">
                ✓ .GRIDCRDT JSON EXPORTED SUCCESSFULLY!
              </div>
            )}
          </div>

          <div className="p-4 rounded bg-black border border-[#1e2638] text-[11px] text-[#8b949e] space-y-1">
            <div>DEVICE IDENTIFIER: devAlphaPointman</div>
            <div>LOCAL HLC: {useGameStore.getState().clock.now()}</div>
            <div>COORDINATES: 54.4080°N, 18.5385°E</div>
            <div>BATTERY PROFILE: 10,000mAh Ultralight sustained</div>
          </div>
        </div>
      )}

      {/* Rain Lock Guard Overlay */}
      {rainLock && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 text-center select-none font-mono">
          <div className="w-20 h-20 rounded-full border-4 border-[#ffe600] flex items-center justify-center text-3xl mb-4 animate-pulse">
            🔒
          </div>
          <div className="text-xl font-black text-[#ffe600] tracking-wider mb-2">
            RAIN LOCK ENGAGED
          </div>
          <div className="text-xs text-[#8b949e] max-w-xs mb-6">
            Capacitive touch disabled to prevent false drops. Use hardware volume buttons to operate.
          </div>
          <TacticalButton
            variant="yellow"
            className="w-full max-w-xs h-16 font-black"
            onClick={toggleRainLock}
          >
            DISENGAGE RAIN LOCK
          </TacticalButton>
        </div>
      )}

      {/* Modals */}
      <GlovePinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSubmitPin={verifyPin}
        objectiveName={activeNode?.name || ''}
      />

      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(proof) => {
          if (activeNode) {
            captureObjective(activeNode.id, proof);
          }
        }}
        objectiveName={activeNode?.name || ''}
      />
    </div>
  );
};

export default App;
