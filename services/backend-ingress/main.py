"""
GridCommand Backend Ingress Service
FastAPI + pycrdt ingestion service for binary CRDT mesh updates.
"""

import os
import logging
from typing import Optional
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse
import pycrdt

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend-ingress")

app = FastAPI(
    title="GridCommand Backend Ingress",
    version="0.1.0",
    description="Decentralized mesh sync and CRDT ingestion service",
)

# Global in-memory pycrdt document for local and basecamp aggregation
master_doc = pycrdt.Doc()
master_map = master_doc.get("mission_events", type=pycrdt.Map)

# Optional Redis bridge
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = None

try:
    import redis
    redis_client = redis.from_url(REDIS_URL, decode_responses=False)
    # Check ping with low timeout
    redis_client.ping()
    logger.info("Connected to Redis backend at %s", REDIS_URL)
except Exception as e:
    logger.warning("Redis not available (%s), running with in-memory CRDT store", e)
    redis_client = None


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "backend-ingress",
        "redis_connected": redis_client is not None,
    }


@app.post("/api/v1/mesh/sync")
async def sync_mesh_update(request: Request):
    """
    Accepts application/octet-stream binary update from mobile edge clients
    or Data Mules, applying pycrdt deterministic merge.
    """
    body = await request.body()
    if not body:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload body cannot be empty",
        )

    try:
        # Apply binary update to pycrdt master doc
        master_doc.apply_update(body)

        # Sync with Redis cache if connected
        if redis_client:
            try:
                redis_client.append("gridcommand:crdt:stream", body)
            except Exception as re:
                logger.error("Failed to append update to Redis: %s", re)

        # Generate updated state vector
        current_state = master_doc.get_update()

        return JSONResponse(
            status_code=status.HTTP_202_ACCEPTED,
            content={
                "status": "merged",
                "bytes_received": len(body),
                "state_vector_bytes": len(current_state),
            },
        )
    except Exception as e:
        logger.error("Failed to merge CRDT update: %s", e)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"CRDT merge failure: {str(e)}",
        )


@app.get("/api/v1/mesh/state")
async def get_master_state():
    """
    Exports full master document binary state for new or recovering nodes.
    """
    state_bytes = master_doc.get_update()
    from fastapi.responses import Response
    return Response(content=state_bytes, media_type="application/octet-stream")
