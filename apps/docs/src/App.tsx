import React, { useState, useMemo } from 'react';
import {
  Shield,
  Radio,
  MapPin,
  Cpu,
  Layers,
  Terminal,
  Activity,
  Compass,
  CheckCircle,
  Eye,
  AlertTriangle,
  Github,
  BookOpen,
} from 'lucide-react';
import {
  TacticalButton,
  StatusBadge,
  CompassBearing,
  TacticalAudioEngine,
  ElevationProfileWidget,
  MissionDAGEditorWidget,
  AARPlaybackWidget,
  LoraTransceiverWidget,
  WearableSubHUDWidget,
} from '@gridcommand/ui-theme';
import {
  latLonToMGRS,
  computeElevationProfile,
  getDefaultRoster,
  addDependency,
  removeDependency,
  revokeOperator,
  reinstateOperator,
  generateAARMissionReplay,
  MissionGraph,
  OperatorRosterEntry,
} from '@gridcommand/crdt-core';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'mobile-hud' | 'gm-center' | 'mesh-sim' | 'bom' | 'roadmap'>('overview');
  const [demoRedMode, setDemoRedMode] = useState(false);
  const [demoRainLock, setDemoRainLock] = useState(false);
  const [demoCaptured, setDemoCaptured] = useState(false);
  const [audioFeedbackText, setAudioFeedbackText] = useState<string | null>(null);

  // Milestone 3 Interactive Demo State
  const [docsGraph, setDocsGraph] = useState<MissionGraph>({
    nodes: {
      bunker_01: {
        id: 'bunker_01',
        name: 'Bunker Pachołek (01)',
        prerequisites: [],
        status: 'ACTIVE',
        owner: null,
        points: 100,
        decayRatePerMin: 0,
        geofenceRadiusMeters: 45,
        captureMechanism: 'INSTANT_NFC',
      },
      bunker_02: {
        id: 'bunker_02',
        name: 'Redoubt Dolina Radości (02)',
        prerequisites: ['bunker_01'],
        status: 'LOCKED',
        owner: null,
        points: 250,
        decayRatePerMin: 0,
        geofenceRadiusMeters: 60,
        captureMechanism: 'TIMED_HOLD',
        holdDurationSeconds: 180,
      },
      radar_hq: {
        id: 'radar_hq',
        name: 'Radar HQ Trzy Szczyty',
        prerequisites: ['bunker_02'],
        status: 'LOCKED',
        owner: null,
        points: 500,
        decayRatePerMin: 0,
        geofenceRadiusMeters: 100,
        captureMechanism: 'SYNC_CAPTURE',
        requiredOperators: 2,
      },
    },
  });
  const [docsRoster, setDocsRoster] = useState<OperatorRosterEntry[]>(getDefaultRoster());

  // Milestone 2 Interactive Demo State
  const [mgrsLat, setMgrsLat] = useState(54.4095);
  const [mgrsLon, setMgrsLon] = useState(18.541);
  const [losTarget, setLosTarget] = useState<'radar' | 'valley' | 'pacholek'>('radar');

  const mgrsCoord = latLonToMGRS(mgrsLat, mgrsLon);
  const losTargets = {
    radar: { name: 'Radar HQ Trzy Szczyty', lat: 54.398, lon: 18.519 },
    valley: { name: 'Redoubt Dolina Radości (Depression)', lat: 54.402, lon: 18.528 },
    pacholek: { name: 'Bunker Pachołek Moraine Crest', lat: 54.4095, lon: 18.541 },
  };
  const activeLosTarget = losTargets[losTarget];
  const docsLosAnalysis = computeElevationProfile(
    { lat: 54.405, lon: 18.535 },
    { lat: activeLosTarget.lat, lon: activeLosTarget.lon },
    32
  );

  // Milestone 4 Interactive Demo State
  const docsAAR = useMemo(() => generateAARMissionReplay('DOCS_DEMO_2026', 1800), []);

  const triggerAudioDemo = (cue: 'CONTACT' | 'ARTILLERY' | 'CAPTURE' | 'FREEZE' | 'PING', desc: string) => {
    TacticalAudioEngine.play(cue, { enableHaptics: true });
    setAudioFeedbackText(`[PLAYING ACOUSTIC CUE: ${desc}]`);
    setTimeout(() => setAudioFeedbackText(null), 2500);
  };

  return (
    <div className={`min-h-screen bg-[#0b0f0b] text-[#e8ede8] font-sans ${demoRedMode ? 'tactical-red-mode' : ''}`}>
      {/* Top Tactical Navigation */}
      <nav className="sticky top-0 z-50 bg-[#141c14]/95 border-b border-[#2e3d2e] backdrop-blur-md px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#3b5323]/30 border border-[#4e9b4e] flex items-center justify-center text-[#f5b700]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-mono font-black text-sm text-[#f5b700] tracking-wider">
                GRIDCOMMAND
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-mono text-[#c7a76c] border border-[#453724] px-1.5 py-0.5 rounded bg-[#1c261c]">
                v0.1.0-ALPHA
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-3 text-xs font-mono">
            {(['overview', 'mobile-hud', 'gm-center', 'mesh-sim', 'bom', 'roadmap'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2.5 py-1.5 rounded uppercase font-bold transition-all ${
                  activeTab === tab
                    ? 'bg-[#3b5323]/50 text-[#f5b700] border border-[#f5b700]'
                    : 'text-[#9ba89b] hover:text-[#e8ede8]'
                }`}
              >
                {tab === 'roadmap' ? 'ROADMAP 🚀' : tab.replace('-', ' ')}
              </button>
            ))}

            <a
              href="https://github.com/FranekJemiolo/gridcommand"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1c261c] border border-[#2e3d2e] text-xs font-mono hover:border-[#a67c52] transition-colors ml-2"
            >
              <Github className="w-4 h-4 text-[#c7a76c]" />
              <span className="hidden md:inline text-[#e8ede8]">GitHub</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative border-b border-[#2e3d2e] bg-gradient-to-b from-[#141c14] via-[#0f150f] to-[#0b0f0b] px-4 py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#2e3d2e_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#4e9b4e]/50 bg-[#3b5323]/25 text-[#68d391] font-mono text-xs mb-6">
            <span className="w-2 h-2 rounded-full bg-[#68d391] animate-pulse" />
            ZERO-CONNECTIVITY MILITARY-GRADE STATE MACHINE
          </div>
          <h1 className="text-4xl sm:text-6xl font-black font-mono tracking-tight text-white mb-6">
            Decentralized Tactical Field Simulation Platform
          </h1>
          <p className="text-base sm:text-xl text-[#9ba89b] max-w-3xl mx-auto leading-relaxed mb-8">
            Engineered to coordinate multi-squad tactical operations and civilian MilSim exercises in deep forest canopies, subterranean bunkers, and total cellular blackouts.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 font-mono text-xs">
            <TacticalButton variant="olive" onClick={() => setActiveTab('mobile-hud')}>
              LAUNCH MOBILE HUD DEMO
            </TacticalButton>
            <TacticalButton variant="yellow" onClick={() => setActiveTab('gm-center')}>
              EXPLORE GM COMMAND CENTER
            </TacticalButton>
            <TacticalButton variant="coyote" onClick={() => setActiveTab('roadmap')}>
              PRODUCT ROADMAP 🚀
            </TacticalButton>
            <TacticalButton variant="neutral" onClick={() => setActiveTab('mesh-sim')}>
              MESH TOPOLOGY VISUALIZER
            </TacticalButton>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {activeTab === 'overview' && (
          <div className="space-y-16">
            {/* Core Architectural Pillars */}
            <section>
              <div className="text-center mb-12">
                <h2 className="text-2xl sm:text-3xl font-mono font-black text-white">
                  The Four Architectural Pillars
                </h2>
                <p className="text-sm font-mono text-[#9ba89b] mt-2">
                  Uncompromising resilience when infrastructure fails
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono">
                <div className="p-6 rounded-lg bg-[#141c14] border border-[#2e3d2e] hover:border-[#4e9b4e] transition-all">
                  <div className="w-10 h-10 rounded bg-[#3b5323]/30 border border-[#4e9b4e] flex items-center justify-center text-[#68d391] mb-4">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">1. Local-First Edge CRDT Ledger</h3>
                  <p className="text-xs text-[#9ba89b] leading-relaxed">
                    Every operator device functions as an autonomous sovereign node with an append-only Yjs / pycrdt event log. Clocks are synchronized via Hybrid Logical Clocks (HLC) guaranteeing deterministic convergence with automatic rollbacks.
                  </p>
                </div>

                <div className="p-6 rounded-lg bg-[#141c14] border border-[#2e3d2e] hover:border-[#f5b700] transition-all">
                  <div className="w-10 h-10 rounded bg-[#f5b700]/15 border border-[#f5b700] flex items-center justify-center text-[#f5b700] mb-4">
                    <Radio className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">2. Multi-Tier Opportunistic Mesh</h3>
                  <p className="text-xs text-[#9ba89b] leading-relaxed">
                    Updates propagate via chunked 122-byte Bluetooth Low Energy (BLE) GATT exchanges between passing operators, Wi-Fi Direct "Data Mules," long-range Meshtastic LoRa radios (2-5km canopy), and physical USB-C OTG flash drives.
                  </p>
                </div>

                <div className="p-6 rounded-lg bg-[#141c14] border border-[#2e3d2e] hover:border-[#c7a76c] transition-all">
                  <div className="w-10 h-10 rounded bg-[#8a6240]/25 border border-[#a67c52] flex items-center justify-center text-[#c7a76c] mb-4">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">3. Cryptographic Proof of Presence</h3>
                  <p className="text-xs text-[#9ba89b] leading-relaxed">
                    Eliminating GPS spoofing and photo-cloning exploits, terrain objectives are verified via dual-layer NTAG215 epoxy discs and Base45 QR codes signed with Game Master Ed25519 private keys and validated against sensor-fusion snapshots.
                  </p>
                </div>

                <div className="p-6 rounded-lg bg-[#141c14] border border-[#2e3d2e] hover:border-[#e09f3e] transition-all">
                  <div className="w-10 h-10 rounded bg-[#e09f3e]/20 border border-[#e09f3e] flex items-center justify-center text-[#e09f3e] mb-4">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">4. Client-Side DAG State Machine</h3>
                  <p className="text-xs text-[#9ba89b] leading-relaxed">
                    Missions are modeled as Directed Acyclic Graphs (DAGs). Each node folds the chronologically sorted HLC stream over the graph, triggering cascading mission unlocks and hazard quarantines without requiring a centralized server.
                  </p>
                </div>
              </div>
            </section>

            {/* Offline Vector PMTiles Section */}
            <section className="p-8 rounded-xl bg-gradient-to-r from-[#141c14] to-[#1c261c] border border-[#2e3d2e] font-mono">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-4 max-w-xl">
                  <div className="inline-block px-2.5 py-1 rounded bg-[#3b5323]/40 text-[#f5b700] text-xs font-bold border border-[#4e9b4e]">
                    SERVERLESS TILE PROTOCOL
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    Offline Vector Maps with PMTiles &amp; MapLibre GL
                  </h3>
                  <p className="text-xs text-[#9ba89b] leading-relaxed">
                    Traditional map libraries fail in forest dead zones because they rely on cloud tile endpoints. GridCommand bundles high-resolution vector terrain, contours, and landmarks into a single-file <code className="text-[#f5b700]">.pmtiles</code> archive loaded directly from local phone storage via custom HTTP Range handlers.
                  </p>
                </div>
                <div className="p-4 rounded bg-[#0b0f0b] border border-[#453724] text-xs text-[#f5b700] font-mono space-y-1">
                  <div>const protocol = new Protocol();</div>
                  <div>maplibregl.addProtocol('pmtiles', protocol.tile);</div>
                  <div className="text-[#9ba89b] mt-2">// Zero network requests in the woods</div>
                  <div className="text-[#68d391]">url: 'pmtiles:///storage/maps/op.pmtiles'</div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Tab: Mobile HUD Demo */}
        {activeTab === 'mobile-hud' && (
          <div className="space-y-6 font-mono">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Mobile Tactical Client // Rig Mode HUD</h2>
                <p className="text-xs text-[#8b949e]">
                  Designed for chest-rig mounts viewed at 45° with 60x60px glove-friendly touch zones.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDemoRedMode(!demoRedMode)}
                  className={`px-3 py-1.5 rounded text-xs font-bold border uppercase ${
                    demoRedMode
                      ? 'bg-[#ff2200] text-black border-[#ff2200]'
                      : 'bg-[#ff2200]/10 text-[#ff2200] border-[#ff2200]/40'
                  }`}
                >
                  {demoRedMode ? 'RED LIGHT: ACTIVE' : 'RED LIGHT: OFF'}
                </button>
                <button
                  onClick={() => setDemoRainLock(!demoRainLock)}
                  className={`px-3 py-1.5 rounded text-xs font-bold border uppercase ${
                    demoRainLock
                      ? 'bg-[#ffe600] text-black border-[#ffe600]'
                      : 'bg-[#ffe600]/10 text-[#ffe600] border-[#ffe600]/40'
                  }`}
                >
                  {demoRainLock ? 'RAIN LOCK: ON' : 'RAIN LOCK: OFF'}
                </button>
              </div>
            </div>

            {/* Mobile Device Mockup Frame */}
            <div className="max-w-md mx-auto rounded-3xl border-4 border-[#453724] bg-[#0b0f0b] p-4 shadow-2xl relative overflow-hidden">
              {demoRainLock && (
                <div className="absolute inset-0 z-40 bg-[#0b0f0b]/95 flex flex-col items-center justify-center p-6 text-center">
                  <div className="text-3xl mb-2">🔒</div>
                  <div className="text-sm font-black text-[#f5b700]">RAIN LOCK ENGAGED</div>
                  <div className="text-[10px] text-[#9ba89b] mt-1 mb-4">
                    Touch listeners disabled. Operate with hardware buttons.
                  </div>
                  <TacticalButton size="compact" variant="yellow" onClick={() => setDemoRainLock(false)}>
                    UNLOCK
                  </TacticalButton>
                </div>
              )}

              {/* Status Header */}
              <div className="flex items-center justify-between text-[11px] pb-3 border-b border-[#2e3d2e]">
                <span className="text-[#68d391] font-bold">● GPS: ±2.4m</span>
                <span className="text-[#f5b700]">MESH: 4 NODES</span>
                <span className="text-[#c7a76c]">BAT: 92%</span>
              </div>

              {/* Simulated Map Viewport */}
              <div className="relative h-64 my-3 rounded-lg bg-[#141c14] border border-[#2e3d2e] flex flex-col items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#f5b700_1px,transparent_1px)] [background-size:16px_16px]" />
                <CompassBearing
                  heading={42}
                  targetBearing={55}
                  targetDistanceMeters={demoCaptured ? 420 : 64}
                  targetName={demoCaptured ? 'BUNKER 02 (LOCKED)' : 'BUNKER 01 (ACTIVE)'}
                />
              </div>

              {/* Interactive Tactical Controls */}
              <div className="space-y-2">
                <div className="p-2 rounded bg-[#1c261c] border border-[#2e3d2e] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#9ba89b]">OBJECTIVE: </span>
                    <span className="text-[#f5b700] font-bold">
                      {demoCaptured ? 'BUNKER 01 [RESOLVED]' : 'BUNKER 01 [ACTIVE]'}
                    </span>
                  </div>
                  <StatusBadge status={demoCaptured ? 'RESOLVED' : 'ACTIVE'} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <TacticalButton
                    variant={demoCaptured ? 'green' : 'olive'}
                    className="h-16 text-xs font-black"
                    onClick={() => setDemoCaptured(!demoCaptured)}
                  >
                    {demoCaptured ? '✓ TOKEN VERIFIED' : 'SCAN NTAG215 / QR'}
                  </TacticalButton>

                  <TacticalButton
                    variant="yellow"
                    className="h-16 text-xs font-black"
                    onClick={() => setDemoCaptured(true)}
                  >
                    GLOVE PIN ENTRY
                  </TacticalButton>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: GM Center Demo */}
        {activeTab === 'gm-center' && (
          <div className="space-y-6 font-mono">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Game Master Command Center &amp; DVR Scrubber</h2>
                <p className="text-xs text-[#9ba89b]">
                  Deck.gl Discretized Hexagon tactical view, God-mode overrides, and time-travel replay.
                </p>
              </div>
            </div>

            {/* GM Command Screen Mockup */}
            <div className="rounded-xl border-2 border-[#2e3d2e] bg-[#141c14] p-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#2e3d2e] text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-[#f5b700] font-black">GM CONSOLE // LIVE</span>
                  <span className="text-[#c7a76c]">MATCH: GDANSK_ALPHA_2026</span>
                </div>
                <div className="flex items-center gap-3 font-bold">
                  <span className="text-[#68d391]">ALPHA: 250 PTS</span>
                  <span className="text-[#d4a373]">BRAVO: 100 PTS</span>
                </div>
              </div>

              {/* Grid representation */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 my-4">
                <div className="lg:col-span-2 h-72 rounded bg-[#0b0f0b] border border-[#2e3d2e] p-4 flex flex-col justify-between relative overflow-hidden">
                  <div className="text-xs text-[#c7a76c] font-bold">DISCRETIZED TACTICAL HEX BATTLE MAP (DECK.GL)</div>
                  
                  {/* Hexagon visualizer */}
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-black py-4">
                    <div className="p-3 rounded border border-[#4e9b4e] bg-[#4e9b4e]/20 text-[#68d391]">
                      HEX A1<br />SQUAD ALPHA
                    </div>
                    <div className="p-3 rounded border border-[#68d391] bg-[#68d391]/20 text-[#68d391]">
                      BUNKER 01<br />CAPTURED
                    </div>
                    <div className="p-3 rounded border border-[#f5b700] bg-[#f5b700]/20 text-[#f5b700] animate-pulse">
                      HEX B2<br />CONTESTED
                    </div>
                    <div className="p-3 rounded border border-[#a67c52] bg-[#8a6240]/25 text-[#d4a373]">
                      HEX C1<br />SQUAD BRAVO
                    </div>
                  </div>

                  <div className="text-[11px] text-[#68d391]">● 15 Edge nodes synchronized over BLE / LoRa mesh</div>
                </div>

                {/* Event Ticker */}
                <div className="h-72 rounded bg-[#0b0f0b] border border-[#2e3d2e] p-3 overflow-y-auto space-y-2 text-xs">
                  <div className="text-[#c7a76c] font-bold pb-1 border-b border-[#2e3d2e]">CRDT INGRESS STREAM</div>
                  <div className="p-2 rounded bg-[#1c261c] border border-[#2e3d2e]">
                    <span className="text-[10px] text-[#9ba89b]">14:12:05</span>
                    <div className="text-[#68d391] font-bold">Bunker 01 captured by Squad Alpha</div>
                  </div>
                  <div className="p-2 rounded bg-[#1c261c] border border-[#2e3d2e]">
                    <span className="text-[10px] text-[#9ba89b]">14:10:22</span>
                    <div className="text-[#f5b700]">Geofence breached (±2.8m GPS lock)</div>
                  </div>
                  <div className="p-2 rounded bg-[#1c261c] border border-[#2e3d2e]">
                    <span className="text-[10px] text-[#9ba89b]">14:00:00</span>
                    <div className="text-[#9ba89b]">Simulation Genesis HLC Registered</div>
                  </div>
                </div>
              </div>

              {/* Scrubber Bar */}
              <div className="pt-3 border-t border-[#2e3d2e] flex items-center justify-between text-xs text-[#9ba89b]">
                <span>14:00:00</span>
                <div className="flex-1 mx-4 h-2 bg-[#1c261c] rounded-full relative">
                  <div className="w-3/4 h-full bg-[#f5b700] rounded-full" />
                </div>
                <span className="text-[#f5b700] font-bold">14:45:00 [LIVE]</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Mesh Simulator */}
        {activeTab === 'mesh-sim' && (
          <div className="space-y-6 font-mono">
            <h2 className="text-2xl font-bold text-white">Decentralized Mesh Topology Visualizer</h2>
            <p className="text-xs text-[#9ba89b]">
              How updates propagate without internet access using opportunistic multi-hop gossip and radio bridges.
            </p>

            <div className="p-8 rounded-xl border border-[#2e3d2e] bg-[#141c14] space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                <div className="p-4 rounded-lg bg-[#1c261c] border border-[#4e9b4e]/60">
                  <div className="text-xs text-[#9ba89b]">NODE 1</div>
                  <div className="text-sm font-bold text-[#68d391] mt-1">Pointman (Offline)</div>
                  <div className="text-[10px] text-[#9ba89b] mt-2">Captures NFC Tag</div>
                  <div className="mt-3 text-xs text-[#68d391]">HLC Event Committed</div>
                </div>

                <div className="p-4 rounded-lg bg-[#1c261c] border border-[#f5b700]/60">
                  <div className="text-xs text-[#9ba89b]">HOP 1 (BLE 30m)</div>
                  <div className="text-sm font-bold text-[#f5b700] mt-1">Squad Leader</div>
                  <div className="text-[10px] text-[#9ba89b] mt-2">122-Byte BLE Frames</div>
                  <div className="mt-3 text-xs text-[#68d391]">Local Yjs Merged</div>
                </div>

                <div className="p-4 rounded-lg bg-[#1c261c] border border-[#a67c52]">
                  <div className="text-xs text-[#9ba89b]">HOP 2 (LORA 2-5km)</div>
                  <div className="text-sm font-bold text-[#d4a373] mt-1">Data Mule / Radio</div>
                  <div className="text-[10px] text-[#9ba89b] mt-2">LilyGO T-Echo SX1262</div>
                  <div className="mt-3 text-xs text-[#68d391]">237-Byte LoRa MTU</div>
                </div>

                <div className="p-4 rounded-lg bg-[#1c261c] border border-[#4e9b4e]">
                  <div className="text-xs text-[#9ba89b]">DESTINATION</div>
                  <div className="text-sm font-bold text-[#68d391] mt-1">Basecamp Server</div>
                  <div className="text-[10px] text-[#9ba89b] mt-2">FastAPI + pycrdt</div>
                  <div className="mt-3 text-xs text-[#68d391]">Deck.gl Map Updated</div>
                </div>
              </div>

              <div className="p-4 rounded bg-[#0b0f0b] border border-[#453724] text-xs space-y-2">
                <div className="text-[#f5b700] font-bold">AUTOMATIC SPLIT-BRAIN CONVERGENCE:</div>
                <p className="text-[#9ba89b] text-[11px] leading-relaxed">
                  If two squads operate in disconnected valleys for 2 hours and capture conflicting objectives, upon reuniting at Basecamp or crossing paths with a Data Mule, the pure client-side DAG reducer sorts all events lexicographically by HLC string, executing deterministic rollbacks and resolving the exact historical winner with mathematical precision.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Hardware BOM */}
        {activeTab === 'bom' && (
          <div className="space-y-6 font-mono">
            <h2 className="text-2xl font-bold text-white">Physical Hardware Bill of Materials (BOM)</h2>
            <p className="text-xs text-[#9ba89b]">
              Field-proven procurement specification for a 15-operator (3-squad) Alpha tactical deployment.
            </p>

            <div className="overflow-x-auto rounded-lg border border-[#2e3d2e]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#141c14] text-[#c7a76c] border-b border-[#2e3d2e]">
                  <tr>
                    <th className="p-3">Category</th>
                    <th className="p-3">Specification</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3">Unit Cost</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Field Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2e3d2e] bg-[#0b0f0b]">
                  <tr>
                    <td className="p-3 font-bold text-[#f5b700]">Objective Tokens</td>
                    <td className="p-3">NTAG215 Anti-Metal 30mm Epoxy Disc</td>
                    <td className="p-3">20</td>
                    <td className="p-3">$0.85</td>
                    <td className="p-3 text-[#68d391]">$17.00</td>
                    <td className="p-3 text-[#9ba89b]">100% waterproof; scans on metal poles or trees.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#f5b700]">Objective Backup</td>
                    <td className="p-3">Rite in the Rain Poly Laser Paper</td>
                    <td className="p-3">1 Pack</td>
                    <td className="p-3">$18.00</td>
                    <td className="p-3 text-[#68d391]">$18.00</td>
                    <td className="p-3 text-[#9ba89b]">Laser-printed QR codes; zero ink bleed in pouring rain.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#d4a373]">Operator Power</td>
                    <td className="p-3">Nitecore NB10000 Gen 2 (10,000mAh)</td>
                    <td className="p-3">15</td>
                    <td className="p-3">$59.95</td>
                    <td className="p-3 text-[#68d391]">$899.25</td>
                    <td className="p-3 text-[#9ba89b]">150g ultralight; sustains GPS &amp; WebGL for 8+ hours.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#d4a373]">Rig Mounts</td>
                    <td className="p-3">MOLLE Flip-Down Phone Board (45°)</td>
                    <td className="p-3">15</td>
                    <td className="p-3">$14.50</td>
                    <td className="p-3 text-[#68d391]">$217.50</td>
                    <td className="p-3 text-[#9ba89b]">Hands-free chest angle for Rig Mode glanceable HUD.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#e09f3e]">LoRa Mesh Bridge</td>
                    <td className="p-3">LilyGO T-Echo SX1262 868MHz Radio</td>
                    <td className="p-3">3</td>
                    <td className="p-3">$45.00</td>
                    <td className="p-3 text-[#68d391]">$135.00</td>
                    <td className="p-3 text-[#9ba89b]">Squad Comms; transmits DAG changes across 2-5km canopy.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#c7a76c]">Basecamp Router</td>
                    <td className="p-3">GL.iNet GL-AXT1800 Slate AX Wi-Fi 6</td>
                    <td className="p-3">1</td>
                    <td className="p-3">$129.00</td>
                    <td className="p-3 text-[#68d391]">$129.00</td>
                    <td className="p-3 text-[#9ba89b]">5V USB-C powered high-speed onboarding bubble.</td>
                  </tr>
                  <tr className="bg-[#141c14] font-black">
                    <td className="p-3 text-[#e8ede8]" colSpan={4}>TOTAL BOM INFRASTRUCTURE COST</td>
                    <td className="p-3 text-[#68d391] text-sm">$1,556.58</td>
                    <td className="p-3 text-[#9ba89b]">Complete 15-operator turn-key deployment.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Product Roadmap */}
        {activeTab === 'roadmap' && (
          <div className="space-y-10 font-mono">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#4e9b4e]/50 bg-[#3b5323]/25 text-[#68d391] text-xs mb-3">
                <span className="w-2 h-2 rounded-full bg-[#68d391] animate-pulse" />
                SYSTEM EVOLUTION SPECIFICATION
              </div>
              <h2 className="text-3xl font-black text-white">GridCommand Product Maturity Roadmap</h2>
              <p className="text-xs text-[#9ba89b] mt-1 max-w-3xl leading-relaxed">
                Strategic engineering trajectory transitioning the MVP into a hardened, field-ready tactical platform across five distinct milestones.
              </p>
            </div>

            {/* Live Interactive NATO Acoustic Earcons Soundboard */}
            <div className="p-6 rounded-xl bg-gradient-to-r from-[#141c14] to-[#1c261c] border-2 border-[#453724] space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#f5b700] uppercase tracking-wider flex items-center gap-2">
                    <span>🔊</span>
                    <span>NATO Standard Acoustic Earcons Synthesizer (Web Audio API)</span>
                  </h3>
                  <p className="text-xs text-[#9ba89b] mt-0.5">
                    Click each tactical frequency profile to preview the audio cues played to operators via bone-conduction headsets.
                  </p>
                </div>
                {audioFeedbackText && (
                  <span className="text-xs font-bold text-[#68d391] animate-pulse">
                    {audioFeedbackText}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <button
                  onClick={() => triggerAudioDemo('CONTACT', 'Hostile Contact Warning')}
                  className="p-3 rounded bg-[#0b0f0b] border border-[#c5221f] text-[#c5221f] hover:bg-[#c5221f]/20 transition-all text-left"
                >
                  <div className="text-base mb-1">🔴</div>
                  <div className="font-bold text-xs">CONTACT ALARM</div>
                  <div className="text-[10px] text-[#9ba89b] mt-1">Dual sawtooth pulse</div>
                </button>

                <button
                  onClick={() => triggerAudioDemo('ARTILLERY', 'Incoming Artillery / Hazard')}
                  className="p-3 rounded bg-[#0b0f0b] border border-[#f5b700] text-[#f5b700] hover:bg-[#f5b700]/20 transition-all text-left"
                >
                  <div className="text-base mb-1">⚠️</div>
                  <div className="font-bold text-xs">ARTILLERY SIREN</div>
                  <div className="text-[10px] text-[#9ba89b] mt-1">Modulated triangle wave</div>
                </button>

                <button
                  onClick={() => triggerAudioDemo('CAPTURE', 'Objective Captured Chime')}
                  className="p-3 rounded bg-[#0b0f0b] border border-[#68d391] text-[#68d391] hover:bg-[#68d391]/20 transition-all text-left"
                >
                  <div className="text-base mb-1">✓</div>
                  <div className="font-bold text-xs">CAPTURE CHIME</div>
                  <div className="text-[10px] text-[#9ba89b] mt-1">Ascending triad chord</div>
                </button>

                <button
                  onClick={() => triggerAudioDemo('FREEZE', 'Emergency Global Freeze')}
                  className="p-3 rounded bg-[#0b0f0b] border border-[#e53e3e] text-[#e53e3e] hover:bg-[#e53e3e]/20 transition-all text-left"
                >
                  <div className="text-base mb-1">🚨</div>
                  <div className="font-bold text-xs">FREEZE BUZZ</div>
                  <div className="text-[10px] text-[#9ba89b] mt-1">Descending square buzz</div>
                </button>

                <button
                  onClick={() => triggerAudioDemo('PING', 'Tactical Radar Mesh Ping')}
                  className="p-3 rounded bg-[#0b0f0b] border border-[#c7a76c] text-[#c7a76c] hover:bg-[#c7a76c]/20 transition-all text-left"
                >
                  <div className="text-base mb-1">📡</div>
                  <div className="font-bold text-xs">RADAR PING</div>
                  <div className="text-[10px] text-[#9ba89b] mt-1">Subtle chirp chirp</div>
                </button>
              </div>
            </div>

            {/* Five Detailed Milestones */}
            <div className="space-y-6">
              {/* Milestone 1 */}
              <div className="p-6 rounded-xl bg-[#141c14] border-2 border-[#4e9b4e] space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded bg-[#4e9b4e]/30 border border-[#4e9b4e] text-[#68d391] text-xs font-black">
                      MILESTONE 1
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      Tactical Field Comms &amp; Situational Awareness
                    </h3>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded bg-[#4e9b4e]/20 text-[#68d391] font-bold border border-[#4e9b4e]">
                    ✓ OPERATIONAL &amp; VERIFIED
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
                  <div className="p-3.5 rounded bg-[#0b0f0b] border border-[#2e3d2e] space-y-1">
                    <div className="text-[#f5b700] font-bold">Blue Force Tracking (BFT)</div>
                    <p className="text-[#9ba89b] text-[11px] leading-relaxed">
                      Decentralized peer presence and telemetry broadcast over Yjs CRDT. Live compass chevrons, squad color coding (Olive / Coyote), battery level, and callsign labels.
                    </p>
                  </div>
                  <div className="p-3.5 rounded bg-[#0b0f0b] border border-[#2e3d2e] space-y-1">
                    <div className="text-[#f5b700] font-bold">Synthesized NATO Acoustic Earcons</div>
                    <p className="text-[#9ba89b] text-[11px] leading-relaxed">
                      Web Audio API military alert synthesizer providing hands-free situational awareness for bone-conduction headsets (Contact, Artillery, Capture, Freeze).
                    </p>
                  </div>
                  <div className="p-3.5 rounded bg-[#0b0f0b] border border-[#2e3d2e] space-y-1">
                    <div className="text-[#f5b700] font-bold">Field SPOTREP Quick Markers</div>
                    <p className="text-[#9ba89b] text-[11px] leading-relaxed">
                      1-tap rapid marker drops on the tactical map (Hostile Contact, Hazard Obstacle, Medevac, Supply Cache, Rally Point) with auto-decay timers.
                    </p>
                  </div>
                </div>
              </div>

              {/* Milestone 2 */}
              <div className="p-6 rounded-xl bg-[#141c14] border-2 border-[#4e9b4e] space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded bg-[#4e9b4e]/30 border border-[#4e9b4e] text-[#68d391] text-xs font-black">
                      MILESTONE 2
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      Offline Map Packs &amp; Terrain Elevation Profile
                    </h3>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded bg-[#4e9b4e]/20 text-[#68d391] font-bold border border-[#4e9b4e]">
                    ✓ OPERATIONAL &amp; VERIFIED
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
                  <div className="p-3.5 rounded bg-[#0b0f0b] border border-[#2e3d2e] space-y-1">
                    <div className="text-[#f5b700] font-bold">Offline Sector Storage Manager</div>
                    <p className="text-[#9ba89b] text-[11px] leading-relaxed">
                      IndexedDB &amp; Cache API storage engine. Pre-download 5km²-20km² tactical sectors at zoom levels 12-17 with quota telemetry, progress simulation, and cache purge.
                    </p>
                  </div>
                  <div className="p-3.5 rounded bg-[#0b0f0b] border border-[#2e3d2e] space-y-1">
                    <div className="text-[#f5b700] font-bold">Line-of-Sight &amp; Elevation Profile</div>
                    <p className="text-[#9ba89b] text-[11px] leading-relaxed">
                      High-resolution terrain elevation slice calculation, optical line-of-sight raycasting, moraine ridge blockage detection, and 868 MHz LoRa Fresnel radio clearance boundary.
                    </p>
                  </div>
                  <div className="p-3.5 rounded bg-[#0b0f0b] border border-[#2e3d2e] space-y-1">
                    <div className="text-[#f5b700] font-bold">MGRS / UTM Coordinate Engine</div>
                    <p className="text-[#9ba89b] text-[11px] leading-relaxed">
                      Real-time NATO 10-figure Military Grid Reference System (MGRS) conversion (e.g. <span className="text-[#f5b700] font-mono">34U DA 35124 28941</span>) with ellipsoid datum projections.
                    </p>
                  </div>
                </div>

                {/* Milestone 2 Live Interactive Laboratory */}
                <div className="pt-4 border-t border-[#2e3d2e] space-y-6">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-[#f5b700] rounded-sm" />
                    <span className="text-xs font-black uppercase text-[#f5b700] tracking-wider">
                      MILESTONE 2 INTERACTIVE FIELD SIMULATION LABORATORY
                    </span>
                  </div>

                  {/* Section A: Real-Time NATO 10-Figure MGRS Converter */}
                  <div className="p-4 rounded-lg bg-[#0b0f0b] border border-[#3b5323] space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#f5b700]" />
                        1. NATO 10-Figure MGRS / UTM Coordinate Transceiver
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setMgrsLat(54.4095); setMgrsLon(18.5410); }}
                          className="px-2 py-0.5 rounded bg-[#1c261c] border border-[#2e3d2e] hover:border-[#f5b700] text-[10px] text-[#e8ede8]"
                        >
                          Gdańsk Oliwa
                        </button>
                        <button
                          onClick={() => { setMgrsLat(50.215); setMgrsLon(19.045); }}
                          className="px-2 py-0.5 rounded bg-[#1c261c] border border-[#2e3d2e] hover:border-[#f5b700] text-[10px] text-[#e8ede8]"
                        >
                          Katowice Murcki
                        </button>
                        <button
                          onClick={() => { setMgrsLat(52.335); setMgrsLon(20.710); }}
                          className="px-2 py-0.5 rounded bg-[#1c261c] border border-[#2e3d2e] hover:border-[#f5b700] text-[10px] text-[#e8ede8]"
                        >
                          Kampinos Delta
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded bg-[#141c14] border border-[#2e3d2e]">
                        <div className="text-[10px] text-[#9ba89b]">UTM GRID ZONE</div>
                        <div className="text-sm font-black text-[#f5b700]">{mgrsCoord.zone}{mgrsCoord.band}</div>
                      </div>
                      <div className="p-2.5 rounded bg-[#141c14] border border-[#2e3d2e]">
                        <div className="text-[10px] text-[#9ba89b]">100KM SQUARE ID</div>
                        <div className="text-sm font-black text-[#f5b700]">{mgrsCoord.squareId}</div>
                      </div>
                      <div className="p-2.5 rounded bg-[#141c14] border border-[#2e3d2e]">
                        <div className="text-[10px] text-[#9ba89b]">EASTING (5-DIGIT)</div>
                        <div className="text-sm font-mono font-bold text-[#68d391]">{mgrsCoord.easting}</div>
                      </div>
                      <div className="p-2.5 rounded bg-[#141c14] border border-[#2e3d2e]">
                        <div className="text-[10px] text-[#9ba89b]">NORTHING (5-DIGIT)</div>
                        <div className="text-sm font-mono font-bold text-[#68d391]">{mgrsCoord.northing}</div>
                      </div>
                    </div>

                    <div className="p-3 rounded bg-[#1c261c] border border-[#4e9b4e] flex items-center justify-between">
                      <span className="text-[11px] text-[#9ba89b]">STANDARD NATO FORMATTED STRING:</span>
                      <span className="text-sm sm:text-base font-black font-mono text-[#f5b700] tracking-wider">
                        {mgrsCoord.formatted}
                      </span>
                    </div>
                  </div>

                  {/* Section B: Line-of-Sight & Elevation Cross-Section Analyzer */}
                  <div className="p-4 rounded-lg bg-[#0b0f0b] border border-[#3b5323] space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#68d391]" />
                        2. Line-of-Sight (LOS) &amp; Fresnel Radio Clearance Simulator
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#9ba89b]">SELECT TARGET:</span>
                        <select
                          value={losTarget}
                          onChange={(e) => setLosTarget(e.target.value as any)}
                          className="bg-[#141c14] border border-[#2e3d2e] text-[#f5b700] rounded px-2 py-1 text-xs"
                        >
                          <option value="radar">Radar HQ Trzy Szczyty (High Mast)</option>
                          <option value="valley">Redoubt Dolina Radości (Depression / Blocked)</option>
                          <option value="pacholek">Bunker Pachołek (Moraine Crest)</option>
                        </select>
                      </div>
                    </div>

                    <div className="w-full">
                      <ElevationProfileWidget
                        analysis={docsLosAnalysis}
                        targetName={activeLosTarget.name}
                      />
                    </div>
                  </div>

                  {/* Section C: Offline Map Storage Sector Status */}
                  <div className="p-4 rounded-lg bg-[#0b0f0b] border border-[#3b5323] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#c7a76c]" />
                        3. Pre-Packaged Offline Sectors (IndexedDB / Cache API)
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#4e9b4e]/20 border border-[#4e9b4e] text-[#68d391] font-bold">
                        STORAGE USAGE: 142.2 MB / 2,048 MB (6.9%)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded bg-[#141c14] border border-[#4e9b4e]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-white">Gdańsk Oliwa Hills</span>
                          <span className="text-[10px] text-[#68d391] font-bold">CACHED ✓</span>
                        </div>
                        <div className="text-[10px] text-[#9ba89b]">Coverage: 12.5 km² • Zooms 12-17</div>
                        <div className="text-[10px] text-[#f5b700] mt-1 font-mono">Size: 48.4 MB (1,240 tiles)</div>
                      </div>

                      <div className="p-3 rounded bg-[#141c14] border border-[#4e9b4e]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-white">Katowice Murcki</span>
                          <span className="text-[10px] text-[#68d391] font-bold">CACHED ✓</span>
                        </div>
                        <div className="text-[10px] text-[#9ba89b]">Coverage: 15.0 km² • Zooms 12-17</div>
                        <div className="text-[10px] text-[#f5b700] mt-1 font-mono">Size: 56.1 MB (1,480 tiles)</div>
                      </div>

                      <div className="p-3 rounded bg-[#141c14] border border-[#4e9b4e]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-white">Kampinos Delta</span>
                          <span className="text-[10px] text-[#68d391] font-bold">CACHED ✓</span>
                        </div>
                        <div className="text-[10px] text-[#9ba89b]">Coverage: 8.8 km² • Zooms 12-17</div>
                        <div className="text-[10px] text-[#f5b700] mt-1 font-mono">Size: 37.7 MB (980 tiles)</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Milestone 3 */}
              <div className="p-6 rounded-xl bg-[#141c14] border-2 border-[#4e9b4e] space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded bg-[#4e9b4e]/30 border border-[#4e9b4e] text-[#68d391] text-xs font-black">
                      MILESTONE 3
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      Dynamic Mission Builder &amp; Graph Editor
                    </h3>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded bg-[#4e9b4e]/20 text-[#68d391] font-bold border border-[#4e9b4e]">
                    ✓ OPERATIONAL &amp; VERIFIED
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
                  <div className="p-3.5 rounded bg-[#0b0f0b] border border-[#2e3d2e] space-y-1">
                    <div className="text-[#f5b700] font-bold">Visual DAG Mission Graph Editor</div>
                    <p className="text-[#9ba89b] text-[11px] leading-relaxed">
                      Map-based objective creator with geofences (10m–500m), configurable capture mechanics (Instant NFC, Timed Hold 180s, Synchronized 2x Capture), and cycle detection.
                    </p>
                  </div>
                  <div className="p-3.5 rounded bg-[#0b0f0b] border border-[#2e3d2e] space-y-1">
                    <div className="text-[#f5b700] font-bold">Squad Roster &amp; Keypair Approval</div>
                    <p className="text-[#9ba89b] text-[11px] leading-relaxed">
                      Operational roster management, callsign assignment, specialist roles (Leader, Pointman, Medic, RTO, Marksman), and Ed25519 public key registries with revocation.
                    </p>
                  </div>
                  <div className="p-3.5 rounded bg-[#0b0f0b] border border-[#2e3d2e] space-y-1">
                    <div className="text-[#f5b700] font-bold">Signed Mission Package Export</div>
                    <p className="text-[#9ba89b] text-[11px] leading-relaxed">
                      Air-gapped mission distribution via Base45 high-density QR code encoding or canonical JSON signed manifests verified with Ed25519 cryptography.
                    </p>
                  </div>
                </div>

                {/* Milestone 3 Live Interactive Laboratory */}
                <div className="pt-4 border-t border-[#2e3d2e] space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 bg-[#68d391] rounded-sm" />
                    <span className="text-xs font-black uppercase text-[#68d391] tracking-wider">
                      MILESTONE 3 INTERACTIVE DAG MISSION BUILDER LABORATORY
                    </span>
                  </div>

                  <div className="w-full">
                    <MissionDAGEditorWidget
                      nodes={docsGraph.nodes as any}
                      roster={docsRoster as any}
                      onAddDependency={(p, c) => {
                        const res = addDependency(docsGraph, p, c);
                        if (res.success) setDocsGraph(res.graph);
                      }}
                      onRemoveDependency={(p, c) => {
                        const res = removeDependency(docsGraph, p, c);
                        setDocsGraph(res);
                      }}
                      onToggleRevokeOperator={(id) => {
                        const target = docsRoster.find((r) => r.id === id);
                        if (!target) return;
                        setDocsRoster(
                          target.revoked ? reinstateOperator(docsRoster, id) : revokeOperator(docsRoster, id)
                        );
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Milestone 4 */}
              <div className="p-6 rounded-xl bg-[#141c14] border-2 border-[#4e9b4e] space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded bg-[#4e9b4e]/30 border border-[#4e9b4e] text-[#68d391] text-xs font-black">
                      MILESTONE 4
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      After-Action Review (AAR) &amp; Cryptographic Audit
                    </h3>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded bg-[#4e9b4e]/20 text-[#68d391] font-bold border border-[#4e9b4e]">
                    ✓ OPERATIONAL &amp; VERIFIED
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                  <div className="p-3.5 rounded bg-[#0b0f0b] border border-[#2e3d2e] space-y-1">
                    <div className="text-[#f5b700] font-bold">3D Spatial Timeline Playback Engine</div>
                    <p className="text-[#9ba89b] text-[11px] leading-relaxed">
                      High-fidelity spatial timeline replay showing full squad maneuvers, skirmishes, territory capture curves, tactical bookmarks, and variable speed control (1x, 5x, 20x).
                    </p>
                  </div>
                  <div className="p-3.5 rounded bg-[#0b0f0b] border border-[#2e3d2e] space-y-1">
                    <div className="text-[#f5b700] font-bold">Cryptographic Anti-Cheat &amp; Compliance Audit</div>
                    <p className="text-[#9ba89b] text-[11px] leading-relaxed">
                      Forensic invariant checker validating all signed CRDT event logs against physical sensor bounds (speed anomalies &gt;10 m/s, teleportation &gt;200m, clock rollback, geofence breaches, and Ed25519 signatures).
                    </p>
                  </div>
                </div>

                {/* Milestone 4 Live Interactive Laboratory */}
                <div className="pt-4 border-t border-[#2e3d2e] space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 bg-[#68d391] rounded-sm" />
                    <span className="text-xs font-black uppercase text-[#68d391] tracking-wider">
                      MILESTONE 4 INTERACTIVE AAR &amp; FORENSIC AUDIT LABORATORY
                    </span>
                  </div>

                  <div className="w-full">
                    <AARPlaybackWidget
                      durationSeconds={docsAAR.durationSeconds}
                      trajectories={docsAAR.trajectories as any}
                      bookmarks={docsAAR.bookmarks as any}
                      scoreTimeline={docsAAR.scoreTimeline as any}
                    />
                  </div>
                </div>
              </div>

              {/* Milestone 5 */}
              <div className="p-6 rounded-xl bg-[#141c14] border-2 border-[#4e9b4e] space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded bg-[#4e9b4e]/30 border border-[#4e9b4e] text-[#68d391] text-xs font-black">
                      MILESTONE 5
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      Hardware LoRa Bridge &amp; Native Wearable Ecosystem
                    </h3>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded bg-[#4e9b4e]/20 text-[#68d391] font-bold border border-[#4e9b4e]">
                    ✓ OPERATIONAL &amp; VERIFIED
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
                  <div className="p-3.5 rounded bg-[#0b0f0b] border border-[#2e3d2e] space-y-1">
                    <div className="text-[#f5b700] font-bold">LoRa SX1262 Web Serial &amp; BLE Bridge</div>
                    <p className="text-[#9ba89b] text-[11px] leading-relaxed">
                      Direct connection to LilyGO T-Echo SX1262 transceivers, transparently fragmenting Base45 CRDT delta packets into 237-byte LoRa payloads with CCITT CRC16 for 2–5km deep canopy reach.
                    </p>
                  </div>
                  <div className="p-3.5 rounded bg-[#0b0f0b] border border-[#2e3d2e] space-y-1">
                    <div className="text-[#f5b700] font-bold">Wearable Companion Sub-HUD</div>
                    <p className="text-[#9ba89b] text-[11px] leading-relaxed">
                      Lightweight wrist companion display (WearOS / Apple Watch / Garmin) with rotating target bearing needle, glanceable distance counter, and 1-tap glove PIN confirmation.
                    </p>
                  </div>
                  <div className="p-3.5 rounded bg-[#0b0f0b] border border-[#2e3d2e] space-y-1">
                    <div className="text-[#f5b700] font-bold">Sensor-Fusion Rig Calibration</div>
                    <p className="text-[#9ba89b] text-[11px] leading-relaxed">
                      Trigonometric tilt-compensated digital compass, automated figure-8 magnetometer calibration routine, and Baltic regional magnetic declination adjustment.
                    </p>
                  </div>
                </div>

                {/* Milestone 5 Live Interactive Laboratory */}
                <div className="pt-4 border-t border-[#2e3d2e] space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 bg-[#68d391] rounded-sm" />
                    <span className="text-xs font-black uppercase text-[#68d391] tracking-wider">
                      MILESTONE 5 INTERACTIVE LORA TRANSCEIVER &amp; WEARABLE LABORATORY
                    </span>
                  </div>

                  <div className="w-full">
                    <LoraTransceiverWidget />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2e3d2e] bg-[#141c14] px-4 py-8 font-mono text-xs text-[#9ba89b]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-[#f5b700] font-bold">GridCommand Tactical Operations</span> — Open Architecture for Decentralized MilSim &amp; Field Simulations.
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com/FranekJemiolo/gridcommand" className="hover:text-[#f5b700] transition-colors">
              GitHub Repository
            </a>
            <span>•</span>
            <span className="text-[#c7a76c]">MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
