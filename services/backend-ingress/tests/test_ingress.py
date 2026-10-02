import pytest
from fastapi.testclient import TestClient
import pycrdt
from main import app, master_doc

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "backend-ingress"

def test_mesh_sync_endpoint_with_valid_crdt_update():
    # Create client-side doc and generate an update
    client_doc = pycrdt.Doc()
    client_map = client_doc.get("mission_events", type=pycrdt.Map)
    
    with client_doc.transaction():
        client_map["2026-10-02T14:15:00.000Z-0000-devAlpha"] = {
            "t": "CAPT",
            "sq": "squad_alpha",
            "opr": "alpha_pointman",
            "dat": {"o": "bunker_01", "prf": "SIG_ED25519_VALID"},
        }
    
    update_bytes = client_doc.get_update()
    assert len(update_bytes) > 0

    response = client.post(
        "/api/v1/mesh/sync",
        content=update_bytes,
        headers={"Content-Type": "application/octet-stream"},
    )

    assert response.status_code == 202
    data = response.json()
    assert data["status"] == "merged"
    assert data["bytes_received"] == len(update_bytes)

def test_mesh_sync_empty_payload_fails():
    response = client.post(
        "/api/v1/mesh/sync",
        content=b"",
        headers={"Content-Type": "application/octet-stream"},
    )
    assert response.status_code == 400

def test_get_master_state():
    response = client.get("/api/v1/mesh/state")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/octet-stream"
    assert len(response.content) > 0
