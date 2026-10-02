"""
GridCommand DAG Rule Engine & Anti-Cheat Validation Service
Models simulation state as a Directed Acyclic Graph (DAG) with NetworkX
and validates telemetry against speed/azimuth heuristics.
"""

import math
from typing import Dict, List, Optional, Tuple, Any
import networkx as nx


class MissionDAG:
    """
    Manages tactical mission dependency graphs using NetworkX.
    Nodes represent tactical objectives; edges represent prerequisite flows.
    """

    def __init__(self):
        self.graph = nx.DiGraph()

    def add_objective(
        self,
        node_id: str,
        name: str,
        points: int = 100,
        status: str = "LOCKED",
        prerequisites: Optional[List[str]] = None,
    ):
        self.graph.add_node(
            node_id,
            name=name,
            points=points,
            status=status,
            owner=None,
            prerequisites=prerequisites or [],
        )
        if prerequisites:
            for prereq in prerequisites:
                self.graph.add_edge(prereq, node_id)

    def get_node(self, node_id: str) -> Optional[Dict[str, Any]]:
        if node_id in self.graph:
            return self.graph.nodes[node_id]
        return None

    def evaluate_capture(
        self, node_id: str, squad_id: str, proof: str = ""
    ) -> Dict[str, Any]:
        """
        Validates capture and evaluates cascading unlocks across the DAG.
        """
        if node_id not in self.graph:
            return {"success": False, "reason": f"Node {node_id} does not exist"}

        node = self.graph.nodes[node_id]
        if node["status"] != "ACTIVE":
            return {
                "success": False,
                "reason": f"Node {node_id} is in status {node['status']}, must be ACTIVE to capture",
            }

        # Mark objective as RESOLVED
        node["status"] = "RESOLVED"
        node["owner"] = squad_id

        # Evaluate downstream successors for cascading unlocks
        unlocked_nodes = []
        for successor in self.graph.successors(node_id):
            succ_node = self.graph.nodes[successor]
            if succ_node["status"] == "LOCKED":
                # Check if all predecessor prerequisites are RESOLVED by this squad
                predecessors = list(self.graph.predecessors(successor))
                all_met = all(
                    self.graph.nodes[p]["status"] == "RESOLVED"
                    and self.graph.nodes[p]["owner"] == squad_id
                    for p in predecessors
                )
                if all_met:
                    succ_node["status"] = "ACTIVE"
                    unlocked_nodes.append(successor)

        return {
            "success": True,
            "captured_node": node_id,
            "owner": squad_id,
            "unlocked_nodes": unlocked_nodes,
        }

    def is_acyclic(self) -> bool:
        return nx.is_directed_acyclic_graph(self.graph)

    def topological_order(self) -> List[str]:
        return list(nx.topological_sort(self.graph))


class AntiCheatDetector:
    """
    Validates operator movement heuristics to detect GPS mocking and spoofing.
    """

    @staticmethod
    def haversine_distance_meters(
        lat1: float, lon1: float, lat2: float, lon2: float
    ) -> float:
        """Calculates Great Circle distance between two coordinates in meters."""
        r = 6371000.0  # Earth radius in meters
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return r * c

    @classmethod
    def check_teleportation(
        cls,
        p1: Dict[str, Any],
        p2: Dict[str, Any],
        max_speed_mps: float = 15.0,  # 15 m/s (~54 km/h) max on-foot sprint
    ) -> Tuple[bool, float]:
        """
        Returns (is_anomaly, speed_mps).
        p1 and p2 must contain 'lat', 'lon', and 'timestamp' (epoch seconds).
        """
        dt = abs(p2["timestamp"] - p1["timestamp"])
        if dt <= 0:
            return (True, float("inf"))

        distance = cls.haversine_distance_meters(
            p1["lat"], p1["lon"], p2["lat"], p2["lon"]
        )
        speed = distance / dt

        is_anomaly = speed > max_speed_mps
        return (is_anomaly, speed)
