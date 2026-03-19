/**
 * ELK Layout Helpers
 *
 * Wraps elkjs to compute 2D positions for artifacts and snapshots.
 * Called by derived view functions — results are stored in Zustand's
 * graphSlice.positions and snapshotSlice positions map.
 *
 * Layout configurations:
 *   GraphCanvas:    algorithm=layered, configurable direction
 *                   CONCEPT artifacts become compound nodes containing descendants
 *   PrototypeView:  algorithm=layered, direction=RIGHT (git-graph style,
 *                   oldest snapshot on left, newest on right)
 */

import ELK from "elkjs";
import type { ElkNode } from "elkjs";
import type { Artifact, Relation, Snapshot, SnapshotRelation, PositionMap, SnapshotPositionMap } from "./types.js";

// ---------------------------------------------------------------------------
// Node size constants (from spec §8, §11)
// ---------------------------------------------------------------------------

/** Width of artifact cards by representation for ELK layout sizing. */
const ARTIFACT_WIDTH: Record<string, number> = {
  rich: 280,
  medium: 200,
  minimal: 48,
};

/** Height of artifact cards by representation. */
const ARTIFACT_HEIGHT: Record<string, number> = {
  rich: 120,
  medium: 80,
  minimal: 48,
};

/** Snapshot card dimensions for PrototypeView. */
const SNAPSHOT_WIDTH = 320;
const SNAPSHOT_HEIGHT = 200;

function getNodeWidth(representation: string): number {
  return ARTIFACT_WIDTH[representation] ?? ARTIFACT_WIDTH.medium;
}

function getNodeHeight(representation: string): number {
  return ARTIFACT_HEIGHT[representation] ?? ARTIFACT_HEIGHT.medium;
}

/**
 * Returns ELK node dimensions for an artifact, accounting for media.
 * Rich cards with media are taller (288px MediaThumb + ~92px chrome).
 */
export function getGraphNodeDimensions(artifact: Artifact): { width: number; height: number } {
  const width = getNodeWidth(artifact.representation);
  let height = getNodeHeight(artifact.representation);

  // Rich cards with media need more height for the MediaThumb
  if (artifact.representation === "rich" && artifact.media && artifact.media.length > 0) {
    height = 380; // 288px MediaThumb + ~92px header/badges
  }

  return { width, height };
}

// ---------------------------------------------------------------------------
// Layout result type
// ---------------------------------------------------------------------------

/** Container info for CONCEPT compound nodes. */
export type ContainerInfo = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Result of layoutGraph — positions for all artifacts + container info for CONCEPTs. */
export type LayoutResult = {
  positions: PositionMap;
  containers: Record<string, ContainerInfo>;
};

// ---------------------------------------------------------------------------
// layoutGraph — for GraphCanvas
// ---------------------------------------------------------------------------

/**
 * Computes 2D layout positions for a set of artifacts and their relations
 * using the ELK layered algorithm. CONCEPT artifacts become ELK compound
 * nodes that contain all their descendants.
 *
 * @param artifacts       All artifacts to layout
 * @param relations       Active relations (used as ELK edges)
 * @param direction       ELK direction: UP, DOWN, LEFT, RIGHT
 * @param allRelations    Full relation set (used to build CONCEPT hierarchy)
 * @returns Absolute positions for all artifacts + container dimensions for CONCEPTs
 */
