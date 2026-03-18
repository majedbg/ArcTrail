/**
 * ELK Layout Helpers
 *
 * Wraps elkjs to compute 2D positions for artifacts and snapshots.
 * Called by derived view functions — results are stored in Zustand's
 * graphSlice.positions and snapshotSlice positions map.
 *
 * Layout configurations:
 *   GraphCanvas:    algorithm=layered, direction=UP (root at bottom,
 *                   branches grow upward — matches ArcTrail's ancestry metaphor)
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

// ---------------------------------------------------------------------------
// layoutGraph — for GraphCanvas
// ---------------------------------------------------------------------------

/**
 * Computes 2D layout positions for a set of artifacts and their relations
 * using the ELK layered algorithm with an upward direction
 * (root artifact at the bottom, child artifacts grow upward).
 *
 * ELK options:
 *   direction=UP          — root at bottom, tree grows up
 *   spacing.nodeNode=40   — horizontal spacing between sibling nodes
 *   elk.layered.spacing.nodeNodeBetweenLayers=80 — vertical spacing between layers
 *
 * @returns Map of artifactId → { x, y } top-left position
 */
export async function layoutGraph(
  artifacts: Artifact[],
  relations: Relation[]
): Promise<PositionMap> {
  if (artifacts.length === 0) return {};

  const elk = new ELK();

  const graph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "UP",
      "spacing.nodeNode": "40",
      "elk.layered.spacing.nodeNodeBetweenLayers": "80",
    },
    children: artifacts.map((a) => ({
      id: a.id,
      width: getNodeWidth(a.representation),
      height: getNodeHeight(a.representation),
    })),
    edges: relations.map((r) => ({
      id: r.id,
      sources: [r.fromId],
      targets: [r.toId],
    })),
  };

  const result = await elk.layout(graph);

  const positions: PositionMap = {};
  for (const node of result.children ?? []) {
    positions[node.id] = {
      x: node.x ?? 0,
      y: node.y ?? 0,
    };
  }

  return positions;
}

// ---------------------------------------------------------------------------
// layoutPrototypeView — for PrototypeView (git-graph)
// ---------------------------------------------------------------------------

/**
 * Computes 2D layout positions for snapshot cards in the PrototypeView.
 * Uses the ELK layered algorithm with a rightward direction to produce
 * a horizontal git-graph timeline (oldest on left, newest on right).
 *
 * ELK options:
 *   direction=RIGHT       — left-to-right timeline
 *   spacing.nodeNode=40   — vertical spacing between parallel branches
 *   elk.layered.spacing.nodeNodeBetweenLayers=120 — horizontal spacing between versions
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
