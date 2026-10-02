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
1. **Milestone 1**: Scaffolding, Tooling & Core CRDT/Crypto/Theme Packages.
2. **Milestone 2**: Frontend Applications (Mobile Client, GM Dashboard, Docs Site).
3. **Milestone 3**: Python Microservices with Astral `uv` (Ingress & DAG Rule Engine).
4. **Milestone 4**: CI/CD Pipelines, GitHub Actions, and Remote Repository Push.
5. **Milestone 5**: Verification, Visual Assets, Screenshots, and Final Validation.
