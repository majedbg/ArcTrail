/**
 * ArcTrail application-layer type definitions.
 *
 * These types mirror the Prisma schema models but use proper TypeScript
 * semantics (real arrays, typed JSON, etc.) rather than SQLite storage
 * workarounds. The data layer is responsible for parsing/serializing
 * fields that SQLite stores as strings.
 *
 * Note: `ArtifactKind` is imported from tokens.ts (not @prisma/client)
 * so it can also be safely imported by tailwind.config.ts without
 * circular dep issues.
 */

import type { ArtifactKind } from "./tokens.js";

export type { ArtifactKind };

// ---------------------------------------------------------------------------
// Primitive / union types
// ---------------------------------------------------------------------------

/** How an artifact is visually rendered on the canvas. */
export type ArtifactRepresentation =
  | "rich"
  | "medium"
  | "minimal"
  | (string & {});

/** Knowledge taxonomy for journal entries. */
export type KnowledgeDimension =
  | "form"
  | "function"
  | "manufacturing"
  | "ux"
  | "performance";

// ---------------------------------------------------------------------------
// Registry models (seeded, extensible)
// ---------------------------------------------------------------------------

export type ArtifactType = {
  id: string;
  name: string;
  defaultRepresentation: ArtifactRepresentation;
  color: string;
  icon: string | null;
  /** Extensible schema definition stored as JSON; null if not defined. */
  schema: Record<string, unknown> | null;
};

export type RelationType = {
  id: string;
  name: string;
  label: string;
  color: string;
  description: string | null;
  icon: string | null;
  animated: boolean;
};

export type Stage = {
  id: string;
  name: string;
  order: number;
  color: string;
  description: string | null;
};

// ---------------------------------------------------------------------------
// Component catalog
// ---------------------------------------------------------------------------

export type ComponentCatalog = {
  id: string;
  name: string;
  partNumber: string | null;
  manufacturer: string | null;
  category: string | null;
  specs: Record<string, unknown> | null;
  datasheet: string | null;
};

export type ArtifactComponent = {
  id: string;
  artifactId: string;
  componentId: string;
  quantity: number;
  role: string | null;
  notes: string | null;
};

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

/** A single media attachment on an artifact or entry. */
export type MediaItem = {
  type: "img" | "video";
  src: string;
  alt: string;
};

// ---------------------------------------------------------------------------
// Core graph models
// ---------------------------------------------------------------------------

/**
 * Application-layer Artifact. Fields that SQLite stores as strings
 * (categories, media, etc.) are represented here with their intended types.
 *
 * `artifactType` and `stage` are optional — populated only when the Prisma
 * query uses `include: { artifactType: true, stage: true }`.
 */
export type Artifact = {
  id: string;
  projectId: string;
  artifactTypeId: string | null;
  stageId: string | null;
  kind: ArtifactKind;
  representation: ArtifactRepresentation;
  title: string;
  subsystemCode: string | null;
  dateISO: string | null;
  summary: string | null;
  contentMd: string | null;
  contentFormat: string | null;
  showBoth: boolean;
  /** Parsed from SQLite's JSON string. */
  media: MediaItem[] | null;
  typeProps: Record<string, unknown> | null;
  metrics: Record<string, unknown> | null;
  /** Parsed from SQLite's JSON array string. */
  categories: string[];
  catalogId: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Optionally populated via Prisma include:
  artifactType?: ArtifactType | null;
  stage?: Stage | null;
};

export type Relation = {
  id: string;
  projectId: string;
  fromId: string;
  toId: string;
  relationTypeId: string;
  label: string | null;
  metadata: Record<string, unknown> | null;
  order: number | null;
  createdAt: Date;
  // Optionally populated via Prisma include:
  relationType?: RelationType | null;
};

// ---------------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------------

export type Entry = {
  id: string;
  artifactId: string;
  title: string;
  dateISO: string;
  contentMd: string | null;
  summary: string | null;
  media: MediaItem[] | null;
  /** Parsed from SQLite's JSON array string. */
  knowledgeDimensions: KnowledgeDimension[];
  createdAt: Date;
};

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

export type Snapshot = {
  id: string;
  projectId: string;
  prototypeArtifactId: string;
  versionString: string;
  displayLabel: string | null;
  dateISO: string;
  notes: string | null;
  createdAt: Date;
  /** Populated when loaded with `include: { members: true }`. */
  members?: SnapshotMember[];
};

export type SnapshotMember = {
  id: string;
  snapshotId: string;
  artifactId: string;
  role: string | null;
  notes: string | null;
};

