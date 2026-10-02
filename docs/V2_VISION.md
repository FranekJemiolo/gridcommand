# GridCommand Version 2.0: Vision, Architecture & Implementation Roadmap

## 🎯 Executive Summary & Vision

GridCommand v1.0 established the foundation for decentralized, local-first tactical field simulations: Hybrid Logical Clocks (HLC), conflict-free replicated data types (CRDT), MGRS coordinate grids, terrain elevation line-of-sight analysis, dynamic DAG mission builder, spatial After-Action Review (AAR), anti-cheat cryptographic audit, and Sub-GHz LoRa SX1262 transceiver bridging.

**GridCommand Version 2.0** evolves this architecture into a comprehensive **Tactical Operating System** for military simulation, search-and-rescue (SAR), and defense evaluations. It enhances capabilities for both **Admins (Game Masters / Scenario Directors)** and **Users (Field Operators / Squad Leaders)**, introduces standardized defense interoperability (ATAK Cursor-on-Target), autonomous OPFOR bot simulation, tactical AR overlays, mesh push-to-talk voice bursts, and rugged field edge deployment.

---

## 🛠️ Key Stakeholder Enhancements in Version 2.0

```
┌────────────────────────────────────────────────────────────────────────┐
│                   GRIDCOMMAND V2.0 ECOSYSTEM                           │
├───────────────────────────────────┬────────────────────────────────────┤
│  ADMINS & SCENARIO DIRECTORS      │  FIELD OPERATORS & SQUADS          │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Dynamic Weather & EW Jamming    │ • AR Spatial Camera Overlay HUD    │
│ • AI OPFOR Autonomous Bot Fleet   │ • Mesh Push-To-Talk Voice Bursts   │
│ • ATAK / CivTAK CoT XML Gateway   │ • Haptic Proximity Vector Guidance │
│ • Procedural DAG Mission Creator  │ • Ultra-Low-Power E-Ink Glance View│
│ • Multi-Arena Fleet Orchestration │ • 1-Tap Offline Incident SPOTREP   │
└───────────────────────────────────┴────────────────────────────────────┘
```

### 1. For Game Masters & Admins (Command, Control & Authoring)
1. **Dynamic Tactical Weather & Electronic Warfare (EW) Jamming Engine**:
   - Real-time simulation of meteorological factors: rain, thermal fog, smoke screens with wind vectors, and night vision green/white phosphor modes.
   - Deployable EW Jamming Spheres that simulate GPS denial, RF degradation, and increased packet loss on nearby peer nodes.
2. **AI-Assisted Procedural Mission Generator & OPFOR Simulation**:
   - Automated DAG mission generation that analyzes topographical elevation profiles to locate realistic military objectives (command ridges, ambush chokepoints, rally points).
   - Autonomous Red-Team (OPFOR) bot agents executing dynamic patrol algorithms, contesting objectives, triggering contact alarms, and reacting to Blue Force movements.
3. **Defense Interoperability Gateway (ATAK Cursor-on-Target / CoT)**:
   - Direct translation between GridCommand CRDT state and standard NATO/US DoD Cursor-on-Target (CoT) XML schemas (`b-t-f` friendly tracks, `a-u-G` ground objectives, `b-m-p` SPOTREP markers).
   - Enables real-time telemetry streaming to Android Tactical Assault Kit (ATAK), WinTAK, and QGIS.

### 2. For Field Operators & Squad Leaders (Tactical HUD & Edge Utility)
4. **AR Spatial Camera Overlay HUD**:
   - WebXR / HTML5 Canvas camera overlay projecting virtual floating objective pins, distances, and blue force squad callsigns directly onto the physical environment.
   - Azimuth ladder and artificial horizon pitch/roll stabilization.
5. **Mesh Push-To-Talk (PTT) Voice Burst & Tactical Quick-Shouts**:
   - Low-bandwidth packetized acoustic voice bursts and tactical quick-shouts ("CONTACT FRONT", "FALL BACK", "RALLY ON OBJECTIVE", "CALL FOR MEDIC") encoded into lightweight CRDT delta chunks distributed across Bluetooth & LoRa.
6. **Tactical Multi-Mode HUD Enhancements**:
   - Enhanced glanceability on rugged chest mounts, smartwatches, and vehicle tablets.

---

## 📦 Installation, Deployment & Self-Hosting Guide

GridCommand v2.0 is designed for both connected cloud operations and **air-gapped, zero-internet tactical deployments** in the field.

### Deployment Options

