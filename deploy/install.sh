#!/usr/bin/env bash
# GridCommand Automated Production Installation Script
# Supports Ubuntu 22.04+, Debian 12+, macOS, and Raspberry Pi OS (64-bit)

set -euo pipefail

echo "=========================================================="
echo "      GRIDCOMMAND TACTICAL SYSTEM INSTALLER               "
echo "=========================================================="

# Check requirements
command -v node >/dev/null 2>&1 || { echo >&2 "Error: Node.js 20+ required. Please install Node.js."; exit 1; }
command -v pnpm >/dev/null 2>&1 || {
  echo "Installing pnpm..."
  curl -fsSL https://get.pnpm.io/install.sh | sh -
}
command -v uv >/dev/null 2>&1 || {
  echo "Installing Astral uv..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
}

echo "✓ Core runtimes verified."

# Install dependencies across all monorepo workspaces
echo "Installing pnpm dependencies..."
pnpm install

# Build all packages and applications
echo "Building all packages and applications..."
pnpm build

# Setup Python microservices virtual environments
echo "Configuring Python microservices with uv..."
(cd services/backend-ingress && uv sync)
(cd services/dag-rule-engine && uv sync)

echo "=========================================================="
echo "✓ GridCommand Installation Complete."
echo "Launch GM Dashboard: pnpm --filter @gridcommand/gm-dashboard preview"
echo "Launch Mobile HUD:    pnpm --filter @gridcommand/mobile preview"
echo "Launch Docs Site:     pnpm --filter @gridcommand/docs preview"
echo "Launch Backend:       cd services/backend-ingress && uv run uvicorn app.main:app"
echo "=========================================================="
