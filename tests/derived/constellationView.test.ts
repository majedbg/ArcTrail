import { describe, it, expect } from "vitest";
import { deriveConstellationData } from "../../app/lib/derived/constellationView";
import type { Artifact, ArtifactKind, ArtifactType, ProjectGraph, Relation, RelationType } from "../../app/lib/types";

// No ELK mock needed — constellationView is fully synchronous.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeArtifactType(id: string, color: string): ArtifactType {
  return { id, name: `Type ${id}`, defaultRepresentation: "medium", color, icon: null, schema: null };
}

function makeRelationType(id: string, color: string): RelationType {
  return { id, name: id, label: id, color, description: null, icon: null, animated: false };
}

function makeArtifact(id: string, kind: ArtifactKind, artifactType?: ArtifactType): Artifact {
  return {
    id,
    projectId: "proj-1",
    artifactTypeId: artifactType?.id ?? null,
    stageId: null,
    kind,
    representation: kind === "CONCEPT" || kind === "PROTOTYPE" ? "rich" : "medium",
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

function makeRelation(id: string, fromId: string, toId: string, rt: RelationType): Relation {
  return {
    id,
    projectId: "proj-1",
    fromId,
    toId,
    relationTypeId: rt.id,
    label: null,
    metadata: null,
    order: null,
    createdAt: new Date(),
    relationType: rt,
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
// Tests
// ---------------------------------------------------------------------------

describe("deriveConstellationData", () => {
  it("places a CONCEPT artifact at the center (0, 0, 0)", () => {
    const concept = makeArtifact("c1", "CONCEPT");
    const result = deriveConstellationData(makeGraph([concept]));
    const node = result.nodes.find((n) => n.artifact.id === "c1");
    expect(node?.position).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("places PROTOTYPE artifacts on ring r=4", () => {
    const proto = makeArtifact("p1", "PROTOTYPE");
    const result = deriveConstellationData(makeGraph([proto]));
    const node = result.nodes.find((n) => n.artifact.id === "p1");
    // Single item on ring → angle=0 → x=4, z=0
    expect(node?.position.x).toBeCloseTo(4);
    expect(node?.position.z).toBeCloseTo(0);
  });

  it("places SUBSYSTEM artifacts on ring r=7", () => {
    const sub = makeArtifact("s1", "SUBSYSTEM");
    const result = deriveConstellationData(makeGraph([sub]));
    const node = result.nodes.find((n) => n.artifact.id === "s1");
    expect(node?.position.x).toBeCloseTo(7);
  });

  it("distributes multiple artifacts on the same ring evenly", () => {
    const f1 = makeArtifact("f1", "FEATURE");
    const f2 = makeArtifact("f2", "FEATURE");
    const result = deriveConstellationData(makeGraph([f1, f2]));

    const n1 = result.nodes.find((n) => n.artifact.id === "f1")!;
    const n2 = result.nodes.find((n) => n.artifact.id === "f2")!;

    // Both should be at radius 10 but different angles
    const r1 = Math.sqrt(n1.position.x ** 2 + n1.position.z ** 2);
    const r2 = Math.sqrt(n2.position.x ** 2 + n2.position.z ** 2);
    expect(r1).toBeCloseTo(10);
    expect(r2).toBeCloseTo(10);

    // They should not overlap
    const dx = n1.position.x - n2.position.x;
    const dz = n1.position.z - n2.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    expect(dist).toBeGreaterThan(0.01);
  });

  it("assigns correct sphere radius for CONCEPT/PROTOTYPE (0.4)", () => {
    const concept = makeArtifact("c1", "CONCEPT");
    const result = deriveConstellationData(makeGraph([concept]));
    expect(result.nodes[0].radius).toBe(0.4);
  });

  it("assigns correct sphere radius for SUBSYSTEM/FEATURE (0.28)", () => {
    const sub = makeArtifact("s1", "SUBSYSTEM");
    const result = deriveConstellationData(makeGraph([sub]));
    expect(result.nodes[0].radius).toBe(0.28);
  });

  it("assigns correct sphere radius for VARIATION/COMPONENT (0.16)", () => {
    const comp = makeArtifact("v1", "VARIATION");
    const result = deriveConstellationData(makeGraph([comp]));
    expect(result.nodes[0].radius).toBe(0.16);
  });

  it("uses artifactType.color for node color when available", () => {
    const at = makeArtifactType("at-1", "#AABBCC");
    const artifact = makeArtifact("a1", "FEATURE", at);
    const result = deriveConstellationData(makeGraph([artifact]));
    expect(result.nodes[0].color).toBe("#AABBCC");
  });

  it("falls back to ARTIFACT_KIND_TOKENS color when no artifactType", () => {
    const artifact = makeArtifact("a1", "CONCEPT"); // no artifactType
    const result = deriveConstellationData(makeGraph([artifact]));
    // CONCEPT token color from tokens.ts
    expect(result.nodes[0].color).toBe("#7F77DD");
  });

  it("builds edges from relations with embedded relationType", () => {
    const rt = makeRelationType("rt-parent", "#555555");
    const concept = makeArtifact("c1", "CONCEPT");
    const proto = makeArtifact("p1", "PROTOTYPE");
    const relation = makeRelation("r1", "c1", "p1", rt);

    const result = deriveConstellationData(makeGraph([concept, proto], [relation]));

    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].relationType.color).toBe("#555555");
  });

  it("skips edges where either artifact has no position (not in graph)", () => {
    const rt = makeRelationType("rt-1", "#fff");
    const concept = makeArtifact("c1", "CONCEPT");
    // r1 references "missing" which isn't in artifacts
    const relation = makeRelation("r1", "c1", "missing", rt);

    const result = deriveConstellationData(makeGraph([concept], [relation]));
    expect(result.edges).toHaveLength(0);
  });

  it("returns empty nodes and edges for an empty graph", () => {
    const result = deriveConstellationData(makeGraph([]));
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });
});
