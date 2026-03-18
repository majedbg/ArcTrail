/**
 * Tests for graphSlice — state mutations and selectors.
 *
 * Each test creates a fresh Zustand store via `create(createGraphSlice)`
 * so there is no shared state between tests and no persist middleware
 * (which requires localStorage, unavailable in Node).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { create } from "zustand";
import {
  createGraphSlice,
  selectArtifactById,
  selectArtifactsByKind,
  selectRelationsForArtifact,
  selectSubtree,
} from "../../app/lib/store/graphSlice";
import type { GraphSlice } from "../../app/lib/store/graphSlice";
import type { Artifact, ProjectGraph, Relation, RelationType } from "../../app/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStore() {
  return create<GraphSlice>()(createGraphSlice);
}

function makeArtifact(id: string, kind: Artifact["kind"] = "FEATURE", overrides: Partial<Artifact> = {}): Artifact {
  return {
    id,
    projectId: "proj-1",
    artifactTypeId: null,
    stageId: null,
    kind,
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
    ...overrides,
  };
}

function makeRelation(id: string, fromId: string, toId: string): Relation {
  return {
    id,
    projectId: "proj-1",
    fromId,
    toId,
    relationTypeId: "rt-parent",
    label: null,
    metadata: null,
    order: null,
    createdAt: new Date(),
  };
}

function makeGraph(artifacts: Artifact[], relations: Relation[] = []): ProjectGraph {
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
    relations,
    snapshots: [],
  };
}

// ---------------------------------------------------------------------------
// setProjectGraph
// ---------------------------------------------------------------------------

describe("graphSlice: setProjectGraph", () => {
  it("stores the project graph", () => {
    const store = makeStore();
    const graph = makeGraph([makeArtifact("a1")]);
    store.getState().setProjectGraph(graph);
    expect(store.getState().projectGraph?.artifacts).toHaveLength(1);
  });

  it("replaces an existing graph", () => {
    const store = makeStore();
    store.getState().setProjectGraph(makeGraph([makeArtifact("a1")]));
    store.getState().setProjectGraph(makeGraph([makeArtifact("a2"), makeArtifact("a3")]));
    expect(store.getState().projectGraph?.artifacts).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// upsertArtifact
// ---------------------------------------------------------------------------

describe("graphSlice: upsertArtifact", () => {
  it("appends a new artifact when id does not exist", () => {
    const store = makeStore();
    store.getState().setProjectGraph(makeGraph([makeArtifact("a1")]));
    store.getState().upsertArtifact(makeArtifact("a2"));
    expect(store.getState().projectGraph?.artifacts).toHaveLength(2);
    expect(store.getState().projectGraph?.artifacts.find((a) => a.id === "a2")).toBeDefined();
  });

  it("replaces an existing artifact in-place (preserves position in array)", () => {
    const original = makeArtifact("a1", "FEATURE", { title: "Old Title" });
    const updated = makeArtifact("a1", "FEATURE", { title: "New Title" });
    const store = makeStore();
    store.getState().setProjectGraph(makeGraph([original, makeArtifact("a2")]));
    store.getState().upsertArtifact(updated);

    const artifacts = store.getState().projectGraph!.artifacts;
    expect(artifacts).toHaveLength(2);
    expect(artifacts[0].title).toBe("New Title"); // still at index 0
  });

  it("does nothing when projectGraph is null", () => {
    const store = makeStore();
    expect(() => store.getState().upsertArtifact(makeArtifact("a1"))).not.toThrow();
    expect(store.getState().projectGraph).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// removeArtifact
// ---------------------------------------------------------------------------

describe("graphSlice: removeArtifact", () => {
  it("removes the artifact from the graph", () => {
    const store = makeStore();
    store.getState().setProjectGraph(makeGraph([makeArtifact("a1"), makeArtifact("a2")]));
    store.getState().removeArtifact("a1");
    expect(store.getState().projectGraph?.artifacts).toHaveLength(1);
    expect(store.getState().projectGraph?.artifacts[0].id).toBe("a2");
  });

  it("cascades to remove relations that reference the deleted artifact", () => {
    const store = makeStore();
    store
      .getState()
      .setProjectGraph(
        makeGraph(
          [makeArtifact("a1"), makeArtifact("a2"), makeArtifact("a3")],
          [
            makeRelation("r1", "a1", "a2"), // involves a1
            makeRelation("r2", "a2", "a3"), // does NOT involve a1
          ]
        )
      );
    store.getState().removeArtifact("a1");

    const relations = store.getState().projectGraph!.relations;
    expect(relations).toHaveLength(1);
    expect(relations[0].id).toBe("r2");
  });

  it("removes both fromId and toId relations (both directions)", () => {
    const store = makeStore();
    store
      .getState()
      .setProjectGraph(
        makeGraph(
          [makeArtifact("a1"), makeArtifact("a2"), makeArtifact("a3")],
          [
            makeRelation("r1", "a2", "a1"), // a1 is the target
            makeRelation("r2", "a1", "a3"), // a1 is the source
            makeRelation("r3", "a2", "a3"), // unrelated
          ]
        )
      );
    store.getState().removeArtifact("a1");
    expect(store.getState().projectGraph!.relations).toHaveLength(1);
    expect(store.getState().projectGraph!.relations[0].id).toBe("r3");
  });
});

// ---------------------------------------------------------------------------
// upsertRelation / removeRelation
// ---------------------------------------------------------------------------

describe("graphSlice: upsertRelation", () => {
  it("adds a new relation", () => {
    const store = makeStore();
    store.getState().setProjectGraph(makeGraph([]));
    store.getState().upsertRelation(makeRelation("r1", "a1", "a2"));
    expect(store.getState().projectGraph?.relations).toHaveLength(1);
  });

  it("replaces an existing relation by id", () => {
    const original = makeRelation("r1", "a1", "a2");
    const updated = { ...original, label: "updated" };
    const store = makeStore();
    store.getState().setProjectGraph(makeGraph([], [original]));
    store.getState().upsertRelation(updated);

    const relations = store.getState().projectGraph!.relations;
    expect(relations).toHaveLength(1);
    expect(relations[0].label).toBe("updated");
  });
});

describe("graphSlice: removeRelation", () => {
  it("removes a relation by id", () => {
    const store = makeStore();
    store.getState().setProjectGraph(makeGraph([], [makeRelation("r1", "a1", "a2"), makeRelation("r2", "a2", "a3")]));
    store.getState().removeRelation("r1");
    expect(store.getState().projectGraph!.relations).toHaveLength(1);
    expect(store.getState().projectGraph!.relations[0].id).toBe("r2");
  });
});

// ---------------------------------------------------------------------------
// setPositions
// ---------------------------------------------------------------------------

describe("graphSlice: setPositions", () => {
  it("stores the positions map", () => {
    const store = makeStore();
    store.getState().setPositions({ "a1": { x: 10, y: 20 } });
    expect(store.getState().positions["a1"]).toEqual({ x: 10, y: 20 });
  });
});

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

describe("selectArtifactById", () => {
  it("returns the artifact with the matching id", () => {
    const store = makeStore();
    store.getState().setProjectGraph(makeGraph([makeArtifact("a1"), makeArtifact("a2")]));
    const result = selectArtifactById(store.getState(), "a2");
    expect(result?.id).toBe("a2");
  });

  it("returns undefined when no artifact matches", () => {
    const store = makeStore();
    store.getState().setProjectGraph(makeGraph([makeArtifact("a1")]));
    expect(selectArtifactById(store.getState(), "missing")).toBeUndefined();
  });

  it("returns undefined when projectGraph is null", () => {
    const store = makeStore();
    expect(selectArtifactById(store.getState(), "a1")).toBeUndefined();
  });
});

describe("selectArtifactsByKind", () => {
  it("returns only artifacts of the given kind", () => {
    const store = makeStore();
    store
      .getState()
      .setProjectGraph(
        makeGraph([
          makeArtifact("a1", "CONCEPT"),
          makeArtifact("a2", "FEATURE"),
          makeArtifact("a3", "CONCEPT"),
        ])
      );
    const concepts = selectArtifactsByKind(store.getState(), "CONCEPT");
    expect(concepts).toHaveLength(2);
    expect(concepts.every((a) => a.kind === "CONCEPT")).toBe(true);
  });

  it("returns an empty array when projectGraph is null", () => {
    const store = makeStore();
    expect(selectArtifactsByKind(store.getState(), "FEATURE")).toEqual([]);
  });
});

describe("selectRelationsForArtifact", () => {
  it("returns both outgoing and incoming relations", () => {
    const store = makeStore();
    store
      .getState()
      .setProjectGraph(
        makeGraph(
          [makeArtifact("a1"), makeArtifact("a2"), makeArtifact("a3")],
          [
            makeRelation("r1", "a1", "a2"), // a1 as source
            makeRelation("r2", "a3", "a1"), // a1 as target
            makeRelation("r3", "a2", "a3"), // unrelated to a1
          ]
        )
      );
    const relations = selectRelationsForArtifact(store.getState(), "a1");
    expect(relations).toHaveLength(2);
    expect(relations.map((r) => r.id)).toEqual(expect.arrayContaining(["r1", "r2"]));
  });

  it("returns empty array when no relations involve the artifact", () => {
    const store = makeStore();
    store.getState().setProjectGraph(makeGraph([makeArtifact("a1")]));
    expect(selectRelationsForArtifact(store.getState(), "a1")).toEqual([]);
  });
});

describe("selectSubtree", () => {
  it("returns all direct and indirect descendants", () => {
    const store = makeStore();
    // a1 → a2 → a3
    store
      .getState()
      .setProjectGraph(
        makeGraph(
          [makeArtifact("a1"), makeArtifact("a2"), makeArtifact("a3")],
          [makeRelation("r1", "a1", "a2"), makeRelation("r2", "a2", "a3")]
        )
      );
    const subtree = selectSubtree(store.getState(), "a1");
    expect(subtree).toContain("a2");
    expect(subtree).toContain("a3");
    expect(subtree).not.toContain("a1");
  });

  it("returns empty for a leaf node", () => {
    const store = makeStore();
    store.getState().setProjectGraph(makeGraph([makeArtifact("a1")], []));
    expect(selectSubtree(store.getState(), "a1")).toEqual([]);
  });

  it("does not infinite-loop on cyclic relations", () => {
    const store = makeStore();
    // a1 → a2 → a1 (cycle)
    store
      .getState()
      .setProjectGraph(
        makeGraph(
          [makeArtifact("a1"), makeArtifact("a2")],
          [makeRelation("r1", "a1", "a2"), makeRelation("r2", "a2", "a1")]
        )
      );
    expect(() => selectSubtree(store.getState(), "a1")).not.toThrow();
    const subtree = selectSubtree(store.getState(), "a1");
    expect(subtree).toContain("a2");
  });

  it("returns empty when projectGraph is null", () => {
    const store = makeStore();
    expect(selectSubtree(store.getState(), "a1")).toEqual([]);
  });
});