export type SnapshotRelation = {
  id: string;
  fromSnapshotId: string;
  toSnapshotId: string;
  relationTypeId: string;
  label: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

// ---------------------------------------------------------------------------
// Project & embed
// ---------------------------------------------------------------------------

export type Project = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type EmbedKey = {
  id: string;
  projectId: string;
  publicKey: string;
  isActive: boolean;
  createdAt: Date;
};

// ---------------------------------------------------------------------------
// Primary DTO
// ---------------------------------------------------------------------------

/**
 * Base data transfer object loaded by Remix loaders.
 * Each view derives its own transformed state from this.
 */
export type ProjectGraph = {
  project: Project;
  artifacts: Artifact[];
  relations: Relation[];
  snapshots: Snapshot[];
};

// ---------------------------------------------------------------------------
// Version string types (section 6)
// ---------------------------------------------------------------------------

/**
 * A single parsed segment of a version string.
 *
 * Grammar: `SUBSYSTEM.FEATUREiteration[forkSuffix][.MAJOR.MINOR]`
 * Examples: "AI.RCA1", "AI.RCA1a", "AI.RCA1.2.0"
 */
export type VersionSegment = {
  /** Uppercase subsystem code, e.g. "AI", "LO", "SP" */
  subsystemCode: string;
  /** Uppercase feature code, e.g. "RCA", "LAP", "CI" */
  featureCode: string;
  /** Feature iteration number, e.g. 1, 2, 3 */
  iteration: number;
  /** Optional fork suffix — lowercase letter, e.g. "a", "b" */
  forkSuffix?: string;
  /** Optional component major version */
  componentMajor?: number;
  /** Optional component minor version */
  componentMinor?: number;
};

/**
 * Parsed representation of an ArcTrail version string.
 * e.g. raw="AI.RCA1.2.0-LO.LAP2" → two segments
 */
export type ParsedVersionString = {
  raw: string;
  segments: VersionSegment[];
};

// ---------------------------------------------------------------------------
// Snapshot diff types (section 6 + 25.4)
// ---------------------------------------------------------------------------

/**
 * Set-level diff between two snapshots (by artifactId).
 * Used by diffSnapshots() in version.ts.
 */
export type SnapshotDiff = {
  /** artifactIds present in B but not in A */
  added: string[];
  /** artifactIds present in A but not in B */
  removed: string[];
  /** artifactIds present in both A and B */
  unchanged: string[];
};

/** Per-artifact diff status compared to a reference snapshot. */
export type DiffStatus = "added" | "removed" | "changed" | "unchanged";

/** An Artifact annotated with its diff status relative to a snapshot. */
export type DiffedArtifact = Artifact & { diffStatus: DiffStatus };

/**
 * Full diff result between a snapshot and the current graph state.
 * Returned by computeSnapshotDiff() in diffSnapshot.ts.
 */
export type SnapshotDiffResult = {
  diffedArtifacts: DiffedArtifact[];
  addedCount: number;
  removedCount: number;
  changedCount: number;
  /** Human-readable summary, e.g. "2 added, 1 removed" */
  summary: string;
};

// ---------------------------------------------------------------------------
// Representation registry
// ---------------------------------------------------------------------------

export type RepresentationConfig = {
  /** Name of the React component that renders this representation. */
  component: string;
  requiredProps: string[];
  optionalProps: string[];
};

export const REPRESENTATION_REGISTRY: Record<
  "rich" | "medium" | "minimal",
  RepresentationConfig
> = {
  rich: {
    component: "ArtifactCardRich",
    requiredProps: ["title", "summary", "media", "categories"],
    optionalProps: ["contentMd", "metrics", "links"],
  },
  medium: {
    component: "ArtifactCardMedium",
    requiredProps: ["title", "categories"],
    optionalProps: ["summary", "media"],
  },
  minimal: {
    component: "ArtifactCardMinimal",
    requiredProps: ["title"],
    optionalProps: ["categories"],
  },
};

// ---------------------------------------------------------------------------
// Canvas / layout types
// ---------------------------------------------------------------------------

/** Map of artifactId → 2D position from ELK layout. */
export type PositionMap = Record<string, { x: number; y: number }>;

/** Map of snapshotId → 2D position from ELK layout. */
export type SnapshotPositionMap = Record<string, { x: number; y: number }>;

/**
 * Shared data contract for relation line renderers.
 * SVGRelationLine (GraphCanvas) and ParticleRelationLine (ConstellationView)
 * both receive this shape — each view owns its renderer implementation.
 */
export type RelationLineData = {
  id: string;
  fromPosition: { x: number; y: number; z?: number };
  toPosition: { x: number; y: number; z?: number };
  relationType: RelationType;
  isActive: boolean;
  isHighlighted?: boolean;
};

// ---------------------------------------------------------------------------
// Derived view data types (section 25.3)
// ---------------------------------------------------------------------------

/**
 * Data shape for the 2D GraphCanvas view.
 * Produced by deriveGraphViewData() in derived/graphView.ts.
 */
export type GraphViewData = {
  artifacts: Artifact[];
  relations: Relation[];
  /** Positions computed by ELK layout (bottom-root, upward tree). */
  positions: PositionMap;
  artifactTypeMap: Record<string, ArtifactType>;
  relationTypeMap: Record<string, RelationType>;
};

/**
 * Data shape for the PrototypeView (horizontal snapshot timeline).
 * Produced by derivePrototypeViewData() in derived/prototypeView.ts.
 */
export type PrototypeViewData = {
  snapshots: Snapshot[];
  relations: SnapshotRelation[];
  /** Positions computed by ELK layout (left-to-right git graph). */
  positions: SnapshotPositionMap;
  /** Maps snapshotId → its member Artifact objects. */
  memberMap: Record<string, Artifact[]>;
};

/** A single node in the 3D constellation view. */
export type ConstellationNode = {
  artifact: Artifact;
  position: { x: number; y: number; z: number };
  /** Sphere radius based on ArtifactKind / representation. */
  radius: number;
  /** Color from artifactType.color or ARTIFACT_KIND_TOKENS fallback. */
  color: string;
};

/** A single edge in the 3D constellation view. */
export type ConstellationEdge = {
  from: { x: number; y: number; z: number };
  to: { x: number; y: number; z: number };
  relationType: RelationType;
};

/**
 * Data shape for the ConstellationView (3D r3f view).
 * Produced by deriveConstellationData() in derived/constellationView.ts.
 */
export type ConstellationData = {
  nodes: ConstellationNode[];
  edges: ConstellationEdge[];
};
