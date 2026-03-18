import { describe, it, expect } from "vitest";
import {
  parseVersionString,
  generateSubsystemCode,
  diffSnapshots,
  inferVersionBump,
} from "../app/lib/version";
import type { Snapshot, Artifact } from "../app/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSnapshot(id: string, versionString: string, memberIds: string[] = []): Snapshot {
  return {
    id,
    projectId: "proj-1",
    prototypeArtifactId: "proto-1",
    versionString,
    displayLabel: null,
    dateISO: "2026-01-01",
    notes: null,
    createdAt: new Date("2026-01-01"),
    members: memberIds.map((artifactId) => ({
      id: `sm-${artifactId}`,
      snapshotId: id,
      artifactId,
      role: null,
      notes: null,
    })),
  };
}

function makeArtifact(
  id: string,
  kind: Artifact["kind"],
  overrides: Partial<Artifact> = {}
): Artifact {
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

// ---------------------------------------------------------------------------
// parseVersionString
// ---------------------------------------------------------------------------

describe("parseVersionString", () => {
  it("parses a simple single-segment version", () => {
    const result = parseVersionString("AI.RCA1");
    expect(result.raw).toBe("AI.RCA1");
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0]).toMatchObject({
      subsystemCode: "AI",
      featureCode: "RCA",
      iteration: 1,
      forkSuffix: undefined,
      componentMajor: undefined,
      componentMinor: undefined,
    });
  });

  it("parses a version with component major/minor", () => {
    const result = parseVersionString("AI.RCA1.2.0");
    expect(result.segments[0]).toMatchObject({
      subsystemCode: "AI",
      featureCode: "RCA",
      iteration: 1,
      componentMajor: 2,
      componentMinor: 0,
    });
  });

  it("parses a version with a fork suffix", () => {
    const result = parseVersionString("AI.RCA1a");
    expect(result.segments[0]).toMatchObject({
      subsystemCode: "AI",
      featureCode: "RCA",
      iteration: 1,
      forkSuffix: "a",
    });
  });

  it("parses a fork suffix combined with component version", () => {
    const result = parseVersionString("AI.RCA1a.2.0");
    expect(result.segments[0]).toMatchObject({
      subsystemCode: "AI",
      featureCode: "RCA",
      iteration: 1,
      forkSuffix: "a",
      componentMajor: 2,
      componentMinor: 0,
    });
  });

  it("parses a multi-segment version string", () => {
    const result = parseVersionString("AI.RCA1-LO.LAP2");
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]).toMatchObject({ subsystemCode: "AI", featureCode: "RCA", iteration: 1 });
    expect(result.segments[1]).toMatchObject({ subsystemCode: "LO", featureCode: "LAP", iteration: 2 });
  });

  it("parses the full example AI.RCA1.2.0-LO.LAP2", () => {
    const result = parseVersionString("AI.RCA1.2.0-LO.LAP2");
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]).toMatchObject({
      subsystemCode: "AI",
      featureCode: "RCA",
      iteration: 1,
      componentMajor: 2,
      componentMinor: 0,
    });
    expect(result.segments[1]).toMatchObject({
      subsystemCode: "LO",
      featureCode: "LAP",
      iteration: 2,
      componentMajor: undefined,
    });
  });

  it("throws on missing dot separator", () => {
    expect(() => parseVersionString("AIRCA1")).toThrow();
  });

  it("throws on lowercase subsystem code", () => {
    expect(() => parseVersionString("ai.RCA1")).toThrow();
  });

  it("throws on missing iteration digits", () => {
    expect(() => parseVersionString("AI.RCA")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// generateSubsystemCode
// ---------------------------------------------------------------------------

describe("generateSubsystemCode", () => {
  it("generates initials from a two-word name", () => {
    expect(generateSubsystemCode("Audio Input", [])).toBe("AI");
  });

  it("generates initials from a three-word name", () => {
    expect(generateSubsystemCode("Light Output System", [])).toBe("LOS");
  });

  it("falls back to first-3-chars when initials collide", () => {
    // "AI" already taken → try "AUD" (first 3 of "Audio")
    expect(generateSubsystemCode("Audio Interface", ["AI"])).toBe("AUD");
  });

  it("appends a digit when both initials and first-3 collide", () => {
    // "AI" and "AUD" both taken → "AI2"
    expect(generateSubsystemCode("Audio Interface", ["AI", "AUD"])).toBe("AI2");
  });

  it("generates initials for a single-word name", () => {
    expect(generateSubsystemCode("Power", [])).toBe("P");
  });

  it("handles uppercase input gracefully", () => {
    expect(generateSubsystemCode("VIDEO OUTPUT", [])).toBe("VO");
  });
});

// ---------------------------------------------------------------------------
// diffSnapshots
// ---------------------------------------------------------------------------

describe("diffSnapshots", () => {
  it("detects no changes when snapshots are identical", () => {
    const a = makeSnapshot("s1", "AI.RCA1", ["a1", "a2"]);
    const b = makeSnapshot("s2", "AI.RCA2", ["a1", "a2"]);
    const diff = diffSnapshots(a, b);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.unchanged).toEqual(expect.arrayContaining(["a1", "a2"]));
  });

  it("detects added artifacts (in B but not A)", () => {
    const a = makeSnapshot("s1", "AI.RCA1", ["a1"]);
    const b = makeSnapshot("s2", "AI.RCA2", ["a1", "a2"]);
    const diff = diffSnapshots(a, b);
    expect(diff.added).toEqual(["a2"]);
    expect(diff.removed).toEqual([]);
    expect(diff.unchanged).toEqual(["a1"]);
  });

  it("detects removed artifacts (in A but not B)", () => {
    const a = makeSnapshot("s1", "AI.RCA1", ["a1", "a2"]);
    const b = makeSnapshot("s2", "AI.RCA2", ["a1"]);
    const diff = diffSnapshots(a, b);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual(["a2"]);
    expect(diff.unchanged).toEqual(["a1"]);
  });

  it("detects both added and removed in a replacement scenario", () => {
    const a = makeSnapshot("s1", "AI.RCA1", ["a1", "old"]);
    const b = makeSnapshot("s2", "AI.RCA2", ["a1", "new"]);
    const diff = diffSnapshots(a, b);
    expect(diff.added).toEqual(["new"]);
    expect(diff.removed).toEqual(["old"]);
    expect(diff.unchanged).toEqual(["a1"]);
  });

  it("handles empty member lists", () => {
    const a = makeSnapshot("s1", "v1", []);
    const b = makeSnapshot("s2", "v2", []);
    const diff = diffSnapshots(a, b);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.unchanged).toEqual([]);
  });

  it("handles missing members field (treats as empty)", () => {
    const a: Snapshot = { ...makeSnapshot("s1", "v1", []), members: undefined };
    const b: Snapshot = { ...makeSnapshot("s2", "v2", ["a1"]) };
    const diff = diffSnapshots(a, b);
    expect(diff.added).toEqual(["a1"]);
    expect(diff.removed).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// inferVersionBump
// ---------------------------------------------------------------------------

describe("inferVersionBump", () => {
  it("suggests componentMinor++ + ITERATES_ON when only components changed", () => {
    const parent = makeSnapshot("s1", "AI.RCA1.1.0", ["subsystem1", "component1"]);
    const diff = { added: ["component2"], removed: ["component1"], unchanged: ["subsystem1"] };
    const artifacts = [
      makeArtifact("subsystem1", "SUBSYSTEM"),
      makeArtifact("component1", "COMPONENT"),
      makeArtifact("component2", "COMPONENT"),
    ];
    const result = inferVersionBump(parent, diff, artifacts);
    expect(result.relationType).toBe("ITERATES_ON");
    expect(result.suggestion).toContain("AI.RCA1");
    // componentMinor bumped from 0 to 1
    expect(result.suggestion).toMatch(/\.1\.1$/);
  });

  it("suggests ITERATES_ON when a subsystem is added (no removal)", () => {
    const parent = makeSnapshot("s1", "AI.RCA1", ["sub1"]);
    const diff = { added: ["sub2"], removed: [], unchanged: ["sub1"] };
    const artifacts = [
      makeArtifact("sub1", "SUBSYSTEM", { subsystemCode: "AI" }),
      makeArtifact("sub2", "SUBSYSTEM", { subsystemCode: "LO", title: "Light Output" }),
    ];
    const result = inferVersionBump(parent, diff, artifacts);
    expect(result.relationType).toBe("ITERATES_ON");
    // Should append new segment
    expect(result.suggestion).toContain("-");
  });

  it("suggests FORKS_FROM when a subsystem is swapped (removed + added)", () => {
    const parent = makeSnapshot("s1", "AI.RCA1", ["sub1"]);
    const diff = { added: ["sub2"], removed: ["sub1"], unchanged: [] };
    const artifacts = [
      makeArtifact("sub1", "SUBSYSTEM", { subsystemCode: "AI", title: "Audio Input" }),
      makeArtifact("sub2", "SUBSYSTEM", { subsystemCode: "MI", title: "MIDI Input" }),
    ];
    const result = inferVersionBump(parent, diff, artifacts);
    expect(result.relationType).toBe("FORKS_FROM");
    expect(result.suggestion).toContain("MI");
  });

  it("suggests FORKS_FROM when a feature is replaced", () => {
    const parent = makeSnapshot("s1", "AI.RCA1", ["feat1"]);
    const diff = { added: ["feat2"], removed: ["feat1"], unchanged: [] };
    const artifacts = [
      makeArtifact("feat1", "FEATURE", { title: "RCA Input" }),
      makeArtifact("feat2", "FEATURE", { title: "XLR Input" }),
    ];
    const result = inferVersionBump(parent, diff, artifacts);
    expect(result.relationType).toBe("FORKS_FROM");
  });

  it("suggests ITERATES_ON + iteration++ when features are added without removal", () => {
    const parent = makeSnapshot("s1", "AI.RCA1", ["feat1"]);
    const diff = { added: ["feat2"], removed: [], unchanged: ["feat1"] };
    const artifacts = [
      makeArtifact("feat1", "FEATURE", { title: "RCA Input" }),
      makeArtifact("feat2", "FEATURE", { title: "USB Input" }),
    ];
    const result = inferVersionBump(parent, diff, artifacts);
    expect(result.relationType).toBe("ITERATES_ON");
    // iteration should go from 1 to 2
    expect(result.suggestion).toContain("RCA2");
  });

  it("falls back gracefully when parent version is unparseable", () => {
    const parent = makeSnapshot("s1", "UNPARSEABLE_VERSION", []);
    const diff = { added: ["a1"], removed: [], unchanged: [] };
    const artifacts = [makeArtifact("a1", "FEATURE")];
    const result = inferVersionBump(parent, diff, artifacts);
    expect(result.suggestion).toBeTruthy();
    expect(result.reasoning).toBeTruthy();
    expect(["ITERATES_ON", "FORKS_FROM"]).toContain(result.relationType);
  });
});
