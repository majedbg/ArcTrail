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

// ═══════════════════════════════════════════════════════
// ACCESSIBILITY UTILITIES
// ═══════════════════════════════════════════════════════

/**
 * Converts hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculates relative luminance (WCAG formula)
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates contrast ratio between two colors (WCAG formula)
 */
function getContrastRatio(lum1: number, lum2: number): number {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Adjusts color lightness to meet WCAG AA contrast (4.5:1) against dark background.
 * Returns a lightened version of the input color that's readable on dark backgrounds.
 * 
 * For dark mode (zinc-900 bg ≈ rgb(24, 24, 27)):
 * - Returns colors with high lightness (L > 70) for readability
 * - Maintains hue and saturation from original color
 * 
 * @param hexColor - Input color in hex format (e.g., "#5B4FD9")
 * @returns Accessible color in hex format
 */
export function getAccessibleTextColor(hexColor: string): string {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return "#E5E5E5"; // fallback to light gray
  
  // Dark mode background (zinc-900)
  const bgLuminance = getLuminance(24, 24, 27);
  
  // Convert RGB to HSL for easier lightness manipulation
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  // Increase lightness until we meet WCAG AA (4.5:1)
  // Start at 75% lightness for dark mode
  let targetL = Math.max(l, 0.75);
  
  for (let i = 0; i < 20; i++) {
    const testColor = hslToRgb(h, s, targetL);
    const testLuminance = getLuminance(testColor.r, testColor.g, testColor.b);
    const contrast = getContrastRatio(testLuminance, bgLuminance);
    
    if (contrast >= 4.5) {
      return rgbToHex(testColor.r, testColor.g, testColor.b);
    }
    
    targetL = Math.min(targetL + 0.05, 1);
  }
  
  // Fallback to very light version
  const fallback = hslToRgb(h, s, 0.9);
  return rgbToHex(fallback.r, fallback.g, fallback.b);
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b]
    .map(x => x.toString(16).padStart(2, "0"))
    .join("");
}
