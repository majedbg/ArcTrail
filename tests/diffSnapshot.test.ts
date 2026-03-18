import { describe, it, expect } from "vitest";
import { computeSnapshotDiff } from "../app/lib/diffSnapshot";
import type { Artifact, ProjectGraph, Snapshot, SnapshotMember } from "../app/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeArtifact(id: string, overrides: Partial<Artifact> = {}): Artifact {
  return {
    id,
    projectId: "proj-1",
    artifactTypeId: null,
    stageId: null,
    kind: "FEATURE",
    representation: "medium",
    title: `Artifact ${id}`,
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
    isPublic: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function makeGraph(artifacts: Artifact[]): ProjectGraph {
  return {
    project: {
      id: "proj-1",
      slug: "test",
      title: "Test",
      summary: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    artifacts,
    relations: [],
    snapshots: [],
  };
}

function makeSnapshot(artifactIds: string[]): Snapshot {
  const members: SnapshotMember[] = artifactIds.map((aid) => ({
    id: `sm-${aid}`,
    snapshotId: "snap-1",
    artifactId: aid,
    role: null,
    notes: null,
  }));
  return {
    id: "snap-1",
    projectId: "proj-1",
    prototypeArtifactId: "proto-1",
    versionString: "AI.RCA1",
    displayLabel: null,
    dateISO: "2026-01-01",
    notes: null,
    createdAt: new Date("2026-01-01"),
    members,
  };
}

// ---------------------------------------------------------------------------
// Tests — all four DiffStatus cases
// ---------------------------------------------------------------------------

describe("computeSnapshotDiff", () => {
  it('marks artifact as "added" when it is in the graph but not in the snapshot', () => {
    const newArtifact = makeArtifact("new-a");
    const existingArtifact = makeArtifact("existing-a");

    const graph = makeGraph([existingArtifact, newArtifact]);
    const snapshot = makeSnapshot(["existing-a"]); // new-a not in snapshot

    const result = computeSnapshotDiff(graph, snapshot);

    const newEntry = result.diffedArtifacts.find((a) => a.id === "new-a");
    expect(newEntry).toBeDefined();
    expect(newEntry?.diffStatus).toBe("added");
    expect(result.addedCount).toBe(1);
  });

  it('marks artifact as "removed" when it is in the snapshot but not in the graph', () => {
    const existingArtifact = makeArtifact("existing-a");

    const graph = makeGraph([existingArtifact]); // deleted-a is gone
    const snapshot = makeSnapshot(["existing-a", "deleted-a"]);

    const result = computeSnapshotDiff(graph, snapshot);

    const removedEntry = result.diffedArtifacts.find((a) => a.id === "deleted-a");
    expect(removedEntry).toBeDefined();
    expect(removedEntry?.diffStatus).toBe("removed");
    expect(result.removedCount).toBe(1);
  });

  it('marks artifact as "unchanged" when it is in both and not mutated', () => {
    const artifact = makeArtifact("a1", { title: "Same Title", stageId: "stage-1" });

    const graph = makeGraph([artifact]);
    const snapshot = makeSnapshot(["a1"]);

    const result = computeSnapshotDiff(graph, snapshot);

    const entry = result.diffedArtifacts.find((a) => a.id === "a1");
    expect(entry).toBeDefined();
    expect(entry?.diffStatus).toBe("unchanged");
    expect(result.addedCount).toBe(0);
    expect(result.removedCount).toBe(0);
  });

  it("handles an empty snapshot (all graph artifacts become added)", () => {
    const graph = makeGraph([makeArtifact("a1"), makeArtifact("a2")]);
    const snapshot = makeSnapshot([]); // empty snapshot

    const result = computeSnapshotDiff(graph, snapshot);

    expect(result.addedCount).toBe(2);
    expect(result.removedCount).toBe(0);
    expect(result.diffedArtifacts.every((a) => a.diffStatus === "added")).toBe(true);
  });

  it("handles an empty graph (all snapshot members become removed)", () => {
    const graph = makeGraph([]); // nothing in graph
    const snapshot = makeSnapshot(["a1", "a2"]);

    const result = computeSnapshotDiff(graph, snapshot);

    expect(result.removedCount).toBe(2);
    expect(result.addedCount).toBe(0);
    expect(result.diffedArtifacts.every((a) => a.diffStatus === "removed")).toBe(true);
  });

  it("produces a human-readable summary string", () => {
    const graph = makeGraph([makeArtifact("a1"), makeArtifact("new-a")]);
    const snapshot = makeSnapshot(["a1", "old-a"]);

    const result = computeSnapshotDiff(graph, snapshot);

    expect(result.summary).toContain("added");
    expect(result.summary).toContain("removed");
  });

  it("reports 'no changes' in summary when graph matches snapshot exactly", () => {
    const artifact = makeArtifact("a1");
    const graph = makeGraph([artifact]);
    const snapshot = makeSnapshot(["a1"]);

    const result = computeSnapshotDiff(graph, snapshot);

    expect(result.summary).toBe("no changes");
  });

  it("handles missing members field on snapshot gracefully", () => {
    const artifact = makeArtifact("a1");
    const graph = makeGraph([artifact]);
    const snapshot: Snapshot = { ...makeSnapshot([]), members: undefined };

    const result = computeSnapshotDiff(graph, snapshot);

    // All graph artifacts appear as "added" since snapshot has no members
    expect(result.addedCount).toBe(1);
  });
});
