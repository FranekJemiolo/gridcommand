import pytest
from main import MissionDAG, AntiCheatDetector

def test_dag_creation_and_topology():
    dag = MissionDAG()
    dag.add_objective("bunker_01", "Bunker 1", points=100, status="ACTIVE")
    dag.add_objective("bunker_02", "Bunker 2", points=200, status="LOCKED", prerequisites=["bunker_01"])
    dag.add_objective("radar_hq", "Radar HQ", points=500, status="LOCKED", prerequisites=["bunker_02"])

    assert dag.is_acyclic() is True
    topo = dag.topological_order()
    assert topo == ["bunker_01", "bunker_02", "radar_hq"]

def test_dag_cascading_capture():
    dag = MissionDAG()
    dag.add_objective("bunker_01", "Bunker 1", status="ACTIVE")
    dag.add_objective("bunker_02", "Bunker 2", status="LOCKED", prerequisites=["bunker_01"])

    # Cannot capture locked node
    fail_res = dag.evaluate_capture("bunker_02", "squad_alpha")
    assert fail_res["success"] is False

    # Capture bunker_01
    res = dag.evaluate_capture("bunker_01", "squad_alpha")
    assert res["success"] is True
    assert "bunker_02" in res["unlocked_nodes"]

    # Verify bunker_02 is now ACTIVE
    b2 = dag.get_node("bunker_02")
    assert b2["status"] == "ACTIVE"

def test_anti_cheat_teleportation_detector():
    # Normal human run: 100 meters in 20 seconds = 5 m/s (Pass)
    p1 = {"lat": 52.1245, "lon": 21.2185, "timestamp": 1000.0}
    p2 = {"lat": 52.1254, "lon": 21.2185, "timestamp": 1020.0}
    is_anomaly, speed = AntiCheatDetector.check_teleportation(p1, p2, max_speed_mps=15.0)
    assert is_anomaly is False
    assert speed < 15.0

    # GPS Mock / Teleport: 3000 meters in 2 seconds = 1500 m/s (Fail)
    p3 = {"lat": 52.1500, "lon": 21.2500, "timestamp": 1022.0}
    is_anomaly, speed = AntiCheatDetector.check_teleportation(p2, p3, max_speed_mps=15.0)
    assert is_anomaly is True
    assert speed > 100.0