| Deployment Mode | Target Hardware | Connectivity | Primary Use Case |
| :--- | :--- | :--- | :--- |
| **Tactical Field Edge** | Raspberry Pi 5 / Khadas Edge 2 | 100% Offline (Local Wi-Fi + LoRa) | Field exercises in remote forest/mountain terrain |
| **Vehicle Tactical Rig** | Rugged Mil-Spec Panasonic Toughbook | Local Ethernet + Mesh Wi-Fi | Battalion HQ, Mobile Command Post |
| **Cloud Central Command** | AWS / Hetzner / DigitalOcean (Docker) | Public WAN + WebSockets | Tournament oversight, remote post-action debriefs |

---

### Step-by-Step Installation Procedures

#### Option A: Quickstart with Docker Compose (Production Server)

```bash
# 1. Clone repository
git clone https://github.com/FranekJemiolo/gridcommand.git
cd gridcommand

# 2. Launch production stack (FastAPI sync server, Redis CRDT store, GM Dashboard, Docs)
docker compose -f deploy/docker-compose.prod.yml up -d

# 3. Access tactical services:
# GM Command Center: http://localhost:4174
# Field Documentation & Live Labs: http://localhost:4175
# Backend Ingress & Sync API: http://localhost:8000/docs
```

#### Option B: Bare-Metal / Raspberry Pi Tactical Field Gateway

```bash
# 1. Ensure Node.js 22+, pnpm, and Astral uv are installed
curl -fsSL https://get.pnpm.io/install.sh | sh -
curl -LsSf https://astral.sh/uv/install.sh | sh

# 2. Install monorepo dependencies and build production bundles
pnpm install
pnpm build

# 3. Run production services locally
# In separate terminal or systemd service units:
# (a) Backend ingress:
cd services/backend-ingress && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
# (b) GM Dashboard:
pnpm --filter @gridcommand/gm-dashboard preview --port 4174 --host 0.0.0.0
# (c) Mobile Client:
pnpm --filter @gridcommand/mobile preview --port 4173 --host 0.0.0.0
```

#### Option C: Native Mobile Installation (Android / iOS)

```bash
# Mobile client is pre-configured with Capacitor for native hardware bridging
cd apps/mobile
pnpm build
npx cap sync
npx cap open android # or npx cap open ios
```

---

## 🗓️ Implementation Roadmap for Version 2.0

### Phase 1: Core Protocols & Interoperability (`packages/crdt-core`)
- [`packages/crdt-core/src/cotGateway.ts`](file:///Users/franek/personal_workspace/gridcommand/packages/crdt-core/src/cotGateway.ts): Cursor-on-Target XML encoder and parser for ATAK/WinTAK integration.
- [`packages/crdt-core/src/tacticalEnvironment.ts`](file:///Users/franek/personal_workspace/gridcommand/packages/crdt-core/src/tacticalEnvironment.ts): Dynamic weather simulation, smoke dispersion, and EW RF jamming zones.
- [`packages/crdt-core/src/opforSimulation.ts`](file:///Users/franek/personal_workspace/gridcommand/packages/crdt-core/src/opforSimulation.ts): Autonomous OPFOR Red-Team bot AI with patrol states and procedural mission generation.
- [`packages/crdt-core/src/voiceBurst.ts`](file:///Users/franek/personal_workspace/gridcommand/packages/crdt-core/src/voiceBurst.ts): Mesh voice burst framing and tactical quick-shout distribution.

### Phase 2: Tactical UI Components (`packages/ui-theme`)
- [`packages/ui-theme/src/components/ARCameraOverlayWidget.tsx`](file:///Users/franek/personal_workspace/gridcommand/packages/ui-theme/src/components/ARCameraOverlayWidget.tsx): Spatial camera HUD with floating target pins and azimuth ladder.
- [`packages/ui-theme/src/components/WeatherEWConsoleWidget.tsx`](file:///Users/franek/personal_workspace/gridcommand/packages/ui-theme/src/components/WeatherEWConsoleWidget.tsx): Environmental control console for weather, wind, smoke, and EW jamming.
- [`packages/ui-theme/src/components/TacticalIntercomWidget.tsx`](file:///Users/franek/personal_workspace/gridcommand/packages/ui-theme/src/components/TacticalIntercomWidget.tsx): Push-to-Talk (PTT) audio intercom and tactical quick-shout broadcaster.
- [`packages/ui-theme/src/components/OpforMissionGeneratorWidget.tsx`](file:///Users/franek/personal_workspace/gridcommand/packages/ui-theme/src/components/OpforMissionGeneratorWidget.tsx): Autonomous OPFOR bot fleet inspector and procedural DAG mission authoring.

### Phase 3: Application Integration & E2E Verification
- Mount AR overlay and tactical intercom into `apps/mobile`.
- Mount Weather/EW console, OPFOR manager, and ATAK export into `apps/gm-dashboard`.
- Mount interactive v2 laboratories and installation guide in `apps/docs`.
- Unit test suite expansion to 45+ tests, full monorepo build, linting, screenshots refresh, and GitHub Actions verification.
