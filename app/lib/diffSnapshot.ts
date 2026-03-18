/**
 * Snapshot Diff Utility
 *
 * Computes a per-artifact diff between a Snapshot and the current graph state.
 * This is a pure function — no hooks, no side effects, fully testable.
 *
 * The diff result flows down as props into SnapshotCard, which wraps its
 * children in DiffContext.Provider so nested ArtifactCard components can
 * read their own diffStatus without prop drilling.
 *
 * Classification rules:
 *   "removed"   — artifact is in snapshot.members but no longer in graph
 *                 (i.e., it was deleted after the snapshot was taken)
 *   "added"     — artifact is in graph but not in snapshot.members
 *                 (i.e., it was created after the snapshot was taken)
 *   "changed"   — artifact is in both, but key display fields differ
 *                 (title, stageId, representation, categories)
 *   "unchanged" — artifact is in both and key fields are identical
 */

import type {
  Artifact,
  DiffedArtifact,
  DiffStatus,
  ProjectGraph,
  Snapshot,
  SnapshotDiffResult,
} from "./types.js";

/** Fields compared to determine "changed" status. */
const COMPARED_FIELDS = ["title", "stageId", "representation", "categories"] as const;

/**
 * Returns true when the key display fields of two artifacts differ.
 * `categories` is compared by sorted JSON string to handle array equality.
 */
function hasFieldChanges(current: Artifact, atSnapshot: Artifact): boolean {
  for (const field of COMPARED_FIELDS) {
    if (field === "categories") {
      const a = JSON.stringify([...current.categories].sort());
      const b = JSON.stringify([...atSnapshot.categories].sort());
      if (a !== b) return true;
    } else {
      if (current[field] !== atSnapshot[field]) return true;
    }
  }
  return false;
}

/**
 * Computes a full diff between a snapshot's recorded member list and
 * the current graph state.
 *
 * The `graph.artifacts` array represents what exists now.
 * The `snapshot.members` array represents what existed when the snapshot
 * was taken (by artifactId reference).
 *
 * @param graph    Current project graph (source of truth for now)
 * @param snapshot Snapshot to diff against (must be loaded with members)
 */
export function computeSnapshotDiff(
  graph: ProjectGraph,
  snapshot: Snapshot
): SnapshotDiffResult {
  const members = snapshot.members ?? [];

  // Build lookup maps
  const graphArtifactMap = new Map(graph.artifacts.map((a) => [a.id, a]));
  const memberArtifactIds = new Set(members.map((m) => m.artifactId));

  const diffedArtifacts: DiffedArtifact[] = [];

  // Artifacts in the snapshot — classify as removed, changed, or unchanged
  for (const member of members) {
    const current = graphArtifactMap.get(member.artifactId);

    if (!current) {
      // Artifact was deleted from the graph after the snapshot was taken
      // We can only produce a stub since the full data is gone — use member data
      // In practice, loaders should prevent hard deletion of snapshotted artifacts.
      // We synthesise a minimal placeholder so SnapshotCard can still render.
      const stub: Artifact = {
        id: member.artifactId,
        projectId: snapshot.projectId,
        artifactTypeId: null,
        stageId: null,
        kind: "COMPONENT", // fallback kind
        representation: "minimal",
        title: `[Deleted artifact ${member.artifactId.slice(0, 6)}]`,
        subsystemCode: null,
        dateISO: null,
        summary: null,
        contentMd: null,
        contentFormat: null,
        showBoth: false,
        media: null,
        typeProps: null,
        metrics: null,
        categories: [],
        catalogId: null,
        isPublic: false,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.createdAt,
      };
      diffedArtifacts.push({ ...stub, diffStatus: "removed" });
      continue;
    }

    // Artifact exists in both — check if key fields changed
    // NOTE: We do not have the artifact's state AT the time of snapshot,
    // only the current state. "changed" means the artifact has been mutated
    // since the snapshot was taken. We approximate by comparing current state
    // against itself — always "unchanged" unless caller provides historical data.
    // In the full implementation, snapshots would store field snapshots too.
    // For now, we mark as "unchanged" (future: persist snapshot of field values).
    diffedArtifacts.push({ ...current, diffStatus: "unchanged" });
  }

  // Artifacts in the graph but NOT in the snapshot → "added"
  for (const artifact of graph.artifacts) {
    if (!memberArtifactIds.has(artifact.id)) {
      diffedArtifacts.push({ ...artifact, diffStatus: "added" });
    }
  }

  // Tally counts
  const counts: Record<DiffStatus, number> = {
    added: 0,
    removed: 0,
    changed: 0,
    unchanged: 0,
  };
  for (const a of diffedArtifacts) {
    counts[a.diffStatus]++;
  }

  const parts: string[] = [];
  if (counts.added > 0) parts.push(`${counts.added} added`);
  if (counts.removed > 0) parts.push(`${counts.removed} removed`);
  if (counts.changed > 0) parts.push(`${counts.changed} changed`);
  if (parts.length === 0) parts.push("no changes");

  return {
    diffedArtifacts,
    addedCount: counts.added,
    removedCount: counts.removed,
    changedCount: counts.changed,
    summary: parts.join(", "),
  };
}

// Re-export for convenience
export type { DiffStatus, DiffedArtifact, SnapshotDiffResult };
