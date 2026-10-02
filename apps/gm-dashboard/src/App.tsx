import React, { useState, useMemo } from 'react';
import { useGMStore, TacticalHex } from './stores/gmStore';
import { TacticalHexMap } from './components/TacticalHexMap';
import { TemporalScrubber } from './components/TemporalScrubber';
import { EventTicker } from './components/EventTicker';
import { AdminConsole } from './components/AdminConsole';
import {
  latLonToMGRS,
  computeElevationProfile,
  getDefaultRoster,
  addDependency,
  removeDependency,
  revokeOperator,
  reinstateOperator,
  createSignedMissionManifest,
  exportManifestToJSON,
  generateAARMissionReplay,
  OperatorRosterEntry,
} from '@gridcommand/crdt-core';
import {
  ElevationProfileWidget,
  MissionDAGEditorWidget,
  AARPlaybackWidget,
  TacticalButton,
} from '@gridcommand/ui-theme';
import { generateKeyPair, toHexString } from '@gridcommand/crypto';

export const App: React.FC = () => {
  const {
    matchId,
    isLive,
    scrubPosition,
    globalFreeze,
    graph,
    hexes,
    peers,
    markers,
    ticker,
    activeHazard,
    setGraph,
    setIsLive,
    setScrubPosition,
    toggleGlobalFreeze,
    forceResolve,
    injectHazard,
  } = useGMStore();

  const [selectedHex, setSelectedHex] = useState<TacticalHex | null>(null);
  const [showLosModal, setShowLosModal] = useState<boolean>(false);
  const [showMissionBuilder, setShowMissionBuilder] = useState<boolean>(false);
  const [showAARModal, setShowAARModal] = useState<boolean>(false);
  const [roster, setRoster] = useState<OperatorRosterEntry[]>(getDefaultRoster());

  const aarReplay = useMemo(() => generateAARMissionReplay('MISSION_GDANSK_2026', 1800), []);

  // Default GM Basecamp coordinates in Oliwa
  const basecampLat = 54.4095;
  const basecampLon = 18.541;
  const basecampMGRS = latLonToMGRS(basecampLat, basecampLon).formatted;

  const handleAddDependency = (parentId: string, childId: string) => {
    const result = addDependency(graph, parentId, childId);
    if (result.success) {
      setGraph(result.graph);
    } else {
      alert(`Dependency error: ${result.error}`);
    }
  };

  const handleRemoveDependency = (parentId: string, childId: string) => {
    const nextGraph = removeDependency(graph, parentId, childId);
    setGraph(nextGraph);
  };

  const handleToggleRevokeOperator = (operatorId: string) => {
    const target = roster.find((o) => o.id === operatorId);
    if (!target) return;
    const nextRoster = target.revoked
      ? reinstateOperator(roster, operatorId)
      : revokeOperator(roster, operatorId);
    setRoster(nextRoster);
  };

  const handleExportManifest = () => {
    const { privateKey, publicKey } = generateKeyPair();
    const manifest = createSignedMissionManifest(
      {
        missionId: `MISSION_${matchId}`,
        title: 'Operation Baltic Shield 2026',
        description: 'Tactical field simulation over Gdańsk Oliwa moraine hills.',
        authorPublicKey: toHexString(publicKey),
        graph,
        roster,
      },
      privateKey
    );
    const jsonStr = exportManifestToJSON(manifest);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manifest_${matchId.toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate squad scores
  let alphaScore = 0;
  let bravoScore = 0;
  Object.values(graph.nodes).forEach((n) => {
    if (n.status === 'RESOLVED') {
      if (n.owner === 'squad_alpha') alphaScore += n.points;
      if (n.owner === 'squad_bravo') bravoScore += n.points;
    }
  });

  // Calculate LOS analysis between basecamp and selected hex or default bunker
  const targetLon = selectedHex ? selectedHex.coordinates[0] : 18.519;
  const targetLat = selectedHex ? selectedHex.coordinates[1] : 54.398;
  const targetName = selectedHex ? (selectedHex.label || selectedHex.id) : 'Radar HQ Trzy Szczyty';
  const losAnalysis = computeElevationProfile(
    { lat: basecampLat, lon: basecampLon },
    { lat: targetLat, lon: targetLon },
    32
  );

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0b0f0b] text-[#e8ede8] overflow-hidden select-none font-mono">
      {/* Top Bar: Match Identification, MGRS Grid, Offline Cache, Squad Scores */}
      <header className="w-full bg-[#141c14] border-b-2 border-[#2e3d2e] px-4 py-2 flex items-center justify-between text-xs flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-black text-[#f5b700] text-sm">
            <span className="w-2.5 h-2.5 bg-[#f5b700] rounded-sm" />
            GRIDCOMMAND // GM COMMAND CENTER
          </div>
          <span className="text-[#c7a76c]">MATCH: {matchId}</span>
          <span className="text-[10px] px-2 py-0.5 rounded border border-[#4e9b4e] bg-[#4e9b4e]/20 text-[#68d391]">
            DAG: RECONCILED
          </span>
          <span className="hidden lg:inline-flex text-[10px] px-2 py-0.5 rounded border border-[#f5b700]/50 bg-[#f5b700]/10 text-[#f5b700]">
            HQ MGRS: {basecampMGRS}
          </span>
          <span className="hidden xl:inline-flex text-[10px] px-2 py-0.5 rounded border border-[#2e3d2e] bg-[#1c261c] text-[#9ba89b]">
            OFFLINE CACHE: 3 SECTORS (142MB)
          </span>
        </div>

        {/* Live Scoreboard & Quick Tool Buttons */}
        <div className="flex items-center gap-3 text-xs font-black">
          <button
            onClick={() => setShowMissionBuilder(true)}
            className="px-2.5 py-1 bg-[#1c261c] hover:bg-[#253325] border border-[#4e9b4e] text-[#68d391] rounded text-[11px] font-bold flex items-center gap-1.5 transition-colors"
          >
            <span>🛠️ MISSION BUILDER</span>
          </button>
          <button
            onClick={() => setShowLosModal(true)}
            className="px-2.5 py-1 bg-[#1c261c] hover:bg-[#253325] border border-[#f5b700] text-[#f5b700] rounded text-[11px] font-bold flex items-center gap-1.5 transition-colors"
          >
            <span>📡 LOS ANALYZER</span>
          </button>
          <button
            onClick={() => setShowAARModal(true)}
            className="px-2.5 py-1 bg-[#1c261c] hover:bg-[#253325] border border-[#38bdf8] text-[#38bdf8] rounded text-[11px] font-bold flex items-center gap-1.5 transition-colors"
          >
            <span>⏱️ AAR &amp; AUDIT</span>
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#4e9b4e]/20 border border-[#4e9b4e] text-[#68d391] rounded">
            <span>ALPHA:</span>
            <span>{alphaScore} PTS</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#8a6240]/25 border border-[#a67c52] text-[#d4a373] rounded">
            <span>BRAVO:</span>
            <span>{bravoScore} PTS</span>
          </div>
        </div>
      </header>

      {/* Global Freeze Banner if triggered */}
      {globalFreeze && (
        <div className="w-full bg-[#ff2200] text-black font-black py-1.5 px-4 text-center text-xs tracking-widest uppercase animate-pulse">
          🚨 GLOBAL FREEZE ACTIVE // ALL OPERATOR DEVICES LOCKED TO AMBER EMERGENCY HUD 🚨
        </div>
      )}

      {/* Admin Controls Panel */}
      <AdminConsole
        graph={graph}
        globalFreeze={globalFreeze}
        onToggleFreeze={toggleGlobalFreeze}
        onForceResolve={forceResolve}
        onInjectHazard={injectHazard}
      />

      {/* Main Command Viewport */}
      <div className="flex-1 flex w-full overflow-hidden relative">
        {/* 3D Hex Battle Map */}
        <div className="flex-1 h-full relative">
          <TacticalHexMap
            hexes={hexes}
            peers={peers}
            markers={markers}
            onSelectHex={(hex) => setSelectedHex(hex)}
          />

          {/* Hex Inspector Popover when a hex is selected */}
          {selectedHex && (
            <div className="absolute top-16 left-4 z-30 w-80 bg-[#141c14]/95 border-2 border-[#f5b700] p-3.5 rounded shadow-2xl backdrop-blur-md text-xs">
              <div className="flex items-center justify-between border-b border-[#2e3d2e] pb-1.5 mb-2">
                <span className="font-black text-[#f5b700] uppercase text-[11px]">
                  SECTOR INSPECTOR // {selectedHex.label || selectedHex.id}
                </span>
                <button
                  onClick={() => setSelectedHex(null)}
                  className="text-[#9ba89b] hover:text-white font-black"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#9ba89b]">NATO 10-FIG MGRS:</span>
                  <span className="text-[#f5b700] font-bold">
                    {latLonToMGRS(selectedHex.coordinates[1], selectedHex.coordinates[0]).formatted}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9ba89b]">WGS84 LAT/LON:</span>
                  <span className="text-[#e8ede8]">
                    {selectedHex.coordinates[1].toFixed(4)}°N, {selectedHex.coordinates[0].toFixed(4)}°E
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9ba89b]">ELEVATION ASL:</span>
                  <span className="text-[#68d391] font-bold">{selectedHex.elevation} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9ba89b]">STATUS / CONTROLLER:</span>
                  <span className="font-bold uppercase text-[#e8ede8]">{selectedHex.owner}</span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-[#2e3d2e] flex gap-2">
                <button
                  onClick={() => setShowLosModal(true)}
                  className="w-full py-1.5 bg-[#f5b700]/20 hover:bg-[#f5b700]/30 border border-[#f5b700] text-[#f5b700] font-bold rounded text-[10px] uppercase transition-colors"
                >
                  ANALYZE LOS FROM HQ
                </button>
              </div>
            </div>
          )}

          {/* Active Hazard Countdown Widget */}
          {activeHazard && (
            <div className="absolute top-4 right-4 z-20 bg-[#ff2200]/20 border-2 border-[#ff2200] text-[#ff2200] p-3 rounded font-mono text-xs backdrop-blur-md animate-pulse">
              <div className="font-black text-sm">⚠️ ACTIVE HAZARD INJECTED</div>
              <div className="text-[11px] text-white mt-1">{activeHazard.name}</div>
              <div className="text-lg font-black mt-1">EVACUATE: {activeHazard.remainingSeconds}s</div>
            </div>
          )}
        </div>

        {/* Live Event Ticker Sidebar */}
        <div className="w-80 md:w-96 h-full flex-shrink-0 z-10">
          <EventTicker events={ticker} />
        </div>
      </div>

      {/* Bottom Temporal DVR Scrubber */}
      <TemporalScrubber
        isLive={isLive}
        onToggleLive={setIsLive}
        scrubPosition={scrubPosition}
        onScrub={setScrubPosition}
      />

      {/* Line-of-Sight & Elevation Cross-Section Modal */}
      {showLosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-[#141c14] border-2 border-[#f5b700] rounded-lg shadow-2xl p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#2e3d2e] pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#f5b700] rounded-sm" />
                <h3 className="text-sm font-black text-[#f5b700] uppercase tracking-wider">
                  TACTICAL LINE-OF-SIGHT &amp; ELEVATION PROFILE
                </h3>
              </div>
              <button
                onClick={() => setShowLosModal(false)}
                className="text-[#9ba89b] hover:text-white font-black px-2 py-0.5 rounded"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-[#9ba89b]">
              Vector: <span className="text-[#f5b700] font-bold">GM BASECAMP HQ (Oliwa)</span> ➔{' '}
              <span className="text-[#68d391] font-bold">{targetName}</span>
            </div>

            <div className="w-full">
              <ElevationProfileWidget
                analysis={losAnalysis}
                targetName={targetName}
              />
            </div>

            <div className="flex justify-end pt-2 border-t border-[#2e3d2e]">
              <TacticalButton size="compact" variant="yellow" onClick={() => setShowLosModal(false)}>
                DISMISS ANALYZER
              </TacticalButton>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Mission Builder (DAG & Roster) Modal */}
      {showMissionBuilder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-[#141c14] border-2 border-[#4e9b4e] rounded-lg shadow-2xl p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#2e3d2e] pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#4e9b4e] rounded-sm" />
                <h3 className="text-sm font-black text-[#68d391] uppercase tracking-wider">
                  MISSION AUTHORING &amp; SQUAD ROSTER CONSOLE
                </h3>
              </div>
              <button
                onClick={() => setShowMissionBuilder(false)}
                className="text-[#9ba89b] hover:text-white font-black px-2 py-0.5 rounded"
              >
                ✕
              </button>
            </div>

            <div className="w-full">
              <MissionDAGEditorWidget
                nodes={graph.nodes as any}
                roster={roster as any}
                onAddDependency={handleAddDependency}
                onRemoveDependency={handleRemoveDependency}
                onToggleRevokeOperator={handleToggleRevokeOperator}
                onExportManifest={handleExportManifest}
              />
            </div>

            <div className="flex justify-end pt-2 border-t border-[#2e3d2e]">
              <TacticalButton size="compact" variant="olive" onClick={() => setShowMissionBuilder(false)}>
                CLOSE MISSION BUILDER
              </TacticalButton>
            </div>
          </div>
        </div>
      )}

      {/* Milestone 4: After-Action Review (AAR) & Cryptographic Audit Modal */}
      {showAARModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-[#141c14] border-2 border-[#38bdf8] rounded-lg shadow-2xl p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#2e3d2e] pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#38bdf8] rounded-sm" />
                <h3 className="text-sm font-black text-[#38bdf8] uppercase tracking-wider">
                  AFTER-ACTION REVIEW (AAR) &amp; CRYPTOGRAPHIC AUDIT CONSOLE
                </h3>
              </div>
              <button
                onClick={() => setShowAARModal(false)}
                className="text-[#9ba89b] hover:text-white font-black px-2 py-0.5 rounded"
              >
                ✕
              </button>
            </div>

            <div className="w-full">
              <AARPlaybackWidget
                durationSeconds={aarReplay.durationSeconds}
                trajectories={aarReplay.trajectories as any}
                bookmarks={aarReplay.bookmarks as any}
                scoreTimeline={aarReplay.scoreTimeline as any}
              />
            </div>

            <div className="flex justify-end pt-2 border-t border-[#2e3d2e]">
              <TacticalButton size="compact" variant="olive" onClick={() => setShowAARModal(false)}>
                CLOSE AAR CONSOLE
              </TacticalButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

