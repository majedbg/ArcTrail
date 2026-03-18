/**
 * PrototypeView Derived Data
 *
 * Transforms a `ProjectGraph` + snapshots into the shape needed by
 * PrototypeView (horizontal git-graph of snapshot cards).
 *
 * This function is async because it calls ELK for layout.
 * It is otherwise pure in terms of business logic.
 */

import { layoutPrototypeView } from "../elk.js";
import type {
  Artifact,
  ProjectGraph,
  PrototypeViewData,
  Snapshot,
  SnapshotRelation,
} from "../types.js";

/**
 * Derives the full data shape for the PrototypeView.
 *
 * Steps:
 * 1. Filter snapshots belonging to the specified prototype artifact
 * 2. Build memberMap: snapshotId → array of Artifact objects for that snapshot
 * 3. Run ELK layout (direction=RIGHT) to position snapshot cards
 *
 * @param graph                The base project graph (artifacts list)
 * @param snapshots            Snapshots loaded with `include: { members: true }`
 * @param snapshotRelations    SnapshotRelation edges between snapshots
 * @param prototypeArtifactId  The PROTOTYPE artifact whose snapshots to show
 */
export async function derivePrototypeViewData(
  graph: ProjectGraph,
  snapshots: Snapshot[],
  snapshotRelations: SnapshotRelation[],
  prototypeArtifactId: string
): Promise<PrototypeViewData> {
  // Filter to snapshots belonging to this prototype
  const protoSnapshots = snapshots.filter(
    (s) => s.prototypeArtifactId === prototypeArtifactId
  );

  const protoSnapshotIds = new Set(protoSnapshots.map((s) => s.id));

  // Filter relations to only those between this prototype's snapshots
  const protoRelations = snapshotRelations.filter(
    (r) =>
      protoSnapshotIds.has(r.fromSnapshotId) &&
      protoSnapshotIds.has(r.toSnapshotId)
  );

  // Build artifact lookup for member resolution
  const artifactMap = new Map<string, Artifact>(
    graph.artifacts.map((a) => [a.id, a])
  );

  // Build memberMap: snapshotId → Artifact[]
  const memberMap: Record<string, Artifact[]> = {};
  for (const snapshot of protoSnapshots) {
    const members = (snapshot.members ?? [])
      .map((m) => artifactMap.get(m.artifactId))
      .filter((a): a is Artifact => a !== undefined);
    memberMap[snapshot.id] = members;
  }

  // Compute ELK layout for snapshot cards
  const positions = await layoutPrototypeView(protoSnapshots, protoRelations);

  return {
    snapshots: protoSnapshots,
    relations: protoRelations,
    positions,
    memberMap,
  };
}
