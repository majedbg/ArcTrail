/**
 * ArcTrail Design Token System
 *
 * Single source of truth for all colors, spacing, and visual constants.
 * Imported by both Tailwind config (at build time) and components (at runtime).
 *
 * ArtifactKind is defined here as a string union — NOT imported from @prisma/client —
 * to allow safe import in tailwind.config.ts without circular dependency or
 * build-time Prisma client resolution issues.
 */

// --- ArtifactKind (local definition, mirrors Prisma enum) ---

export type ArtifactKind =
  | "CONCEPT"
  | "PROTOTYPE"
  | "SUBSYSTEM"
  | "FEATURE"
  | "VARIATION"
  | "COMPONENT";

type ArtifactKindToken = {
  color: string;
  bgOpacity: number;
};

export const ARTIFACT_KIND_TOKENS = {
  CONCEPT: { color: "#7F77DD", bgOpacity: 0.15 },
  PROTOTYPE: { color: "#1D9E75", bgOpacity: 0.15 },
  SUBSYSTEM: { color: "#378ADD", bgOpacity: 0.15 },
  FEATURE: { color: "#BA7517", bgOpacity: 0.15 },
  VARIATION: { color: "#888780", bgOpacity: 0.12 },
  COMPONENT: { color: "#D4537E", bgOpacity: 0.12 },
} satisfies Record<ArtifactKind, ArtifactKindToken>;

// --- Relation type tokens ---

type RelationTypeToken = {
  color: string;
  animated: boolean;
};

export const RELATION_TYPE_TOKENS = {
  ITERATES_ON: { color: "#3DDDF2", animated: true },
  FORKS_FROM: { color: "#9B59B6", animated: true },
  USES_COMPONENT: { color: "#FFC876", animated: false },
  CONTRIBUTED_BY: { color: "#A8E6CF", animated: false },
  DISPLAYED_AT: { color: "#FF6DB4", animated: false },
  PARENT_OF: { color: "#555555", animated: false },
} satisfies Record<string, RelationTypeToken>;

// --- Stage tokens ---

type StageToken = {
  color: string;
  order: number;
};

export const STAGE_TOKENS = {
  idea: { color: "#7F77DD", order: 0 },
  research: { color: "#378ADD", order: 1 },
  experiment: { color: "#1D9E75", order: 2 },
  prototype: { color: "#BA7517", order: 3 },
  validate: { color: "#EF9F27", order: 4 },
  tune: { color: "#D85A30", order: 5 },
  deploy: { color: "#D4537E", order: 6 },
} satisfies Record<string, StageToken>;

// --- Diff tokens ---

type DiffToken = {
  color: string;
  label: string;
};

export const DIFF_TOKENS = {
  added: { color: "#FFC876", label: "NEW" },
  removed: { color: "#D85A30", label: "REMOVED" },
  changed: { color: "#3DDDF2", label: "CHANGED" },
  unchanged: { color: "transparent", label: "" },
} satisfies Record<string, DiffToken>;

// --- Spatial / layout tokens ---

export const SPATIAL_TOKENS = {
  cardBorderRadius: "1rem",
  cardShadow: "0 2px 12px rgba(0,0,0,0.08)",
  canvasBg: "var(--canvas-bg)",
  minTouchTarget: 44, // px — WCAG 2.5.5 minimum touch target size
} as const;
