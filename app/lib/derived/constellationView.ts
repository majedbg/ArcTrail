/**
 * ConstellationView Derived Data
 *
 * Transforms a `ProjectGraph` into the shape needed by the 3D R3F
 * ConstellationView. This function is SYNCHRONOUS and fully pure —
 * it computes its own radial layout without calling ELK.
 *
 * Layout scheme (concentric rings in the XZ plane, Y=0):
 *   CONCEPT                        → center (0, 0, 0)
 *   PROTOTYPE                      → ring r = 4
 *   SUBSYSTEM                      → ring r = 7
 *   FEATURE / VARIATION / COMPONENT → ring r = 10
 *
 * Multiple artifacts on the same ring are distributed evenly by angle:
 *   angle_i = (2π * i) / count
 *   x = r * cos(angle_i)
 *   z = r * sin(angle_i)
 *   y = 0  (horizontal plane)
 *
 * Sphere radii (from spec §12):
 *   rich (CONCEPT / PROTOTYPE)  → 0.4
 *   medium (SUBSYSTEM / FEATURE) → 0.28
 *   minimal (VARIATION / COMPONENT) → 0.16
 */

import { ARTIFACT_KIND_TOKENS } from "../tokens.js";
import type {
  Artifact,
  ArtifactKind,
  ConstellationData,
  ConstellationEdge,
  ConstellationNode,
  ProjectGraph,
  RelationType,
} from "../types.js";

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

/** Radial distance from center for each artifact kind group. */
const RING_RADIUS: Record<ArtifactKind, number> = {
  CONCEPT: 0,
  PROTOTYPE: 4,
  SUBSYSTEM: 7,
  FEATURE: 10,
  VARIATION: 10,
  COMPONENT: 10,
};

/** Sphere radius based on artifact representation / kind. */
const SPHERE_RADIUS: Record<ArtifactKind, number> = {
  CONCEPT: 0.4,
  PROTOTYPE: 0.4,
  SUBSYSTEM: 0.28,
  FEATURE: 0.28,
  VARIATION: 0.16,
  COMPONENT: 0.16,
};

// ---------------------------------------------------------------------------
// Position computation
// ---------------------------------------------------------------------------

/** Groups artifacts by their ArtifactKind. */
function groupByKind(artifacts: Artifact[]): Map<ArtifactKind, Artifact[]> {
  const groups = new Map<ArtifactKind, Artifact[]>();
  for (const a of artifacts) {
    const kind = a.kind as ArtifactKind;
    if (!groups.has(kind)) groups.set(kind, []);
    groups.get(kind)!.push(a);
  }
  return groups;
}

/**
 * Computes radial positions for a group of artifacts on a ring.
 *
 * Distributes `count` nodes evenly around the ring radius `r` in the XZ plane.
 * A small Y-offset is applied per ring to visually separate clusters when
 * viewed from an angle.
 */
function computeRingPositions(
  artifacts: Artifact[],
  r: number
): Map<string, { x: number; y: number; z: number }> {
  const positions = new Map<string, { x: number; y: number; z: number }>();
  const count = artifacts.length;

  for (let i = 0; i < count; i++) {
    const angle = count === 1 ? 0 : (2 * Math.PI * i) / count;
    positions.set(artifacts[i].id, {
      x: r === 0 ? 0 : r * Math.cos(angle),
      y: 0,
      z: r === 0 ? 0 : r * Math.sin(angle),
    });
  }

  return positions;
}

// ---------------------------------------------------------------------------
// deriveConstellationData
// ---------------------------------------------------------------------------

/**
 * Derives the full data shape for the ConstellationView (3D R3F scene).
 *
 * Pure function — no ELK, no side effects. Positions are computed
 * analytically using concentric ring geometry.
 *
 * Color resolution order:
 *   1. artifact.artifactType.color (populated via Prisma include)
 *   2. ARTIFACT_KIND_TOKENS[kind].color (from tokens.ts)
 *
 * @param graph The base project graph
 * @param relationTypeMap Optional pre-built map of relationTypeId → RelationType
 */
export function deriveConstellationData(
  graph: ProjectGraph,
  relationTypeMap?: Record<string, RelationType>
): ConstellationData {
  // Group artifacts by kind to compute ring positions
  const groups = groupByKind(graph.artifacts);

  // Compute all ring positions
  const positionMap = new Map<string, { x: number; y: number; z: number }>();
  for (const [kind, artifacts] of groups) {
    const r = RING_RADIUS[kind] ?? 10;
    const positions = computeRingPositions(artifacts, r);
    for (const [id, pos] of positions) {
      positionMap.set(id, pos);
    }
  }

  // Build nodes
  const nodes: ConstellationNode[] = graph.artifacts.map((artifact) => {
    const kind = artifact.kind as ArtifactKind;
    const position = positionMap.get(artifact.id) ?? { x: 0, y: 0, z: 0 };
    const radius = SPHERE_RADIUS[kind] ?? 0.28;
    // Color: prefer embedded artifactType, fall back to kind token
    const color =
      artifact.artifactType?.color ?? ARTIFACT_KIND_TOKENS[kind]?.color ?? "#888888";

    return { artifact, position, radius, color };
  });

  // Build edges
  const rtMap = relationTypeMap ?? {};
  // Also build from embedded relation data
  const inferredRtMap: Record<string, RelationType> = { ...rtMap };
  for (const relation of graph.relations) {
    if (relation.relationType && !inferredRtMap[relation.relationTypeId]) {
      inferredRtMap[relation.relationTypeId] = relation.relationType;
    }
  }

  const edges: ConstellationEdge[] = graph.relations
    .map((relation) => {
      const fromPos = positionMap.get(relation.fromId);
      const toPos = positionMap.get(relation.toId);
      const relationType = inferredRtMap[relation.relationTypeId];

      if (!fromPos || !toPos || !relationType) return null;

      return {
        from: fromPos,
        to: toPos,
        relationType,
      } satisfies ConstellationEdge;
    })
    .filter((e): e is ConstellationEdge => e !== null);

  return { nodes, edges };
}
