/**
 * Graph slice — owns ProjectGraph + ELK positions.
 *
 * Positions are stored here (not in derived functions) because:
 *   1. ELK layout is async; the result is cached here after first compute.
 *   2. The graphSlice is persisted (offline editing), so positions survive
 *      a page refresh without re-running ELK.
 *
 * `upsertArtifact` / `upsertRelation` do an update-or-insert:
 *   — if the id already exists, replace in-place (preserves array order).
 *   — if not, append.
 * `removeArtifact` cascades: also removes any Relation that references
 * the artifact as fromId or toId.
 */

import type { StateCreator } from "zustand";
import type {
  Artifact,
  ArtifactKind,
  PositionMap,
  ProjectGraph,
  Relation,
} from "../types.js";

// ---------------------------------------------------------------------------
// Slice type
// ---------------------------------------------------------------------------

export type GraphSlice = {
  projectGraph: ProjectGraph | null;
  /** ELK layout positions: artifactId → { x, y } */
  positions: PositionMap;

  setProjectGraph(g: ProjectGraph): void;
  setPositions(positions: PositionMap): void;
  upsertArtifact(a: Artifact): void;
  removeArtifact(id: string): void;
  upsertRelation(r: Relation): void;
  removeRelation(id: string): void;
};

// ---------------------------------------------------------------------------
// Slice creator
// ---------------------------------------------------------------------------

export const createGraphSlice: StateCreator<
  GraphSlice,
  [],
  [],
  GraphSlice
> = (set) => ({
  projectGraph: null,
  positions: {},

  setProjectGraph: (g) => set({ projectGraph: g }),

  setPositions: (positions) => set({ positions }),

  upsertArtifact: (artifact) =>
    set((state) => {
      if (!state.projectGraph) return state;
      const exists = state.projectGraph.artifacts.some(
        (a) => a.id === artifact.id
      );
      const artifacts = exists
        ? state.projectGraph.artifacts.map((a) =>
            a.id === artifact.id ? artifact : a
          )
        : [...state.projectGraph.artifacts, artifact];
      return { projectGraph: { ...state.projectGraph, artifacts } };
    }),

  removeArtifact: (id) =>
    set((state) => {
      if (!state.projectGraph) return state;
      // Cascade: remove relations that reference this artifact
      const artifacts = state.projectGraph.artifacts.filter(
        (a) => a.id !== id
      );
      const relations = state.projectGraph.relations.filter(
        (r) => r.fromId !== id && r.toId !== id
      );
      return { projectGraph: { ...state.projectGraph, artifacts, relations } };
    }),

  upsertRelation: (relation) =>
    set((state) => {
      if (!state.projectGraph) return state;
      const exists = state.projectGraph.relations.some(
        (r) => r.id === relation.id
      );
      const relations = exists
        ? state.projectGraph.relations.map((r) =>
            r.id === relation.id ? relation : r
          )
        : [...state.projectGraph.relations, relation];
      return { projectGraph: { ...state.projectGraph, relations } };
    }),

  removeRelation: (id) =>
    set((state) => {
      if (!state.projectGraph) return state;
      const relations = state.projectGraph.relations.filter(
        (r) => r.id !== id
      );
      return { projectGraph: { ...state.projectGraph, relations } };
    }),
});

// ---------------------------------------------------------------------------
// Selectors — pure functions, pass to useStore(selector)
// ---------------------------------------------------------------------------

/**
 * Returns the artifact with the given ID, or undefined.
 * Usage: `useStore(s => selectArtifactById(s, id))`
 */
export function selectArtifactById(
  state: Pick<GraphSlice, "projectGraph">,
  id: string
): Artifact | undefined {
  return state.projectGraph?.artifacts.find((a) => a.id === id);
}

/**
 * Returns all artifacts of the given ArtifactKind.
 * Usage: `useStore(s => selectArtifactsByKind(s, 'SUBSYSTEM'))`
 */
export function selectArtifactsByKind(
  state: Pick<GraphSlice, "projectGraph">,
  kind: ArtifactKind
): Artifact[] {
  return state.projectGraph?.artifacts.filter((a) => a.kind === kind) ?? [];
}

/**
 * Returns all relations where the artifact appears as from or to.
 * Usage: `useStore(s => selectRelationsForArtifact(s, artifactId))`
 */
export function selectRelationsForArtifact(
  state: Pick<GraphSlice, "projectGraph">,
  artifactId: string
): Relation[] {
  return (
    state.projectGraph?.relations.filter(
      (r) => r.fromId === artifactId || r.toId === artifactId
    ) ?? []
  );
}

/**
 * Returns all descendant artifact IDs reachable from rootId via outgoing
 * relations (fromId → toId direction). Uses BFS. Root is not included.
 * Usage: `useStore(s => selectSubtree(s, rootId))`
 */
export function selectSubtree(
  state: Pick<GraphSlice, "projectGraph">,
  rootId: string
): string[] {
  const graph = state.projectGraph;
  if (!graph) return [];

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

  visited.delete(rootId); // root is not a descendant of itself
  return [...visited];
}
