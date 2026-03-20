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

// ═══════════════════════════════════════════════════════
// BRAND PALETTE
// ═══════════════════════════════════════════════════════

export const BRAND_TOKENS = {
  ink:    "#1A1726",  // near-black, blue-violet shifted
  arc:    "#5B4FD9",  // primary brand / hierarchy apex
  signal: "#E8A020",  // deploy amber / hierarchy opposite
  chalk:  "#F5F3EE",  // warm off-white background
} as const;

// ═══════════════════════════════════════════════════════
// ARTIFACT HIERARCHY SCALE
// Arc indigo, monochromatic lightness shift.
// Most saturated = most abstract. Palest = most granular.
// ═══════════════════════════════════════════════════════

type ArtifactKindToken = {
  color: string;
  bgOpacity: number;
};

export const ARTIFACT_KIND_TOKENS = {
  CONCEPT:   { color: "#5B4FD9", bgOpacity: 0.15 },
  PROTOTYPE: { color: "#7065E0", bgOpacity: 0.15 },
  SUBSYSTEM: { color: "#8A80E7", bgOpacity: 0.15 },
  FEATURE:   { color: "#A69EED", bgOpacity: 0.13 },
  VARIATION: { color: "#C4BFF4", bgOpacity: 0.12 },
  COMPONENT: { color: "#DDD9F9", bgOpacity: 0.10 },
} satisfies Record<ArtifactKind, ArtifactKindToken>;

// ═══════════════════════════════════════════════════════
// RELATION TYPE COLORS (edge/line use only)
// ═══════════════════════════════════════════════════════

type RelationTypeToken = {
  color: string;
  animated: boolean;
};

export const RELATION_TYPE_TOKENS = {
  ITERATES_ON:     { color: "#3DDDF2", animated: true },
  FORKS_FROM:      { color: "#9B59B6", animated: true },
  USES_COMPONENT:  { color: "#FFC876", animated: false },
  CONTRIBUTED_BY:  { color: "#A8E6CF", animated: false },
  DISPLAYED_AT:    { color: "#FF6DB4", animated: false },
  PARENT_OF:       { color: "#555555", animated: false },
} satisfies Record<string, RelationTypeToken>;

// ═══════════════════════════════════════════════════════
// STAGE TOKENS — cold→warm temperature gradient
// Cold = nascent, warm = shipped. NOT a traffic-light.
// ═══════════════════════════════════════════════════════

type StageToken = {
  color: string;
  order: number;
};

export const STAGE_TOKENS = {
  idea:       { color: "#4A6ED4", order: 0 },
  research:   { color: "#4D88C4", order: 1 },
  experiment: { color: "#4A9EAA", order: 2 },
  build:      { color: "#4A9E80", order: 3 },
  validate:   { color: "#C8901A", order: 4 },
  tune:       { color: "#D88010", order: 5 },
  deploy:     { color: "#E8A020", order: 6 },
} satisfies Record<string, StageToken>;

// ═══════════════════════════════════════════════════════
// UI ACCENT TOKENS — semantic affordance system
// Two affordances: information (calm) and consequential (intentional).
// Destructive is a sub-variant of consequential.
// ═══════════════════════════════════════════════════════

export const UI_ACCENT_TOKENS = {
  information: {
    solid:   "#4A4760",  // buttons, active nav
    ghost:   "#4A4760",  // border + text, transparent bg
    surface: "#EEEDF3",  // subtle bg tint for info states
    text:    "#4A4760",  // links, labels
  },
  consequential: {
    solid:   "#0FA8BE",  // primary action buttons
    ghost:   "#0FA8BE",  // border + text, transparent bg
    surface: "#E0F5F8",  // subtle bg tint for success states
    text:    "#0A7D8F",  // darker for text-only use
  },
  destructive: {
    solid:   "#D85A30",
    surface: "#FAECE7",
    text:    "#993C1D",
  },
} as const;

// ═══════════════════════════════════════════════════════
// DIFF TOKENS
// ═══════════════════════════════════════════════════════

type DiffToken = {
  color: string;
  label: string;
};

export const DIFF_TOKENS = {
  added:     { color: "#FFC876", label: "NEW" },
  removed:   { color: "#D85A30", label: "REMOVED" },
  changed:   { color: "#3DDDF2", label: "CHANGED" },
  unchanged: { color: "transparent", label: "" },
} satisfies Record<string, DiffToken>;

// ═══════════════════════════════════════════════════════
// SPATIAL / LAYOUT TOKENS
// ═══════════════════════════════════════════════════════

export const SPATIAL_TOKENS = {
  cardBorderRadius: "1rem",
  cardShadow: "0 2px 12px rgba(0,0,0,0.08)",
  canvasBg: "var(--canvas-bg)",
  minTouchTarget: 44, // px — WCAG 2.5.5 minimum touch target size
} as const;
