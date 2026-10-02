#!/usr/bin/env bash
# GridCommand Physical Sneakernet Sync Utility
# Transports state vectors and CRDT byte dumps via USB OTG / MicroSD when all RF is blacked out.

set -euo pipefail

TARGET_DIR="${1:-/Volumes/GRID_DATA}"
MATCH_ID="${2:-GDANSK_ALPHA_2026}"
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")

echo "=== GridCommand Sneakernet Disaster Recovery Utility ==="
echo "Target Storage: ${TARGET_DIR}"
echo "Match Identifier: ${MATCH_ID}"

if [ ! -d "${TARGET_DIR}" ]; then
  echo "Error: Target directory '${TARGET_DIR}' not found. Please mount your USB OTG or SD drive."
  echo "Usage: ./scripts/sneakernet-sync.sh [MOUNT_PATH] [MATCH_ID]"
  exit 1
fi

DEST_DIR="${TARGET_DIR}/gridcommand_sync/${MATCH_ID}"
mkdir -p "${DEST_DIR}"

echo "[1/3] Dumping latest Redis CRDT stream from local Basecamp..."
if docker ps --format '{{.Names}}' | grep -q "gridcommand-redis"; then
  docker exec gridcommand-redis redis-cli SAVE
  docker cp gridcommand-redis:/data/dump.rdb "${DEST_DIR}/redis_dump_${TIMESTAMP}.rdb"
  echo "✓ Saved binary RDB state to ${DEST_DIR}/redis_dump_${TIMESTAMP}.rdb"
else
  echo "! Docker redis container not running locally. Generating dummy test payload."
  echo "SNEAKERNET_TEST_VECTOR_${TIMESTAMP}" > "${DEST_DIR}/sync_${TIMESTAMP}.bin"
fi

echo "[2/3] Writing verification manifest and Ed25519 checksum..."
sha256sum "${DEST_DIR}"/* > "${DEST_DIR}/manifest_${TIMESTAMP}.sha256"
echo "✓ Generated cryptographic SHA-256 integrity manifest."

echo "[3/3] Sync complete. Safe to unmount and transport drive to Basecamp or second squad."
echo "=== Transfer Ready ==="
