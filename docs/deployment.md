# GridCommand: Production Deployment & Installation Guide

This document details the end-to-end (A to Z) setup, installation, native compilation, and field deployment procedures for **GridCommand**, spanning local edge nodes, tactical basecamp infrastructure, and cloud relays.

---

## 1. System Requirements

### Tactical Edge Hardware (Field Operators)
- **Field Smartphone**: Android 11+ or iOS 16+ ruggedized handsets (e.g., Samsung Galaxy XCover 6 Pro, AGM G2 Pro, Sonim XP10, or standard iPhones/Pixel devices).
- **Offline Storage**: At least 500 MB free flash storage for local vector map MBTiles / PMTiles and SQLite/IndexedDB CRDT logs.
- **Radios**: Bluetooth Low Energy (BLE 5.0+ with Extended Advertising) and/or LoRa 868 MHz / 915 MHz auxiliary data-mule transceiver.

### Basecamp Command Center
- **Server**: Ruggedized mini-PC (e.g., OnLogic Karbon series, Raspberry Pi 5, Intel NUC, or field laptop) running Debian 12 / Ubuntu 24.04 LTS.
- **Memory**: Minimum 4 GB RAM (8 GB recommended for 50+ concurrent tactical nodes).
- **Wi-Fi Access Point**: Rugged outdoor router (e.g., GL.iNet GL-AXT1800 Slate AX or MikroTik wAP ac) configured with captive portal and local DNS hijacking.

### Developer Environment
- **Node.js**: v20.x or v22.x LTS
- **Package Manager**: `pnpm` (v9.x+) and `Turborepo` (v2.x+)
- **Python**: 3.13+ managed via **Astral `uv`** (strictly no pipenv/poetry)
- **Docker**: Docker Engine 26+ and Docker Compose v2.20+
- **Android Toolchain (optional for APK builds)**: Android Studio Hedgehog+, Android SDK 34, JDK 17

---

## 2. Quickstart & Local Development

### 1. Clone & Bootstrap Workspace
```bash
git clone git@github.com:FranekJemiolo/gridcommand.git
cd gridcommand

# Install monorepo dependencies
pnpm install

# Build all TypeScript shared packages (@gridcommand/crdt-core, @gridcommand/crypto, @gridcommand/ui-theme)
pnpm build
```

### 2. Launch Local Dev Servers
```bash
# Launch Mobile Field Client (Port 5173 / 4173), GM Dashboard (Port 5174 / 4174), and Documentation (Port 5175 / 4175)
pnpm dev
```

### 3. Run Microservices with Astral `uv`
```bash
# Terminal 1: Backend Ingress (FastAPI + pycrdt)
cd services/backend-ingress
uv run uvicorn main:app --reload --port 8000

# Terminal 2: DAG Rule Engine & Anti-Cheat Heuristics
cd services/dag-rule-engine
uv run python main.py
```

### 4. Run Test Suites
```bash
# Frontend and CRDT core unit tests (Vitest)
pnpm test

# Python microservices tests (Pytest via uv)
cd services/backend-ingress && uv run pytest
cd ../dag-rule-engine && uv run pytest
```

---

## 3. Basecamp Server Deployment (Docker Compose)

For fully automated, zero-configuration field deployments at Basecamp:

### Step 1: Build Frontend Production Artifacts
```bash
cd /path/to/gridcommand
pnpm build
```

This compiles:
- `apps/mobile/dist` -> Tactical Field PWA client
- `apps/gm-dashboard/dist` -> Game Master Command Center & DVR Scrubber

### Step 2: Start the Tactical Stack
```bash
docker compose up -d --build
```

The stack provisions:
1. **`gridcommand-redis`**: In-memory message bus and append-only CRDT transaction store.
2. **`gridcommand-backend-ingress`**: FastAPI gateway with `pycrdt` CRDT state engine.
3. **`gridcommand-dag-rule-engine`**: NetworkX directed acyclic graph mission validator and velocity anti-cheat analyzer.
4. **`gridcommand-basecamp-web`**: Production Nginx server routing traffic:
   - `http://basecamp.local/` -> Mobile Field Client PWA
   - `http://basecamp.local/gm/` -> GM Dashboard
   - `http://basecamp.local/api/v1/` -> Ingress REST / WebSocket CRDT sync endpoints

### Step 3: Verify Container Health
```bash
docker compose ps
docker compose logs -f backend-ingress
```

---

## 4. Mobile Client Field Deployment

### Method A: Progressive Web App (PWA) Zero-Install (Recommended)
1. Field operators connect to the Basecamp Wi-Fi network (SSID: `GRIDCOMMAND-BASECAMP`).
2. The router's captive portal or browser auto-directs to `http://basecamp.local` (or `http://192.168.8.1`).
3. Tap **"Install Application"** or browser menu **"Add to Home Screen"**.
4. The service worker (`sw.js`) automatically pre-caches all application bundles, tactical UI themes, and initial mission graphs.
5. Once installed, the app functions 100% offline with zero internet connectivity.

### Method B: Native Android APK Compilation (Capacitor)

To compile a hardened, standalone native Android application with hardware volume button listeners and low-latency BLE peripheral access:

```bash
cd apps/mobile

# Build web distribution
pnpm build

# Initialize and sync Capacitor Android project
npx cap add android   # Only needed first time
npx cap sync android

# Open in Android Studio or build APK from command line
cd android
./gradlew assembleRelease

# The signed production APK will be generated at:
# android/app/build/outputs/apk/release/app-release.apk
```

#### Sideloading via ADB:
```bash
adb install -r app-release.apk
```

---

## 5. Offline Field Router Configuration (GL.iNet / OpenWrt)

To deploy an autonomous offline Wi-Fi bubble in deep wilderness:

1. **Flash OpenWrt** or use stock GL.iNet firmware.
2. Configure **DNS Hijacking** in `/etc/dnsmasq.conf`:
   ```conf
   address=/#/192.168.8.1
   ```
   *This ensures any URL entered by operators immediately resolves to the Basecamp server.*
3. Configure **mDNS** (`avahi-daemon`) to broadcast `basecamp.local`.
4. Point default HTTP root to `http://192.168.8.1:80`.

---

## 6. Air-Gapped Sneakernet Disaster Recovery

If electronic warfare (EW) jammers or terrain obstruct all RF (BLE, Wi-Fi, and LoRa), field operators utilize the **Sneakernet USB/MicroSD Transport Protocol**:

1. Insert an OTG USB flash drive or MicroSD card into the field device or Basecamp terminal.
2. Run the sync script:
   ```bash
   ./scripts/sneakernet-sync.sh /Volumes/FIELD_USB GDANSK_ALPHA_2026
   ```
3. The script extracts:
   - Latest binary CRDT differential updates.
   - Redis append-only snapshot (`dump.rdb`).
   - SHA-256 cryptographic verification manifest.
4. Physical couriers ("Data Mules") run the drive across terrain to Basecamp or neighboring squad outposts.
5. The receiving node copies the dump into its local state directory, which triggers automatic deterministic CRDT state convergence.

---

## 7. Public Documentation & Live Showcase

The documentation portal and interactive tactical architecture are hosted on GitHub Pages:

- **Live URL**: [https://franekjemiolo.github.io/gridcommand/](https://franekjemiolo.github.io/gridcommand/)
- **Deployment Pipeline**: Automatically compiled and verified on every commit to `main` via `.github/workflows/deploy-pages.yml`.
