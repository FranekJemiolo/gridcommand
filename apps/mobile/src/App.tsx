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
    toggleRedMode,
    toggleRainLock,
    toggleRigPitch,
    setHeading,
    setLocation,
    verifyPin,
    captureObjective,
  } = useGameStore();

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [rainUnlockProgress, setRainUnlockProgress] = useState(0);

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

  // Simulate walking toward objective
  const simulateStepCloser = () => {
    if (!activeNode || !activeNode.lat || !activeNode.lon) return;
    const newLat = location.lat + (activeNode.lat - location.lat) * 0.35;
    const newLon = location.lon + (activeNode.lon - location.lon) * 0.35;
    setLocation({ lat: newLat, lon: newLon });
  };

  return (
    <div
      className={`relative w-full h-full flex flex-col bg-black text-[#e6edf3] overflow-hidden select-none ${
        redMode ? 'tactical-red-mode' : ''
      }`}
    >
      {/* Tactical Header */}
      <TacticalHeader
        gpsAccuracy={3.2}
        meshNodesCount={4}
        batteryPercent={88}
        isRedMode={redMode}
        onToggleRedMode={toggleRedMode}
        isRainLocked={rainLock}
        onToggleRainLock={toggleRainLock}
      />

      {/* Main Viewport */}
      <div className="relative flex-1 w-full overflow-hidden">
        {/* MapLibre 45-degree tactical map */}
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

        {/* Floating Compass HUD (Glanceable pointman deck) */}
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
        <div className="absolute top-3 left-3 z-20 max-w-[200px] bg-[#0a0e14]/90 p-2.5 rounded border border-[#1e2638] font-mono text-xs backdrop-blur-sm">
          <div className="text-[10px] text-[#8b949e]">TARGET OBJECTIVE</div>
          <div className="font-bold text-[#00f3ff] truncate">{activeNode?.name || 'ALL RESOLVED'}</div>
          <div className="mt-1 flex items-center gap-1">
            <StatusBadge status={activeNode?.status || 'RESOLVED'} />
            <span className="text-[10px] text-[#ffe600] font-bold">+{activeNode?.points || 0} PTS</span>
          </div>
        </div>
      </div>

      {/* Bottom Rig Mode Controls (Optimized for 45-degree viewing and thumb reach) */}
      <div className="relative z-30 bg-[#0a0e14] border-t-2 border-[#1e2638] p-3 font-mono">
        <div className="max-w-md mx-auto flex flex-col gap-2">
          {/* Quick Telemetry & Simulation Controls */}
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

          {/* Primary 60x60px Tactical Actions */}
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

          {/* Secondary Rig Toggle Bar */}
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
