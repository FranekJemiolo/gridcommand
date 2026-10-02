import React, { useState } from 'react';
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
import { TacticalButton, StatusBadge, CompassBearing } from '@gridcommand/ui-theme';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'mobile-hud' | 'gm-center' | 'mesh-sim' | 'bom'>('overview');
  const [demoRedMode, setDemoRedMode] = useState(false);
  const [demoRainLock, setDemoRainLock] = useState(false);
  const [demoCaptured, setDemoCaptured] = useState(false);

  return (
    <div className={`min-h-screen bg-[#05080c] text-[#e6edf3] font-sans ${demoRedMode ? 'tactical-red-mode' : ''}`}>
      {/* Top Tactical Navigation */}
      <nav className="sticky top-0 z-50 bg-[#0a0e14]/95 border-b border-[#1e2638] backdrop-blur-md px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#00f3ff]/10 border border-[#00f3ff] flex items-center justify-center text-[#00f3ff]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-mono font-black text-sm text-[#00f3ff] tracking-wider">
                GRIDCOMMAND
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-mono text-[#8b949e] border border-[#1e2638] px-1.5 py-0.5 rounded">
                v0.1.0-ALPHA
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-3 text-xs font-mono">
            {(['overview', 'mobile-hud', 'gm-center', 'mesh-sim', 'bom'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2.5 py-1.5 rounded uppercase font-bold transition-all ${
                  activeTab === tab
                    ? 'bg-[#00f3ff]/15 text-[#00f3ff] border border-[#00f3ff]'
                    : 'text-[#8b949e] hover:text-[#e6edf3]'
                }`}
              >
                {tab.replace('-', ' ')}
              </button>
            ))}

            <a
              href="https://github.com/FranekJemiolo/gridcommand"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#121820] border border-[#1e2638] text-xs font-mono hover:border-[#8b949e] transition-colors ml-2"
            >
              <Github className="w-4 h-4" />
              <span className="hidden md:inline">GitHub</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative border-b border-[#1e2638] bg-gradient-to-b from-[#0a0e14] via-[#05080c] to-[#000000] px-4 py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#1e2638_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#00ff66]/30 bg-[#00ff66]/10 text-[#00ff66] font-mono text-xs mb-6">
            <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse" />
            ZERO-CONNECTIVITY MILITARY-GRADE STATE MACHINE
          </div>
          <h1 className="text-4xl sm:text-6xl font-black font-mono tracking-tight text-white mb-6">
            Decentralized Tactical Field Simulation Platform
          </h1>
          <p className="text-base sm:text-xl text-[#8b949e] max-w-3xl mx-auto leading-relaxed mb-8">
            Engineered to coordinate multi-squad tactical operations and civilian MilSim exercises in deep forest canopies, subterranean bunkers, and total cellular blackouts.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 font-mono text-xs">
            <TacticalButton variant="cyan" onClick={() => setActiveTab('mobile-hud')}>
              LAUNCH MOBILE HUD DEMO
            </TacticalButton>
            <TacticalButton variant="yellow" onClick={() => setActiveTab('gm-center')}>
              EXPLORE GM COMMAND CENTER
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
                <p className="text-sm font-mono text-[#8b949e] mt-2">
                  Uncompromising resilience when infrastructure fails
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono">
                <div className="p-6 rounded-lg bg-[#0a0e14] border border-[#1e2638] hover:border-[#00f3ff]/50 transition-all">
                  <div className="w-10 h-10 rounded bg-[#00f3ff]/10 border border-[#00f3ff] flex items-center justify-center text-[#00f3ff] mb-4">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">1. Local-First Edge CRDT Ledger</h3>
                  <p className="text-xs text-[#8b949e] leading-relaxed">
                    Every operator device functions as an autonomous sovereign node with an append-only Yjs / pycrdt event log. Clocks are synchronized via Hybrid Logical Clocks (HLC) guaranteeing deterministic convergence with automatic rollbacks.
                  </p>
                </div>

                <div className="p-6 rounded-lg bg-[#0a0e14] border border-[#1e2638] hover:border-[#ffe600]/50 transition-all">
                  <div className="w-10 h-10 rounded bg-[#ffe600]/10 border border-[#ffe600] flex items-center justify-center text-[#ffe600] mb-4">
                    <Radio className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">2. Multi-Tier Opportunistic Mesh</h3>
                  <p className="text-xs text-[#8b949e] leading-relaxed">
                    Updates propagate via chunked 122-byte Bluetooth Low Energy (BLE) GATT exchanges between passing operators, Wi-Fi Direct "Data Mules," long-range Meshtastic LoRa radios (2-5km canopy), and physical USB-C OTG flash drives.
                  </p>
                </div>

                <div className="p-6 rounded-lg bg-[#0a0e14] border border-[#1e2638] hover:border-[#00ff66]/50 transition-all">
                  <div className="w-10 h-10 rounded bg-[#00ff66]/10 border border-[#00ff66] flex items-center justify-center text-[#00ff66] mb-4">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">3. Cryptographic Proof of Presence</h3>
                  <p className="text-xs text-[#8b949e] leading-relaxed">
                    Eliminating GPS spoofing and photo-cloning exploits, terrain objectives are verified via dual-layer NTAG215 epoxy discs and Base45 QR codes signed with Game Master Ed25519 private keys and validated against sensor-fusion snapshots.
                  </p>
                </div>

                <div className="p-6 rounded-lg bg-[#0a0e14] border border-[#1e2638] hover:border-[#ff5500]/50 transition-all">
                  <div className="w-10 h-10 rounded bg-[#ff5500]/10 border border-[#ff5500] flex items-center justify-center text-[#ff5500] mb-4">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">4. Client-Side DAG State Machine</h3>
                  <p className="text-xs text-[#8b949e] leading-relaxed">
                    Missions are modeled as Directed Acyclic Graphs (DAGs). Each node folds the chronologically sorted HLC stream over the graph, triggering cascading mission unlocks and hazard quarantines without requiring a centralized server.
                  </p>
                </div>
              </div>
            </section>

            {/* Offline Vector PMTiles Section */}
            <section className="p-8 rounded-xl bg-gradient-to-r from-[#0a0e14] to-[#121820] border border-[#1e2638] font-mono">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-4 max-w-xl">
                  <div className="inline-block px-2.5 py-1 rounded bg-[#00f3ff]/10 text-[#00f3ff] text-xs font-bold border border-[#00f3ff]/30">
                    SERVERLESS TILE PROTOCOL
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    Offline Vector Maps with PMTiles & MapLibre GL
                  </h3>
                  <p className="text-xs text-[#8b949e] leading-relaxed">
                    Traditional map libraries fail in forest dead zones because they rely on cloud tile endpoints. GridCommand bundles high-resolution vector terrain, contours, and landmarks into a single-file <code className="text-[#00f3ff]">.pmtiles</code> archive loaded directly from local phone storage via custom HTTP Range handlers.
                  </p>
                </div>
                <div className="p-4 rounded bg-black border border-[#1e2638] text-xs text-[#00f3ff] font-mono space-y-1">
                  <div>const protocol = new Protocol();</div>
                  <div>maplibregl.addProtocol('pmtiles', protocol.tile);</div>
                  <div className="text-[#8b949e] mt-2">// Zero network requests in the woods</div>
                  <div className="text-[#ffe600]">url: 'pmtiles:///storage/maps/op.pmtiles'</div>
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
            <div className="max-w-md mx-auto rounded-3xl border-4 border-[#1e2638] bg-black p-4 shadow-2xl relative overflow-hidden">
              {demoRainLock && (
                <div className="absolute inset-0 z-40 bg-black/90 flex flex-col items-center justify-center p-6 text-center">
                  <div className="text-3xl mb-2">🔒</div>
                  <div className="text-sm font-black text-[#ffe600]">RAIN LOCK ENGAGED</div>
                  <div className="text-[10px] text-[#8b949e] mt-1 mb-4">
                    Touch listeners disabled. Operate with hardware buttons.
                  </div>
                  <TacticalButton size="compact" variant="yellow" onClick={() => setDemoRainLock(false)}>
                    UNLOCK
                  </TacticalButton>
                </div>
              )}

              {/* Status Header */}
              <div className="flex items-center justify-between text-[11px] pb-3 border-b border-[#1e2638]">
                <span className="text-[#00ff66] font-bold">● GPS: ±2.4m</span>
                <span className="text-[#00f3ff]">MESH: 4 NODES</span>
                <span className="text-[#8b949e]">BAT: 92%</span>
              </div>

              {/* Simulated Map Viewport */}
              <div className="relative h-64 my-3 rounded-lg bg-[#0a0e14] border border-[#1e2638] flex flex-col items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#00f3ff_1px,transparent_1px)] [background-size:16px_16px]" />
                <CompassBearing
                  heading={42}
                  targetBearing={55}
                  targetDistanceMeters={demoCaptured ? 420 : 64}
                  targetName={demoCaptured ? 'BUNKER 02 (LOCKED)' : 'BUNKER 01 (ACTIVE)'}
                />
              </div>

              {/* Interactive Tactical Controls */}
              <div className="space-y-2">
                <div className="p-2 rounded bg-[#121820] border border-[#1e2638] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#8b949e]">OBJECTIVE: </span>
                    <span className="text-[#00f3ff] font-bold">
                      {demoCaptured ? 'BUNKER 01 [RESOLVED]' : 'BUNKER 01 [ACTIVE]'}
                    </span>
                  </div>
                  <StatusBadge status={demoCaptured ? 'RESOLVED' : 'ACTIVE'} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <TacticalButton
                    variant={demoCaptured ? 'green' : 'cyan'}
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
                <h2 className="text-2xl font-bold text-white">Game Master Command Center & DVR Scrubber</h2>
                <p className="text-xs text-[#8b949e]">
                  Deck.gl Discretized Hexagon tactical view, God-mode overrides, and time-travel replay.
                </p>
              </div>
            </div>

            {/* GM Command Screen Mockup */}
            <div className="rounded-xl border-2 border-[#1e2638] bg-[#0a0e14] p-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#1e2638] text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-[#00f3ff] font-black">GM CONSOLE // LIVE</span>
                  <span className="text-[#8b949e]">MATCH: MAZOWSZE_ALPHA_2026</span>
                </div>
                <div className="flex items-center gap-3 font-bold">
                  <span className="text-[#0077ff]">ALPHA: 250 PTS</span>
                  <span className="text-[#ff2200]">BRAVO: 100 PTS</span>
                </div>
              </div>

              {/* Grid representation */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 my-4">
                <div className="lg:col-span-2 h-72 rounded bg-black border border-[#1e2638] p-4 flex flex-col justify-between relative overflow-hidden">
                  <div className="text-xs text-[#8b949e] font-bold">DISCRETIZED TACTICAL HEX BATTLE MAP (DECK.GL)</div>
                  
                  {/* Hexagon visualizer */}
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-black py-4">
                    <div className="p-3 rounded border border-[#0077ff] bg-[#0077ff]/20 text-[#0077ff]">
                      HEX A1<br />SQUAD ALPHA
                    </div>
                    <div className="p-3 rounded border border-[#00ff66] bg-[#00ff66]/20 text-[#00ff66]">
                      BUNKER 01<br />CAPTURED
                    </div>
                    <div className="p-3 rounded border border-[#ff5500] bg-[#ff5500]/20 text-[#ff5500] animate-pulse">
                      HEX B2<br />CONTESTED
                    </div>
                    <div className="p-3 rounded border border-[#ff2200] bg-[#ff2200]/20 text-[#ff2200]">
                      HEX C1<br />SQUAD BRAVO
                    </div>
                  </div>

                  <div className="text-[11px] text-[#00ff66]">● 15 Edge nodes synchronized over BLE / LoRa mesh</div>
                </div>

                {/* Event Ticker */}
                <div className="h-72 rounded bg-black border border-[#1e2638] p-3 overflow-y-auto space-y-2 text-xs">
                  <div className="text-[#8b949e] font-bold pb-1 border-b border-[#1e2638]">CRDT INGRESS STREAM</div>
                  <div className="p-2 rounded bg-[#121820] border border-[#1e2638]">
                    <span className="text-[10px] text-[#8b949e]">14:12:05</span>
                    <div className="text-[#00ff66] font-bold">Bunker 01 captured by Squad Alpha</div>
                  </div>
                  <div className="p-2 rounded bg-[#121820] border border-[#1e2638]">
                    <span className="text-[10px] text-[#8b949e]">14:10:22</span>
                    <div className="text-[#00f3ff]">Geofence breached (±2.8m GPS lock)</div>
                  </div>
                  <div className="p-2 rounded bg-[#121820] border border-[#1e2638]">
                    <span className="text-[10px] text-[#8b949e]">14:00:00</span>
                    <div className="text-[#8b949e]">Simulation Genesis HLC Registered</div>
                  </div>
                </div>
              </div>

              {/* Scrubber Bar */}
              <div className="pt-3 border-t border-[#1e2638] flex items-center justify-between text-xs text-[#8b949e]">
                <span>14:00:00</span>
                <div className="flex-1 mx-4 h-2 bg-[#121820] rounded-full relative">
                  <div className="w-3/4 h-full bg-[#00f3ff] rounded-full" />
                </div>
                <span className="text-[#00f3ff] font-bold">14:45:00 [LIVE]</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Mesh Simulator */}
        {activeTab === 'mesh-sim' && (
          <div className="space-y-6 font-mono">
            <h2 className="text-2xl font-bold text-white">Decentralized Mesh Topology Visualizer</h2>
            <p className="text-xs text-[#8b949e]">
              How updates propagate without internet access using opportunistic multi-hop gossip and radio bridges.
            </p>

            <div className="p-8 rounded-xl border border-[#1e2638] bg-[#0a0e14] space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                <div className="p-4 rounded-lg bg-[#121820] border border-[#00f3ff]/50">
                  <div className="text-xs text-[#8b949e]">NODE 1</div>
                  <div className="text-sm font-bold text-[#00f3ff] mt-1">Pointman (Offline)</div>
                  <div className="text-[10px] text-[#8b949e] mt-2">Captures NFC Tag</div>
                  <div className="mt-3 text-xs text-[#00ff66]">HLC Event Committed</div>
                </div>

                <div className="p-4 rounded-lg bg-[#121820] border border-[#ffe600]/50">
                  <div className="text-xs text-[#8b949e]">HOP 1 (BLE 30m)</div>
                  <div className="text-sm font-bold text-[#ffe600] mt-1">Squad Leader</div>
                  <div className="text-[10px] text-[#8b949e] mt-2">122-Byte BLE Frames</div>
                  <div className="mt-3 text-xs text-[#00ff66]">Local Yjs Merged</div>
                </div>

                <div className="p-4 rounded-lg bg-[#121820] border border-[#ff5500]/50">
                  <div className="text-xs text-[#8b949e]">HOP 2 (LORA 2-5km)</div>
                  <div className="text-sm font-bold text-[#ff5500] mt-1">Data Mule / Radio</div>
                  <div className="text-[10px] text-[#8b949e] mt-2">LilyGO T-Echo SX1262</div>
                  <div className="mt-3 text-xs text-[#00ff66]">237-Byte LoRa MTU</div>
                </div>

                <div className="p-4 rounded-lg bg-[#121820] border border-[#00ff66]/50">
                  <div className="text-xs text-[#8b949e]">DESTINATION</div>
                  <div className="text-sm font-bold text-[#00ff66] mt-1">Basecamp Server</div>
                  <div className="text-[10px] text-[#8b949e] mt-2">FastAPI + pycrdt</div>
                  <div className="mt-3 text-xs text-[#00ff66]">Deck.gl Map Updated</div>
                </div>
              </div>

              <div className="p-4 rounded bg-black border border-[#1e2638] text-xs space-y-2">
                <div className="text-[#ffe600] font-bold">AUTOMATIC SPLIT-BRAIN CONVERGENCE:</div>
                <p className="text-[#8b949e] text-[11px] leading-relaxed">
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
            <p className="text-xs text-[#8b949e]">
              Field-proven procurement specification for a 15-operator (3-squad) Alpha tactical deployment.
            </p>

            <div className="overflow-x-auto rounded-lg border border-[#1e2638]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0a0e14] text-[#8b949e] border-b border-[#1e2638]">
                  <tr>
                    <th className="p-3">Category</th>
                    <th className="p-3">Specification</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3">Unit Cost</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Field Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2638] bg-black">
                  <tr>
                    <td className="p-3 font-bold text-[#00f3ff]">Objective Tokens</td>
                    <td className="p-3">NTAG215 Anti-Metal 30mm Epoxy Disc</td>
                    <td className="p-3">20</td>
                    <td className="p-3">$0.85</td>
                    <td className="p-3 text-[#00ff66]">$17.00</td>
                    <td className="p-3 text-[#8b949e]">100% waterproof; scans on metal poles or trees.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#00f3ff]">Objective Backup</td>
                    <td className="p-3">Rite in the Rain Poly Laser Paper</td>
                    <td className="p-3">1 Pack</td>
                    <td className="p-3">$18.00</td>
                    <td className="p-3 text-[#00ff66]">$18.00</td>
                    <td className="p-3 text-[#8b949e]">Laser-printed QR codes; zero ink bleed in pouring rain.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#ffe600]">Operator Power</td>
                    <td className="p-3">Nitecore NB10000 Gen 2 (10,000mAh)</td>
                    <td className="p-3">15</td>
                    <td className="p-3">$59.95</td>
                    <td className="p-3 text-[#00ff66]">$899.25</td>
                    <td className="p-3 text-[#8b949e]">150g ultralight; sustains GPS & WebGL for 8+ hours.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#ffe600]">Rig Mounts</td>
                    <td className="p-3">MOLLE Flip-Down Phone Board (45°)</td>
                    <td className="p-3">15</td>
                    <td className="p-3">$14.50</td>
                    <td className="p-3 text-[#00ff66]">$217.50</td>
                    <td className="p-3 text-[#8b949e]">Hands-free chest angle for Rig Mode glanceable HUD.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#ff5500]">LoRa Mesh Bridge</td>
                    <td className="p-3">LilyGO T-Echo SX1262 868MHz Radio</td>
                    <td className="p-3">3</td>
                    <td className="p-3">$45.00</td>
                    <td className="p-3 text-[#00ff66]">$135.00</td>
                    <td className="p-3 text-[#8b949e]">Squad Comms; transmits DAG changes across 2-5km canopy.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#8b949e]">Basecamp Router</td>
                    <td className="p-3">GL.iNet GL-AXT1800 Slate AX Wi-Fi 6</td>
                    <td className="p-3">1</td>
                    <td className="p-3">$129.00</td>
                    <td className="p-3 text-[#00ff66]">$129.00</td>
                    <td className="p-3 text-[#8b949e]">5V USB-C powered high-speed onboarding bubble.</td>
                  </tr>
                  <tr className="bg-[#0a0e14] font-black">
                    <td className="p-3 text-white" colSpan={4}>TOTAL BOM INFRASTRUCTURE COST</td>
                    <td className="p-3 text-[#00ff66] text-sm">$1,556.58</td>
                    <td className="p-3 text-[#8b949e]">Complete 15-operator turn-key deployment.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1e2638] bg-[#0a0e14] px-4 py-8 font-mono text-xs text-[#8b949e]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-[#00f3ff] font-bold">GridCommand Tactical Operations</span> — Open Architecture for Decentralized MilSim & Field Simulations.
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com/FranekJemiolo/gridcommand" className="hover:text-white transition-colors">
              GitHub Repository
            </a>
            <span>•</span>
            <span>MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
