import { describe, it, expect, vi } from "vitest";

vi.mock("../../app/lib/elk", () => ({
  layoutPrototypeView: vi.fn().mockResolvedValue({
    "snap-1": { x: 0, y: 0 },
    "snap-2": { x: 440, y: 0 },
  }),
}));

import { derivePrototypeViewData } from "../../app/lib/derived/prototypeView";
import type {
  Artifact,
  ProjectGraph,
  Snapshot,
  SnapshotMember,
  SnapshotRelation,
} from "../../app/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeArtifact(id: string): Artifact {
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeSnapshot(id: string, artifactIds: string[]): Snapshot {
  const members: SnapshotMember[] = artifactIds.map((aid) => ({
    id: `sm-${id}-${aid}`,
    snapshotId: id,
    artifactId: aid,
    role: null,
    notes: null,
  }));
  return {
    id,
    projectId: "proj-1",
    prototypeArtifactId: "proto-1",
    versionString: `v-${id}`,
    displayLabel: null,
    dateISO: "2026-01-01",
    notes: null,
    createdAt: new Date(),
    members,
  };
}

function makeGraph(artifacts: Artifact[]): ProjectGraph {
  return {
    project: { id: "proj-1", slug: "test", title: "Test", summary: null, createdAt: new Date(), updatedAt: new Date() },
    artifacts,
    relations: [],
    snapshots: [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("derivePrototypeViewData", () => {
  it("filters snapshots to only those belonging to the prototype artifact", async () => {
    const snapshots = [
      makeSnapshot("snap-1", ["a1"]),
      { ...makeSnapshot("snap-other", ["a2"]), prototypeArtifactId: "other-proto" },
    ];
    const graph = makeGraph([makeArtifact("a1"), makeArtifact("a2")]);

    const result = await derivePrototypeViewData(graph, snapshots, [], "proto-1");

    expect(result.snapshots).toHaveLength(1);
    expect(result.snapshots[0].id).toBe("snap-1");
  });

  it("builds memberMap with Artifact objects resolved from the graph", async () => {
    const artifact = makeArtifact("a1");
    const snapshots = [makeSnapshot("snap-1", ["a1"])];
    const graph = makeGraph([artifact]);

    const result = await derivePrototypeViewData(graph, snapshots, [], "proto-1");

    expect(result.memberMap["snap-1"]).toHaveLength(1);
    expect(result.memberMap["snap-1"][0].id).toBe("a1");
  });

  it("omits member artifacts that no longer exist in the graph", async () => {
    const snapshots = [makeSnapshot("snap-1", ["a1", "deleted-a"])];
    const graph = makeGraph([makeArtifact("a1")]); // deleted-a missing

    const result = await derivePrototypeViewData(graph, snapshots, [], "proto-1");

    expect(result.memberMap["snap-1"]).toHaveLength(1);
    expect(result.memberMap["snap-1"][0].id).toBe("a1");
  });

  it("filters snapshot relations to only those between this prototype's snapshots", async () => {
    const snapshots = [
      makeSnapshot("snap-1", []),
      makeSnapshot("snap-2", []),
      { ...makeSnapshot("snap-other", []), prototypeArtifactId: "other-proto" },
    ];

    const allRelations: SnapshotRelation[] = [
      {
        id: "sr-1",
        fromSnapshotId: "snap-1",
        toSnapshotId: "snap-2",
        relationTypeId: "rt-iter",
        label: null,
        metadata: null,
        createdAt: new Date(),
      },
      {
        id: "sr-2",
        fromSnapshotId: "snap-1",
        toSnapshotId: "snap-other",
        relationTypeId: "rt-iter",
        label: null,
        metadata: null,
        createdAt: new Date(),
      },
    ];

    const graph = makeGraph([]);
    const result = await derivePrototypeViewData(graph, snapshots, allRelations, "proto-1");

    // snap-other is not in proto-1's snapshots, so sr-2 should be filtered
    expect(result.relations).toHaveLength(1);
    expect(result.relations[0].id).toBe("sr-1");
  });

  it("returns positions from the mocked ELK layout", async () => {
    const snapshots = [makeSnapshot("snap-1", []), makeSnapshot("snap-2", [])];
    const graph = makeGraph([]);
    const result = await derivePrototypeViewData(graph, snapshots, [], "proto-1");

    expect(result.positions["snap-1"]).toEqual({ x: 0, y: 0 });
    expect(result.positions["snap-2"]).toEqual({ x: 440, y: 0 });
  });

  it("returns empty arrays and maps when no snapshots match the prototype", async () => {
    const graph = makeGraph([]);
    const result = await derivePrototypeViewData(graph, [], [], "proto-1");

    expect(result.snapshots).toHaveLength(0);
    expect(result.relations).toHaveLength(0);
    expect(result.memberMap).toEqual({});
  });
});
