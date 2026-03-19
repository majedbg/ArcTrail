/**
 * GraphCanvas Derived Data
 *
 * Transforms a `ProjectGraph` into the shape needed by GraphCanvas,
 * including ELK layout positions and lookup maps for types.
 *
 * This function is async because it calls ELK for layout.
 * It is otherwise pure in terms of business logic — given the same
 * graph it produces the same result (ELK is deterministic for fixed input).
 *
 * Memoisation strategy: callers should memoize based on:
 *   - graph.artifacts reference equality
 *   - graph.relations reference equality
 *   - activeRelationTypeIds (passed as filter parameter)
 */

import { layoutGraph } from "../elk.js";
import type {
  Artifact,
  ArtifactType,
  GraphViewData,
  ProjectGraph,
  RelationType,
} from "../types.js";

/**
 * Derives the full data shape for the GraphCanvas 2D view.
 *
 * Steps:
 * 1. Build artifactTypeMap from artifact.artifactType relations (embedded via Prisma include)
 * 2. Build relationTypeMap from relation.relationType relations
 * 3. Optionally filter relations to only active relation type IDs
 * 4. Run ELK layout to get positions for all artifacts
 *
 * @param graph                The base project graph (artifacts must include artifactType + stage)
 * @param activeRelationTypeIds If provided, only relations of these types are included in the layout
 */
export async function deriveGraphViewData(
  graph: ProjectGraph,
  activeRelationTypeIds?: string[],
  direction: string = "RIGHT"
): Promise<GraphViewData> {
  // Build type lookup maps from embedded relations on artifacts/relations
  const artifactTypeMap: Record<string, ArtifactType> = {};
  for (const artifact of graph.artifacts) {
    if (artifact.artifactType) {
      artifactTypeMap[artifact.artifactType.id] = artifact.artifactType;
    }
  }

  const relationTypeMap: Record<string, RelationType> = {};
  for (const relation of graph.relations) {
    if (relation.relationType) {
      relationTypeMap[relation.relationType.id] = relation.relationType;
    }
  }

  // Filter relations by active type IDs (if specified)
  const activeRelations =
    activeRelationTypeIds && activeRelationTypeIds.length > 0
      ? graph.relations.filter((r) => activeRelationTypeIds.includes(r.relationTypeId))
      : graph.relations;

  // Compute ELK layout positions for all artifacts
  // Pass full relations for CONCEPT hierarchy building, active relations for edges
  const { positions, containers } = await layoutGraph(
    graph.artifacts,
    activeRelations,
    direction,
    graph.relations
  );

  return {
    artifacts: graph.artifacts,
    relations: activeRelations,
    positions,
    containers,
    artifactTypeMap,
    relationTypeMap,
  };
}

// ---------------------------------------------------------------------------
// Pure selectors (no ELK, suitable for synchronous use)
// ---------------------------------------------------------------------------

/** Returns a single artifact by ID, or undefined. */
export function selectArtifactById(
  artifacts: Artifact[],
  id: string
): Artifact | undefined {
  return artifacts.find((a) => a.id === id);
}

/** Returns all artifacts of a given kind. */
export function selectArtifactsByKind(
  artifacts: Artifact[],
  kind: string
): Artifact[] {
  return artifacts.filter((a) => a.kind === kind);
}

/** Returns all relations where the artifact is either from or to. */
export function selectRelationsForArtifact(
  graph: ProjectGraph,
  artifactId: string
) {
  return graph.relations.filter(
    (r) => r.fromId === artifactId || r.toId === artifactId
  );
}

/**
 * Returns all descendant artifact IDs reachable from rootId via outgoing relations.
 * Uses BFS. Relation direction is: parent (fromId) → child (toId).
 */
export function selectSubtree(
  graph: ProjectGraph,
  rootId: string
): string[] {
  const visited = new Set<string>();
  const queue = [rootId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const children = graph.relations
      .filter((r) => r.fromId === current)
      .map((r) => r.toId);

    queue.push(...children);
  }

  visited.delete(rootId); // don't include root itself
  return [...visited];
}