export async function layoutGraph(
  artifacts: Artifact[],
  relations: Relation[],
  direction: string = "RIGHT",
  allRelations?: Relation[]
): Promise<LayoutResult> {
  if (artifacts.length === 0) return { positions: {}, containers: {} };

  const elk = new ELK();
  const isHorizontal = direction === "LEFT" || direction === "RIGHT";
  const layerSpacing = isHorizontal ? "120" : "100";

  const hierarchyRelations = allRelations ?? relations;
  const artMap = new Map(artifacts.map((a) => [a.id, a]));

  // Build parent→children adjacency from all relations
  const childrenOf: Record<string, string[]> = {};
  for (const r of hierarchyRelations) {
    (childrenOf[r.fromId] ??= []).push(r.toId);
  }

  // Identify CONCEPT artifacts and collect their descendants via BFS
  const conceptIds = new Set(
    artifacts.filter((a) => a.kind === "CONCEPT").map((a) => a.id)
  );

  function collectDescendants(rootId: string): Set<string> {
    const desc = new Set<string>();
    const queue = [...(childrenOf[rootId] || [])];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (desc.has(id) || !artMap.has(id)) continue;
      desc.add(id);
      queue.push(...(childrenOf[id] || []));
    }
    return desc;
  }

  const conceptDescMap: Record<string, Set<string>> = {};
  for (const cid of conceptIds) {
    conceptDescMap[cid] = collectDescendants(cid);
  }

  // All artifact IDs that are nested inside some CONCEPT
  const nestedIds = new Set<string>();
  for (const descs of Object.values(conceptDescMap)) {
    for (const id of descs) nestedIds.add(id);
  }

  // If no CONCEPT artifacts, fall back to flat layout
  if (conceptIds.size === 0) {
    return flatLayout(elk, artifacts, relations, direction, layerSpacing);
  }

  // -----------------------------------------------------------------------
  // Build hierarchical ELK graph
  // -----------------------------------------------------------------------

  const sharedLayoutOpts = {
    "elk.algorithm": "layered",
    "elk.direction": direction,
    "spacing.nodeNode": "40",
    "elk.layered.spacing.nodeNodeBetweenLayers": layerSpacing,
  };

  const topLevelChildren: ElkNode[] = [];

  // CONCEPT compound nodes
  for (const cid of conceptIds) {
    const descs = conceptDescMap[cid];
    const innerArtifacts = [...descs]
      .map((id) => artMap.get(id)!)
      .filter(Boolean);

    // Internal edges: both endpoints are descendants of this CONCEPT
    const innerEdges = relations
      .filter((r) => descs.has(r.fromId) && descs.has(r.toId))
      .map((r) => ({ id: r.id, sources: [r.fromId], targets: [r.toId] }));

    topLevelChildren.push({
      id: cid,
      layoutOptions: {
        ...sharedLayoutOpts,
        "elk.padding": "[top=72,left=24,bottom=24,right=24]",
      },
      children: innerArtifacts.map((a) => {
        const dims = getGraphNodeDimensions(a);
        return { id: a.id, width: dims.width, height: dims.height };
      }),
      edges: innerEdges,
    });
  }

  // Non-concept, non-nested artifacts as regular top-level nodes
  for (const a of artifacts) {
    if (conceptIds.has(a.id) || nestedIds.has(a.id)) continue;
    const dims = getGraphNodeDimensions(a);
    topLevelChildren.push({ id: a.id, width: dims.width, height: dims.height });
  }

  // Top-level edges: exclude internal edges and CONCEPT→descendant edges
  const topLevelEdges = relations
    .filter((r) => {
      // Skip if both are descendants of the same CONCEPT
      for (const [, descs] of Object.entries(conceptDescMap)) {
        if (descs.has(r.fromId) && descs.has(r.toId)) return false;
      }
      // Skip CONCEPT→own-descendant (containment replaces the line)
      if (conceptIds.has(r.fromId) && conceptDescMap[r.fromId]?.has(r.toId))
        return false;
      return true;
    })
    .map((r) => ({ id: r.id, sources: [r.fromId], targets: [r.toId] }));

  const graph: ElkNode = {
    id: "root",
    layoutOptions: sharedLayoutOpts,
    children: topLevelChildren,
    edges: topLevelEdges,
  };

  const result = await elk.layout(graph);

  // -----------------------------------------------------------------------
  // Extract absolute positions + container dimensions
  // -----------------------------------------------------------------------

  const positions: PositionMap = {};
  const containers: Record<string, ContainerInfo> = {};

  for (const node of result.children ?? []) {
    const absX = node.x ?? 0;
    const absY = node.y ?? 0;

    if (conceptIds.has(node.id)) {
      containers[node.id] = {
        x: absX,
        y: absY,
        width: node.width ?? 0,
        height: node.height ?? 0,
      };
      positions[node.id] = { x: absX, y: absY };

      // Children have positions relative to the compound node
      for (const child of node.children ?? []) {
        positions[child.id] = {
          x: absX + (child.x ?? 0),
          y: absY + (child.y ?? 0),
        };
      }
    } else {
      positions[node.id] = { x: absX, y: absY };
    }
  }

  return { positions, containers };
}

// ---------------------------------------------------------------------------
// Flat layout fallback (no CONCEPT nodes)
// ---------------------------------------------------------------------------

async function flatLayout(
  elk: InstanceType<typeof ELK>,
  artifacts: Artifact[],
  relations: Relation[],
  direction: string,
  layerSpacing: string
): Promise<LayoutResult> {
  const graph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": direction,
      "spacing.nodeNode": "40",
      "elk.layered.spacing.nodeNodeBetweenLayers": layerSpacing,
    },
    children: artifacts.map((a) => {
      const dims = getGraphNodeDimensions(a);
      return { id: a.id, width: dims.width, height: dims.height };
    }),
    edges: relations.map((r) => ({
      id: r.id,
      sources: [r.fromId],
      targets: [r.toId],
    })),
  };

  const result = await elk.layout(graph);

  const positions: PositionMap = {};
  for (const node of result.children ?? []) {
    positions[node.id] = { x: node.x ?? 0, y: node.y ?? 0 };
  }

  return { positions, containers: {} };
}

// ---------------------------------------------------------------------------
// layoutPrototypeView — for PrototypeView (git-graph)
// ---------------------------------------------------------------------------

/**
 * Computes 2D layout positions for snapshot cards in the PrototypeView.
 * Uses the ELK layered algorithm with a rightward direction to produce
 * a horizontal git-graph timeline (oldest on left, newest on right).
 *
 * @returns Map of snapshotId → { x, y } top-left position
 */
export async function layoutPrototypeView(
  snapshots: Snapshot[],
  relations: SnapshotRelation[]
): Promise<SnapshotPositionMap> {
  if (snapshots.length === 0) return {};

  const elk = new ELK();

  const graph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "spacing.nodeNode": "40",
      "elk.layered.spacing.nodeNodeBetweenLayers": "120",
    },
    children: snapshots.map((s) => ({
      id: s.id,
      width: SNAPSHOT_WIDTH,
      height: SNAPSHOT_HEIGHT,
    })),
    edges: relations.map((r) => ({
      id: r.id,
      sources: [r.fromSnapshotId],
      targets: [r.toSnapshotId],
    })),
  };

  const result = await elk.layout(graph);

  const positions: SnapshotPositionMap = {};
  for (const node of result.children ?? []) {
    positions[node.id] = {
      x: node.x ?? 0,
      y: node.y ?? 0,
    };
  }

  return positions;
}
