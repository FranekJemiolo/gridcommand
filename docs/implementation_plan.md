# GridCommand: Engineering Implementation Plan

This document details the concrete implementation strategy for GridCommand, a decentralized, local-first tactical field simulation platform.

## Architecture Overview
- **Monorepo**: pnpm workspaces + Turborepo
- **Packages**:
  - `packages/crdt-core`: HLC, Yjs append-only `mission_events` schemas, deterministic DAG state reducer, BLE 122-byte chunker.
  - `packages/crypto`: Ed25519 signature generation and verification (`@noble/curves/ed25519`), Base45 encoding/decoding.
  - `packages/ui-theme`: Tailwind tokens, Tactical Red-Light filter, High-Contrast Sunlight theme, Rain Lock touch guard, 60x60px tactile buttons.
- **Applications**:
  - `apps/mobile`: Vite + React + TypeScript + Capacitor, Rig Mode 45-degree tactical HUD, MapLibre GL + PMTiles offline protocol loader, fallback PIN numpad.
  - `apps/gm-dashboard`: Vite + React + TypeScript + Deck.gl Hexagon layer, Temporal DVR Scrubber, Event Ticker, God-Mode force resolve, Hazard injection.
  - `apps/docs`: Interactive documentation and demo site showcasing the system, interactive architecture visualizer, mobile HUD simulation, and deployment guides.
- **Services**:
  - `services/backend-ingress`: Python FastAPI service managed with `uv`, `/api/v1/mesh/sync` binary CRDT merge via `pycrdt` into Redis.
  - `services/dag-rule-engine`: Python service managed with `uv`, DAG graph cascade validation via `networkx`, anti-cheat velocity heuristics.
- **CI/CD**:
  - `.github/workflows/ci.yml`: Full test & lint matrix (pnpm test, pnpm lint, uv run pytest).
  - `.github/workflows/deploy-pages.yml`: Automated GitHub Pages deploy for `apps/docs`.

## Milestones & Phasing
1. **Milestone 1**: Scaffolding, Tooling & Core CRDT/Crypto/Theme Packages (`✓ COMPLETED`).
2. **Milestone 2**: Frontend Applications - Mobile Client, GM Dashboard, Docs Site (`✓ COMPLETED`).
3. **Milestone 3**: Dynamic DAG Mission Builder, Squad Roster & Signed Manifests (`✓ COMPLETED`).
4. **Milestone 4**: 3D Spatial AAR Playback Engine & Anti-Cheat Cryptographic Audit (`✓ COMPLETED`).
5. **Milestone 5**: LoRa SX1262 Transceiver Bridge, Wearable Sub-HUD & Sensor Fusion (`✓ COMPLETED`).

## Version 2.0 Architecture & Extensions
1. **Defense Interoperability (ATAK Cursor-on-Target CoT)**: Bidirectional XML bridge between Yjs CRDT events and standard NATO CoT schemas (`cotGateway.ts`).
2. **Dynamic Tactical Weather & Electronic Warfare (EW) Jamming**: Real-time simulation of meteorological factors (rain, thermal fog, smoke drift) and deployable EW RF denial zones (`tacticalEnvironment.ts`).
3. **Autonomous AI OPFOR Red-Team Bot Fleet & Procedural Scenarios**: Adversary AI patrol agents and procedural mission DAG generation (`opforSimulation.ts`).
4. **AR Spatial Camera Overlay HUD**: Direct camera viewfinder overlay with virtual 3D floating markers and compass azimuth ladder (`ARCameraOverlayWidget.tsx`).
5. **Tactical Acoustic Intercom (PTT)**: Mesh-packetized voice bursts and tactical quick-shouts (`voiceBurst.ts`, `TacticalIntercomWidget.tsx`).
6. **Production Field Edge Deployment**: Automated installer (`deploy/install.sh`) and hardened production Docker stack (`deploy/docker-compose.prod.yml`).
