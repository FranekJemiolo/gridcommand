import { MissionGraph, MissionNode, CaptureMechanism } from './types';

export interface DAGValidationResult {
  valid: boolean;
  errors: string[];
  rootNodes: string[];
  topologicalOrder: string[];
}

/**
 * Validates that a MissionGraph forms a valid Directed Acyclic Graph (DAG):
 * 1. Contains no circular dependencies (cycles).
 * 2. All referenced prerequisites exist in the graph.
 * 3. Contains at least one root node (prerequisites.length === 0).
 */
export function validateMissionDAG(graph: MissionGraph): DAGValidationResult {
  const nodeIds = Object.keys(graph.nodes);
  const errors: string[] = [];

  if (nodeIds.length === 0) {
    return {
      valid: false,
      errors: ['Mission graph contains no objectives.'],
      rootNodes: [],
      topologicalOrder: [],
    };
  }

  // Check 1: Verify all prerequisite node IDs exist
  for (const [id, node] of Object.entries(graph.nodes)) {
    for (const prereqId of node.prerequisites) {
      if (!graph.nodes[prereqId]) {
        errors.push(`Objective "${node.name}" (${id}) references non-existent prerequisite "${prereqId}".`);
      }
      if (prereqId === id) {
        errors.push(`Objective "${node.name}" (${id}) cannot depend on itself.`);
      }
    }
  }

  // Find root nodes (no prerequisites)
  const rootNodes = nodeIds.filter((id) => (graph.nodes[id]?.prerequisites || []).length === 0);
  if (rootNodes.length === 0) {
    errors.push('Circular dependency detected: mission graph has no entry point (root objective with zero prerequisites).');
  }

  // Check 2: Cycle detection via Kahn's algorithm (Topological Sort)
  const inDegree: Record<string, number> = {};
  const adjacencyList: Record<string, string[]> = {};

  for (const id of nodeIds) {
    inDegree[id] = 0;
    adjacencyList[id] = [];
  }

  for (const [id, node] of Object.entries(graph.nodes)) {
    for (const prereqId of node.prerequisites) {
      if (adjacencyList[prereqId]) {
        adjacencyList[prereqId].push(id);
        inDegree[id] = (inDegree[id] || 0) + 1;
      }
    }
  }

  const queue: string[] = [...rootNodes];
  const topologicalOrder: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    topologicalOrder.push(current);

    for (const neighbor of adjacencyList[current] || []) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (topologicalOrder.length < nodeIds.length) {
    const unvisited = nodeIds.filter((id) => !topologicalOrder.includes(id));
    errors.push(`Circular dependency detected involving objectives: ${unvisited.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    rootNodes,
    topologicalOrder: errors.length === 0 ? topologicalOrder : [],
  };
}

/**
 * Creates or updates an objective node in the mission graph.
 */
export function setMissionObjective(graph: MissionGraph, node: MissionNode): MissionGraph {
  const nextNodes = { ...graph.nodes, [node.id]: { ...node } };
  return { nodes: nextNodes };
}

/**
 * Removes an objective node from the mission graph and cleans up any references in child prerequisites.
 */
export function removeMissionObjective(graph: MissionGraph, nodeId: string): MissionGraph {
  const nextNodes: Record<string, MissionNode> = {};

  for (const [id, node] of Object.entries(graph.nodes)) {
    if (id === nodeId) continue;
    nextNodes[id] = {
      ...node,
      prerequisites: node.prerequisites.filter((p) => p !== nodeId),
    };
  }

  return { nodes: nextNodes };
}

/**
 * Adds a prerequisite dependency: parentId must be captured before childId can unlock.
 * Validates that this dependency does not introduce a cycle.
 */
export function addDependency(
  graph: MissionGraph,
  parentId: string,
  childId: string
): { success: boolean; error?: string; graph: MissionGraph } {
  if (parentId === childId) {
    return { success: false, error: 'Cannot link objective to itself.', graph };
  }

  if (!graph.nodes[parentId] || !graph.nodes[childId]) {
    return { success: false, error: 'One or both objectives do not exist.', graph };
  }

  const child = graph.nodes[childId];
  if (child.prerequisites.includes(parentId)) {
    return { success: true, graph }; // Already exists
  }

  const updatedChild: MissionNode = {
    ...child,
    prerequisites: [...child.prerequisites, parentId],
  };

  const candidateGraph: MissionGraph = {
    nodes: {
      ...graph.nodes,
      [childId]: updatedChild,
    },
  };

  const validation = validateMissionDAG(candidateGraph);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors[0] || 'Adding dependency creates a cycle.',
      graph,
    };
  }

  return { success: true, graph: candidateGraph };
}

/**
 * Removes a prerequisite dependency between parentId and childId.
 */
export function removeDependency(graph: MissionGraph, parentId: string, childId: string): MissionGraph {
  if (!graph.nodes[childId]) return graph;

  const child = graph.nodes[childId];
  return {
    nodes: {
      ...graph.nodes,
      [childId]: {
        ...child,
        prerequisites: child.prerequisites.filter((p) => p !== parentId),
      },
    },
  };
}

/**
 * Checks whether an operator's GPS coordinate is within the geofence radius of an objective.
 */
export function isPointInGeofence(
  opLat: number,
  opLon: number,
  objLat: number,
  objLon: number,
  radiusMeters = 50
): { inGeofence: boolean; distanceMeters: number } {
  const R = 6371000; // Earth radius in meters
  const dLat = ((objLat - opLat) * Math.PI) / 180;
  const dLon = ((objLon - opLon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((opLat * Math.PI) / 180) *
      Math.cos((objLat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMeters = Math.round(R * c * 10) / 10;

  return {
    inGeofence: distanceMeters <= radiusMeters,
    distanceMeters,
  };
}
