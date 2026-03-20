import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the elk module before importing derived functions
vi.mock("../../app/lib/elk", () => ({
  layoutGraph: vi.fn().mockResolvedValue({
    positions: { "a1": { x: 10, y: 20 }, "a2": { x: 100, y: 200 } },
    containers: {},
  }),
}));

import {
  deriveGraphViewData,
  selectArtifactById,
  selectArtifactsByKind,
  selectRelationsForArtifact,
  selectSubtree,
} from "../../app/lib/derived/graphView";
import type { Artifact, ArtifactType, ProjectGraph, Relation, RelationType } from "../../app/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeArtifactType(id: string, color = "#888"): ArtifactType {
  return { id, name: `Type ${id}`, defaultRepresentation: "medium", color, icon: null, schema: null };
}

function makeRelationType(id: string): RelationType {
  return { id, name: id, label: id, color: "#fff", description: null, icon: null, animated: false };
}

function makeArtifact(id: string, artifactType?: ArtifactType): Artifact {
  return {
    id,
    projectId: "proj-1",
    artifactTypeId: artifactType?.id ?? null,
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
    artifactType: artifactType ?? null,
  };
}

function makeRelation(id: string, fromId: string, toId: string, relationType?: RelationType): Relation {
  return {
    id,
    projectId: "proj-1",
    fromId,
    toId,
    relationTypeId: relationType?.id ?? "rt-1",
    label: null,
    metadata: null,
    order: null,
    createdAt: new Date(),
    relationType: relationType ?? undefined,
  };
}

function makeGraph(artifacts: Artifact[], relations: Relation[] = []): ProjectGraph {
  return {
    project: { id: "proj-1", slug: "test", title: "Test", summary: null, createdAt: new Date(), updatedAt: new Date() },
    artifacts,
    relations,
    snapshots: [],
  };
}

// ---------------------------------------------------------------------------
// deriveGraphViewData
// ---------------------------------------------------------------------------

describe("deriveGraphViewData", () => {
  it("returns all artifacts from the graph", async () => {
    const at = makeArtifactType("at-1");
    const graph = makeGraph([makeArtifact("a1", at), makeArtifact("a2", at)]);
    const result = await deriveGraphViewData(graph);
    expect(result.artifacts).toHaveLength(2);
  });

  it("builds artifactTypeMap from embedded artifactType relations", async () => {
    const at = makeArtifactType("at-1", "#5B4FD9");
    const graph = makeGraph([makeArtifact("a1", at)]);
    const result = await deriveGraphViewData(graph);
    expect(result.artifactTypeMap["at-1"]).toMatchObject({ color: "#5B4FD9" });
  });

  it("builds relationTypeMap from embedded relationType relations", async () => {
    const rt = makeRelationType("rt-parent");
    const graph = makeGraph(
      [makeArtifact("a1"), makeArtifact("a2")],
      [makeRelation("r1", "a1", "a2", rt)]
    );
    const result = await deriveGraphViewData(graph);
    expect(result.relationTypeMap["rt-parent"]).toMatchObject({ id: "rt-parent" });
  });

  it("includes positions from the mocked layout function", async () => {
    const graph = makeGraph([makeArtifact("a1"), makeArtifact("a2")]);
    const result = await deriveGraphViewData(graph);
    expect(result.positions["a1"]).toEqual({ x: 10, y: 20 });
    expect(result.positions["a2"]).toEqual({ x: 100, y: 200 });
  });

  it("filters relations by activeRelationTypeIds when provided", async () => {
    const rt1 = makeRelationType("rt-parent");
    const rt2 = makeRelationType("rt-iterates");
    const relations = [
      makeRelation("r1", "a1", "a2", rt1),
      makeRelation("r2", "a1", "a2", rt2),
    ];
    const graph = makeGraph([makeArtifact("a1"), makeArtifact("a2")], relations);
    const result = await deriveGraphViewData(graph, ["rt-parent"]);
    expect(result.relations).toHaveLength(1);
    expect(result.relations[0].id).toBe("r1");
  });

  it("returns all relations when activeRelationTypeIds is undefined", async () => {
    const rt = makeRelationType("rt-1");
    const relations = [makeRelation("r1", "a1", "a2", rt), makeRelation("r2", "a2", "a1", rt)];
    const graph = makeGraph([makeArtifact("a1"), makeArtifact("a2")], relations);
    const result = await deriveGraphViewData(graph);
    expect(result.relations).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Pure selectors
// ---------------------------------------------------------------------------

describe("selectArtifactById", () => {
  it("returns the artifact with the matching ID", () => {
    const artifacts = [makeArtifact("a1"), makeArtifact("a2")];
    expect(selectArtifactById(artifacts, "a2")?.id).toBe("a2");
  });

  it("returns undefined when ID is not found", () => {
    expect(selectArtifactById([makeArtifact("a1")], "missing")).toBeUndefined();
  });
});

describe("selectArtifactsByKind", () => {
  it("filters artifacts by kind", () => {
    const artifacts = [
      { ...makeArtifact("a1"), kind: "CONCEPT" as const },
      { ...makeArtifact("a2"), kind: "FEATURE" as const },
      { ...makeArtifact("a3"), kind: "CONCEPT" as const },
    ];
    const concepts = selectArtifactsByKind(artifacts, "CONCEPT");
    expect(concepts).toHaveLength(2);
    expect(concepts.every((a) => a.kind === "CONCEPT")).toBe(true);
  });
});

describe("selectRelationsForArtifact", () => {
  it("returns outgoing and incoming relations for an artifact", () => {
    const rt = makeRelationType("rt-1");
    const graph = makeGraph(
      [makeArtifact("a1"), makeArtifact("a2"), makeArtifact("a3")],
      [makeRelation("r1", "a1", "a2", rt), makeRelation("r2", "a3", "a1", rt)]
    );
    const relations = selectRelationsForArtifact(graph, "a1");
    expect(relations).toHaveLength(2);
  });
});

describe("selectSubtree", () => {
  it("returns all descendants of the root artifact", () => {
    const rt = makeRelationType("rt-parent");
    // Graph: a1 → a2 → a3
    const graph = makeGraph(
      [makeArtifact("a1"), makeArtifact("a2"), makeArtifact("a3")],
      [makeRelation("r1", "a1", "a2", rt), makeRelation("r2", "a2", "a3", rt)]
    );
    const subtree = selectSubtree(graph, "a1");
    expect(subtree).toContain("a2");
    expect(subtree).toContain("a3");
    expect(subtree).not.toContain("a1"); // root not included
  });

  it("returns empty array for a leaf node", () => {
    const graph = makeGraph([makeArtifact("a1")], []);
    expect(selectSubtree(graph, "a1")).toEqual([]);
  });
});
